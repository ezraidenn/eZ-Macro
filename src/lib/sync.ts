// Sync user data from database to local store after login
import { useStore } from "./store";
import type { DayLog, MealEntry, MealFoodEntry } from "./types";

export async function syncUserDataFromServer() {
  let profileLoaded = false;

  try {
    // 1. Fetch profile (CRITICAL — must succeed)
    try {
      const profileRes = await fetch("/api/sync/profile");
      if (!profileRes.ok) return false;

      const profileData = await profileRes.json();
      if (!profileData.profile) return false;

      useStore.getState().setProfile({
        name: profileData.profile.name,
        gender: profileData.profile.gender,
        age: profileData.profile.age,
        height: profileData.profile.height,
        weight: profileData.profile.weight,
        activityLevel: profileData.profile.activityLevel,
        trainingLevel: profileData.profile.trainingLevel,
        goalType: profileData.profile.goalType,
      });
      useStore.getState().setOnboarded(true);
      profileLoaded = true;
    } catch {
      return false;
    }

    // 2. Fetch meals
    try {
      const mealsRes = await fetch("/api/sync/meals");
      const mealsData = await mealsRes.json();
      const dbMeals: unknown[] = mealsData.meals ?? [];

      if (dbMeals.length === 0) {
        // DB is empty — try to rescue meals that are only in localStorage
        const localDayLogs = useStore.getState().dayLogs;
        const localMeals = Object.entries(localDayLogs).flatMap(
          ([date, log]) => log.meals.map((meal) => ({ meal, date }))
        );

        if (localMeals.length > 0) {
          // Upload all local meals to DB (fire and forget)
          localMeals.forEach(({ meal, date }) => {
            fetch("/api/sync/meals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ meal, date }),
            }).catch(() => {});
          });
          // Keep localStorage state as-is — it has the meals
        }
        // If both DB and localStorage are empty, nothing to do
      } else {
        // DB has meals — rebuild dayLogs from server (source of truth)
        const dayLogs: Record<string, DayLog> = {};

        type DbMeal = {
          id: string; date: string; type: string; name: string; time: string;
          photoUrl: string | null; aiAnalyzed: boolean; verified: boolean;
          foods: Array<{
            id: string; name: string; servingSize: number; servingUnit: string;
            servings: number; calories: number; protein: number; carbs: number;
            fat: number; fiber: number;
          }>;
        };
        (dbMeals as DbMeal[]).forEach((dbMeal) => {
          const date = dbMeal.date;
          if (!dayLogs[date]) {
            dayLogs[date] = {
              date,
              meals: [],
              totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
            };
          }

          const meal: MealEntry = {
            id: dbMeal.id,
            type: dbMeal.type as MealEntry["type"],
            name: dbMeal.name,
            time: dbMeal.time,
            photoUrl: dbMeal.photoUrl ?? undefined,
            aiAnalyzed: dbMeal.aiAnalyzed,
            verified: dbMeal.verified,
            foods: dbMeal.foods.map((f): MealFoodEntry => ({
              id: f.id,
              food: {
                id: f.id,
                name: f.name,
                servingSize: f.servingSize,
                servingUnit: f.servingUnit,
                calories: f.calories,
                protein: f.protein,
                carbs: f.carbs,
                fat: f.fat,
                fiber: f.fiber,
              },
              servings: f.servings,
              calories: f.calories,
              protein: f.protein,
              carbs: f.carbs,
              fat: f.fat,
              fiber: f.fiber,
            })),
          };

          dayLogs[date].meals.push(meal);
          meal.foods.forEach((f) => {
            dayLogs[date].totals.calories += f.calories;
            dayLogs[date].totals.protein += f.protein;
            dayLogs[date].totals.carbs += f.carbs;
            dayLogs[date].totals.fat += f.fat;
            dayLogs[date].totals.fiber += f.fiber;
          });
        });

        useStore.setState({ dayLogs });
      }
    } catch {
      // Non-critical — keep whatever is in localStorage
    }

    // 3. Fetch weights
    try {
      const weightsRes = await fetch("/api/sync/weights");
      const weightsData = await weightsRes.json();

      if (weightsData.weights && weightsData.weights.length > 0) {
        const weights = weightsData.weights.map((w: {
          date: string; weight: number; movingAvg: number | null;
        }) => ({
          date: w.date,
          weight: w.weight,
          movingAvg7d: w.movingAvg ?? undefined,
        }));
        useStore.setState({ weights });
      }
    } catch {
      // Non-critical
    }

    return profileLoaded;
  } catch {
    return false;
  }
}
