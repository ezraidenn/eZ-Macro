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
    confidence: "low" | "medium" | "high";
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
  notes: string[];
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
