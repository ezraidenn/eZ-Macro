// Sync user data from database to local store after login
import { useStore, markStoreHydrated } from "./store";
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

      // Get local meals before any modifications
      const localDayLogs = useStore.getState().dayLogs;
      const localMeals = Object.entries(localDayLogs).flatMap(
        ([date, log]) => log.meals.map((meal) => ({ meal, date }))
      );

      // Create a map of all meals (server + local) to avoid duplicates
      const mergedDayLogs: Record<string, DayLog> = {};
      const serverMealIds = new Set<string>();

      type DbMeal = {
        id: string; date: string; type: string; name: string; time: string;
        photoUrl: string | null; aiAnalyzed: boolean; verified: boolean;
        foods: Array<{
          id: string; name: string; servingSize: number; servingUnit: string;
          servings: number; calories: number; protein: number; carbs: number;
          fat: number; fiber: number;
        }>;
      };

      // First, add all server meals
      (dbMeals as DbMeal[]).forEach((dbMeal) => {
        const date = dbMeal.date;
        if (!mergedDayLogs[date]) {
          mergedDayLogs[date] = {
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

        mergedDayLogs[date].meals.push(meal);
        serverMealIds.add(dbMeal.id);
      });

      // Find local meals not in server by ID
      // Also check by content (date, name, time) to avoid duplicates from ID mismatches
      const serverMealSignatures = new Set(
        (dbMeals as DbMeal[]).map(m => `${m.date}|${m.name}|${m.time}`)
      );

      console.log("[sync] Server signatures:", Array.from(serverMealSignatures));
      console.log("[sync] Local meals to check:", localMeals.map(({meal, date}) => ({id: meal.id.slice(0,8), name: meal.name, time: meal.time, date, sig: `${date}|${meal.name}|${meal.time}`})));

      const missingLocalMeals = localMeals.filter(({ meal, date }) => {
        // Skip if ID already exists in server
        if (serverMealIds.has(meal.id)) {
          console.log(`[sync] Skipping by ID match: ${meal.name}`);
          return false;
        }
        // Skip if content signature matches a server meal (avoid duplicates)
        const signature = `${date}|${meal.name}|${meal.time}`;
        if (serverMealSignatures.has(signature)) {
          console.log(`[sync] Skipping duplicate by content: ${meal.name} at ${meal.time} (sig: ${signature})`);
          return false;
        }
        console.log(`[sync] Will upload: ${meal.name} at ${meal.time} (sig: ${signature} not in server)`);
        return true;
      });

      // Upload truly missing local meals to server (with delay between requests)
      if (missingLocalMeals.length > 0) {
        console.log(`[sync] Uploading ${missingLocalMeals.length} truly missing meals to server`);
        for (const { meal, date } of missingLocalMeals) {
          try {
            const res = await fetch("/api/sync/meals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ meal, date }),
            });
            if (!res.ok) {
              console.error("[sync] Failed to upload meal:", meal.id, await res.text());
            } else {
              const saved = await res.json();
              // Update local meal ID to match server ID
              meal.id = saved.meal.id;
              console.log(`[sync] Uploaded meal: ${meal.name} -> server ID: ${saved.meal.id}`);
            }
          } catch (err) {
            console.error("[sync] Error uploading meal:", meal.id, err);
          }
        }
      }

      // Add truly missing local meals to merged dayLogs
      missingLocalMeals.forEach(({ meal, date }) => {
        if (!mergedDayLogs[date]) {
          mergedDayLogs[date] = {
            date,
            meals: [],
            totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
          };
        }
        mergedDayLogs[date].meals.push(meal);
      });

      // Recalculate totals for all dayLogs
      Object.values(mergedDayLogs).forEach((dayLog) => {
        dayLog.totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
        dayLog.meals.forEach((meal) => {
          meal.foods.forEach((f) => {
            dayLog.totals.calories += f.calories;
            dayLog.totals.protein += f.protein;
            dayLog.totals.carbs += f.carbs;
            dayLog.totals.fat += f.fat;
            dayLog.totals.fiber += f.fiber;
          });
        });
      });

      useStore.setState({ dayLogs: mergedDayLogs });
      console.log("[sync] Merged dayLogs:", Object.keys(mergedDayLogs).length, "dates,", Object.values(mergedDayLogs).reduce((acc, d) => acc + d.meals.length, 0), "meals");
    } catch (err) {
      console.error("[sync] Meals sync error:", err);
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

    // Mark store as hydrated so future state changes get persisted
    if (profileLoaded) {
      markStoreHydrated();
    }

    return profileLoaded;
  } catch {
    return false;
  }
}
