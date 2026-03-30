import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import {
  type UserProfile,
  type MacroTargets,
  type TDEEResult,
  type MealEntry,
  type MealFoodEntry,
  type DayLog,
  type WeightEntry,
  type MealType,
  type MacroTotals,
  type SavedShake,
} from "./types";
import { calculateFullTDEE } from "./calculations";
import { formatDateKey, movingAverage } from "./utils";
import type { Locale } from "./i18n";

// ─── Auth Store (global, shared across users) ───────────────────────
interface AuthState {
  userId: string | null;
  setUserId: (id: string | null) => void;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      setUserId: (id) => set({ userId: id }),
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "ezmacro-auth",
      version: 1,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// ─── App State (per-user data) ──────────────────────────────────────
interface AppState {
  // Locale & Theme
  locale: Locale;
  setLocale: (l: Locale) => void;

  // Onboarding
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;

  // User Profile
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;

  // TDEE & Targets
  tdeeResult: TDEEResult | null;
  targets: MacroTargets | null;
  recalculateTDEE: () => void;

  // Day Logs (keyed by YYYY-MM-DD)
  dayLogs: Record<string, DayLog>;
  getTodayLog: () => DayLog;
  getLogForDate: (date: string) => DayLog;
  addMeal: (date: string, meal: MealEntry) => void;
  removeMeal: (date: string, mealId: string) => void;
  updateMealFoods: (date: string, mealId: string, foods: MealFoodEntry[]) => void;

  // Weight Tracking
  weights: WeightEntry[];
  addWeight: (date: string, weight: number) => void;
  getWeightTrend: () => WeightEntry[];

  // Saved Shakes
  savedShakes: SavedShake[];
  addShake: (shake: SavedShake) => void;
  removeShake: (id: string) => void;

  // Current date view
  currentDate: string;
  setCurrentDate: (d: string) => void;

  // Reset all user data (for logout)
  resetUserData: () => void;
}

function emptyTotals(): MacroTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
}

function calculateMealTotals(meals: MealEntry[]): MacroTotals {
  return meals.reduce(
    (acc, meal) => {
      meal.foods.forEach((f) => {
        acc.calories += f.calories;
        acc.protein += f.protein;
        acc.carbs += f.carbs;
        acc.fat += f.fat;
        acc.fiber += f.fiber;
      });
      return acc;
    },
    emptyTotals()
  );
}

function emptyDayLog(date: string): DayLog {
  return { date, meals: [], totals: emptyTotals() };
}

// Dynamic storage name based on userId
function getUserStorageName(): string {
  const userId = useAuthStore.getState().userId;
  return userId ? `ezmacro-data-${userId}` : "ezmacro-data-anonymous";
}

