import { create } from "zustand";
import { persist } from "zustand/middleware";
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
} from "./types";
import { calculateFullTDEE } from "./calculations";
import { formatDateKey, movingAverage } from "./utils";
import type { Locale } from "./i18n";

interface AppState {
  // Auth
  userId: string | null;
  setUserId: (id: string | null) => void;

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

  // Current date view
  currentDate: string;
  setCurrentDate: (d: string) => void;
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

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      userId: null,
      setUserId: (id) => set({ userId: id }),

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

      currentDate: formatDateKey(new Date()),
      setCurrentDate: (d) => set({ currentDate: d }),
    }),
    {
      name: "ezmacro-storage",
      version: 1,
    }
  )
);
