// Sync user data from database to local store after login
import { useStore } from "./store";
import { formatDateKey } from "./utils";

export async function syncUserDataFromServer() {
  try {
    // 1. Fetch profile
    const profileRes = await fetch("/api/sync/profile");
    const profileData = await profileRes.json();
    
    if (profileData.profile) {
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
    }

    // 2. Fetch all meals
    const mealsRes = await fetch("/api/sync/meals");
    const mealsData = await mealsRes.json();
    
    if (mealsData.meals && mealsData.meals.length > 0) {
      // Group meals by date and rebuild dayLogs
      const dayLogs: Record<string, any> = {};
      
      mealsData.meals.forEach((dbMeal: any) => {
        const date = dbMeal.date;
        if (!dayLogs[date]) {
          dayLogs[date] = {
            date,
            meals: [],
            totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
          };
        }
        
        // Convert database meal to store format
        const meal = {
          id: dbMeal.id,
          type: dbMeal.type,
          name: dbMeal.name,
          time: dbMeal.time,
          photoUrl: dbMeal.photoUrl,
          aiAnalyzed: dbMeal.aiAnalyzed,
          verified: dbMeal.verified,
          foods: dbMeal.foods.map((f: any) => ({
            id: f.id,
            name: f.name,
            servingSize: f.servingSize,
            servingUnit: f.servingUnit,
            servings: f.servings,
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fat: f.fat,
            fiber: f.fiber,
          })),
        };
        
        dayLogs[date].meals.push(meal);
        
        // Calculate totals
        meal.foods.forEach((f: any) => {
          dayLogs[date].totals.calories += f.calories;
          dayLogs[date].totals.protein += f.protein;
          dayLogs[date].totals.carbs += f.carbs;
          dayLogs[date].totals.fat += f.fat;
          dayLogs[date].totals.fiber += f.fiber;
        });
      });
      
      // Update store with all dayLogs at once
      useStore.setState({ dayLogs });
    }

    // 3. Fetch weights
    const weightsRes = await fetch("/api/sync/weights");
    const weightsData = await weightsRes.json();
    
    if (weightsData.weights && weightsData.weights.length > 0) {
      const weights = weightsData.weights.map((w: any) => ({
        date: w.date,
        weight: w.weight,
        movingAvg7d: w.movingAvg ?? undefined,
      }));
      
      useStore.setState({ weights });
    }

    console.log("[eZMacro] User data synced from server");
    return true;
  } catch (error) {
    console.error("[eZMacro] Failed to sync user data:", error);
    return false;
  }
}