// Create the per-user store with dynamic name
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      locale: "es" as Locale,
      setLocale: (l) => set({ locale: l }),

      onboarded: false,
      setOnboarded: (v) => set({ onboarded: v }),

      profile: null,
      setProfile: (p) => {
        set({ profile: p });
        get().recalculateTDEE();
      },

      tdeeResult: null,
      targets: null,
      recalculateTDEE: () => {
        const p = get().profile;
        if (!p) return;
        const result = calculateFullTDEE(
          p.weight,
          p.height,
          p.age,
          p.gender,
          p.activityLevel,
          p.goalType,
          p.trainingLevel
        );
        set({ tdeeResult: result, targets: result.macros });
      },

      dayLogs: {},
      getTodayLog: () => {
        const today = formatDateKey(new Date());
        return get().dayLogs[today] ?? emptyDayLog(today);
      },
      getLogForDate: (date) => {
        return get().dayLogs[date] ?? emptyDayLog(date);
      },
      addMeal: (date, meal) => {
        set((state) => {
          const log = state.dayLogs[date] ?? emptyDayLog(date);
          const meals = [...log.meals, meal];
          const totals = calculateMealTotals(meals);
          return {
            dayLogs: { ...state.dayLogs, [date]: { ...log, meals, totals } },
          };
        });
      },
      removeMeal: (date, mealId) => {
        set((state) => {
          const log = state.dayLogs[date];
          if (!log) return state;
          const meals = log.meals.filter((m) => m.id !== mealId);
          const totals = calculateMealTotals(meals);
          return {
            dayLogs: { ...state.dayLogs, [date]: { ...log, meals, totals } },
          };
        });
      },
      updateMealFoods: (date, mealId, foods) => {
        set((state) => {
          const log = state.dayLogs[date];
          if (!log) return state;
          const meals = log.meals.map((m) =>
            m.id === mealId ? { ...m, foods, verified: true } : m
          );
          const totals = calculateMealTotals(meals);
          return {
            dayLogs: { ...state.dayLogs, [date]: { ...log, meals, totals } },
          };
        });
      },

      weights: [],
      addWeight: (date, weight) => {
        set((state) => {
          const existing = state.weights.filter((w) => w.date !== date);
          const updated = [...existing, { date, weight }].sort(
            (a, b) => a.date.localeCompare(b.date)
          );
          // Calculate 7-day moving averages
          const withAvg = updated.map((entry, i) => {
            const start = Math.max(0, i - 6);
            const slice = updated.slice(start, i + 1);
            const avg = slice.reduce((s, w) => s + w.weight, 0) / slice.length;
            return { ...entry, movingAvg7d: Math.round(avg * 100) / 100 };
          });
          return { weights: withAvg };
        });
      },
      getWeightTrend: () => get().weights,

      savedShakes: [],
      addShake: (shake) => {
        set((state) => ({ savedShakes: [...state.savedShakes, shake] }));
      },
      removeShake: (id) => {
        set((state) => ({ savedShakes: state.savedShakes.filter((s) => s.id !== id) }));
      },

      // Always initialize to today's date
      currentDate: formatDateKey(new Date()),
      setCurrentDate: (d) => set({ currentDate: d }),

      resetUserData: () => {
        set({
          onboarded: false,
          profile: null,
          tdeeResult: null,
          targets: null,
          dayLogs: {},
          weights: [],
          savedShakes: [],
          currentDate: formatDateKey(new Date()),
        });
      },
    }),
    {
      name: getUserStorageName(),
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Always reset currentDate to today on rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setCurrentDate(formatDateKey(new Date()));
        }
      },
    }
  )
);

// ─── Helper: Switch user data store ─────────────────────────────────
// When userId changes, we need to reload the store from the correct localStorage key
export function switchUserStore(userId: string | null) {
  const storeName = userId ? `ezmacro-data-${userId}` : "ezmacro-data-anonymous";
  
  // Try to load existing data for this user from localStorage
  try {
    const raw = localStorage.getItem(storeName);
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = parsed?.state;
      if (state) {
        useStore.setState({
          locale: state.locale || "es",
          onboarded: state.onboarded || false,
          profile: state.profile || null,
          tdeeResult: state.tdeeResult || null,
          targets: state.targets || null,
          dayLogs: state.dayLogs || {},
          weights: state.weights || [],
          savedShakes: state.savedShakes || [],
          currentDate: formatDateKey(new Date()), // Always today
        });
        // Recalculate TDEE if profile exists
        if (state.profile) {
          useStore.getState().recalculateTDEE();
        }
        return;
      }
    }
  } catch (e) {
    console.error("Failed to load user store:", e);
  }

  // No existing data for this user - reset to defaults
  useStore.getState().resetUserData();
}

// ─── Helper: Save current store to user-specific key ────────────────
export function saveUserStore() {
  const userId = useAuthStore.getState().userId;
  if (!userId) return;
  
  const storeName = `ezmacro-data-${userId}`;
  const state = useStore.getState();
  const dataToSave = {
    state: {
      locale: state.locale,
      onboarded: state.onboarded,
      profile: state.profile,
      tdeeResult: state.tdeeResult,
      targets: state.targets,
      dayLogs: state.dayLogs,
      weights: state.weights,
      savedShakes: state.savedShakes,
      currentDate: state.currentDate,
    },
    version: 1,
  };
  
  try {
    localStorage.setItem(storeName, JSON.stringify(dataToSave));
  } catch (e) {
    console.error("Failed to save user store:", e);
  }
}

// ─── Auto-save on every state change ────────────────────────────────
useStore.subscribe(() => {
  saveUserStore();
});

