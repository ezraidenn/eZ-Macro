export type Gender = "male" | "female";
export type GoalType = "cut" | "bulk" | "maintain" | "recomp";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type TrainingLevel = "beginner" | "intermediate" | "advanced";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface UserProfile {
  name: string;
  gender: Gender;
  age: number;
  height: number; // cm
  weight: number; // kg
  activityLevel: ActivityLevel;
  trainingLevel: TrainingLevel;
  goalType: GoalType;
  targetWeight?: number;
}

export interface MacroTargets {
  calories: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber: number; // g
  water: number; // ml
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface TDEEResult {
  bmr: number;
  tdee: number;
  activityMultiplier: number;
  deficit: number;
  targetCalories: number;
  macros: MacroTargets;
  weeklyChange: number; // kg/week expected
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  servingSize: number; // g
  servingUnit: string;
  calories: number; // per serving
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  usdaId?: string;
}

export interface MealEntry {
  id: string;
  type: MealType;
  name: string;
  time: string; // HH:mm
  foods: MealFoodEntry[];
  photoUrl?: string;
  aiAnalyzed: boolean;
  verified: boolean;
}

export interface MealFoodEntry {
  id: string;
  food: FoodItem;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** Confianza del análisis IA (solo UI de revisión; no se persiste). */
  aiConfidence?: "low" | "medium" | "high";
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  meals: MealEntry[];
  weight?: number;
  notes?: string;
  totals: MacroTotals;
}

export interface WeightEntry {
  date: string;
  weight: number;
  movingAvg7d?: number;
}

export interface AIFoodAnalysis {
  foods: {
    name: string;
    quantity: string;
    estimatedGrams: number;
    gramsRange?: { min: number; max: number };
    visualCues?: string;
    confidence: "low" | "medium" | "high";
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    caloriesRange?: { min: number; max: number };
    // Desglose por unidades: para alimentos contables (huevos, tortillas,
    // tacos, rebanadas…) la IA reporta el conteo y el peso por pieza.
    // Los macros del item siguen siendo TOTALES (todas las piezas).
    countable?: boolean;
    unitCount?: number; // piezas contadas (múltiplos de 0.5)
    unitLabel?: string; // "pza", "tortilla", "rebanada", "taco", "cda"…
    gramsPerUnit?: number; // peso estimado por pieza
    /** Gramos de alcohol puro (7 kcal/g, incluidos en calories). */
    alcoholGrams?: number | null;
  }[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber?: number;
  referenceObjectFound?: string;
  overallConfidence?: "low" | "medium" | "high";
  notes: string[];
  energyCheck?: string;
}

/** Result from OpenFoodFacts search/barcode lookup, normalized to FoodItem shape */
export interface FoodSearchResult extends FoodItem {
  barcode?: string;
  imageUrl?: string;
}

/** A saved meal template (no IDs on foods — they get new IDs when instantiated) */
export interface SavedMealTemplate {
  id: string;
  name: string;
  type: MealType;
  foods: {
    name: string;
    brand?: string;
    servingSize: number;
    servingUnit: string;
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  createdAt: string;
}

export interface SavedShake {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  photoUrl?: string;
  createdAt: string;
}

export interface WeeklyMetrics {
  weekStart: string;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgWeight: number;
  weightChange: number;
  adherenceRate: number;
  daysLogged: number;
}

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary",
  light: "Lightly Active",
  moderate: "Moderately Active",
  active: "Very Active",
  very_active: "Extremely Active",
};

export const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  sedentary: "Little or no exercise, desk job",
  light: "Light exercise 1-3 days/week",
  moderate: "Moderate exercise 3-5 days/week",
  active: "Hard exercise 6-7 days/week",
  very_active: "Very hard exercise + physical job",
};

export const GOAL_LABELS: Record<GoalType, string> = {
  cut: "Fat Loss",
  bulk: "Muscle Gain",
  maintain: "Maintenance",
  recomp: "Body Recomposition",
};

export const GOAL_DESCRIPTIONS: Record<GoalType, string> = {
  cut: "Lose body fat while preserving muscle mass",
  bulk: "Build muscle with controlled weight gain",
  maintain: "Maintain current weight and body composition",
  recomp: "Lose fat and gain muscle simultaneously",
};

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};
