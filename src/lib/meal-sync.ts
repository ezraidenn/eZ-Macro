// Helpers cliente para hablar con /api/sync/meals.
// Regla de la app: el servidor es la fuente de verdad, así que TODA creación,
// edición o borrado de comidas pasa por aquí (server-first) y solo después se
// actualiza el store local con la respuesta.
import type { MealEntry, MealFoodEntry, MealType } from "./types";

/** Forma de una comida tal como la devuelve la API (sin photoUrl). */
export interface ServerMealDto {
  id: string;
  date: string;
  type: string;
  name: string;
  time: string;
  aiAnalyzed: boolean;
  verified: boolean;
  deletedAt?: string | null;
  foods: Array<{
    id: string;
    name: string;
    servingSize: number;
    servingUnit: string;
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }>;
}

export type MealApiResult =
  | { ok: true; meal: MealEntry }
  | { ok: false; status: number; error: string };

/** Convierte la respuesta del servidor al MealEntry del store. */
export function mapServerMeal(dbMeal: ServerMealDto): MealEntry {
  return {
    id: dbMeal.id,
    type: dbMeal.type as MealType,
    name: dbMeal.name,
    time: dbMeal.time,
    aiAnalyzed: dbMeal.aiAnalyzed,
    verified: dbMeal.verified,
    foods: dbMeal.foods.map((f): MealFoodEntry => {
      // La BD guarda macros TOTALES por línea + servings (p. ej. 3 huevos).
      // food.* es POR PORCIÓN: derivarlo mantiene la base por-pieza tras el
      // round-trip (con servings = 1 es idéntico a antes).
      const servings = f.servings > 0 ? f.servings : 1;
      return {
        id: f.id,
        food: {
          id: f.id,
          name: f.name,
          servingSize: f.servingSize,
          servingUnit: f.servingUnit,
          calories: f.calories / servings,
          protein: f.protein / servings,
          carbs: f.carbs / servings,
          fat: f.fat / servings,
          fiber: f.fiber / servings,
        },
        servings,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        fiber: f.fiber,
      };
    }),
  };
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

/**
 * Crea una comida en el servidor. `meal.id` (uuid del cliente) hace la llamada
 * idempotente: reintentos o dobles envíos no duplican.
 */
export async function createMealOnServer(
  meal: {
    id?: string;
    type: MealType;
    name: string;
    time: string;
    photoUrl?: string | null;
    aiAnalyzed?: boolean;
    verified?: boolean;
    foods: MealFoodEntry[];
  },
  date: string
): Promise<MealApiResult> {
  try {
    const res = await fetch("/api/sync/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meal, date }),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: await parseError(res) };
    }
    const data = await res.json();
    return { ok: true, meal: mapServerMeal(data.meal) };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : "network" };
  }
}

/** Actualiza los alimentos (y campos opcionales) de una comida existente. */
export async function updateMealOnServer(
  mealId: string,
  meal: {
    type?: MealType;
    name?: string;
    time?: string;
    verified?: boolean;
    foods: MealFoodEntry[];
  }
): Promise<MealApiResult> {
  try {
    const res = await fetch("/api/sync/meals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealId, meal }),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: await parseError(res) };
    }
    const data = await res.json();
    return { ok: true, meal: mapServerMeal(data.meal) };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : "network" };
  }
}

/** Borra (lógicamente) una comida. Devuelve false si el servidor lo rechazó. */
export async function deleteMealOnServer(mealId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/sync/meals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
