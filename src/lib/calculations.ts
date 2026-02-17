import {
  type Gender,
  type GoalType,
  type ActivityLevel,
  type TrainingLevel,
  type MacroTargets,
  type TDEEResult,
  ACTIVITY_MULTIPLIERS,
} from "./types";

/**
 * Mifflin-St Jeor Equation (1990)
 * Most accurate BMR prediction for healthy individuals
 * Accuracy: 82% within 10% of measured BMR (non-obese)
 *
 * Source: Mifflin MD, St Jeor ST et al. Am J Clin Nutr. 1990
 */
export function calculateBMR(
  weight: number, // kg
  height: number, // cm
  age: number,
  gender: Gender
): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

/**
 * TDEE = BMR × Activity Multiplier
 * Activity multipliers based on multiple metabolic studies
 * Note: Can introduce ~15% error. Adaptive TDEE is more accurate.
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

/**
 * Calculate caloric deficit/surplus based on goal
 *
 * Deficit recommendations (Garthe I et al. 2011):
 * - Conservative: 300-500 kcal (0.5-0.7% BW/week)
 * - Moderate: 500-750 kcal (0.7-1.0% BW/week)
 * - Aggressive: 750-1000 kcal (1.0-1.4% BW/week)
 *
 * Surplus recommendations:
 * - Beginner: 300-500 kcal
 * - Intermediate: 200-400 kcal
 * - Advanced: 100-300 kcal
 */
export function calculateDeficit(
  tdee: number,
  goalType: GoalType,
  trainingLevel: TrainingLevel,
  weight: number
): number {
  switch (goalType) {
    case "cut": {
      const rate = trainingLevel === "beginner" ? 0.008 : 0.006;
      const weeklyLoss = weight * rate; // kg/week
      const dailyDeficit = (weeklyLoss * 7700) / 7;
      return Math.min(Math.max(dailyDeficit, 300), 750);
    }
    case "bulk": {
      const surpluses: Record<TrainingLevel, number> = {
        beginner: 400,
        intermediate: 300,
        advanced: 200,
      };
      return -surpluses[trainingLevel];
    }
    case "recomp":
      return 100;
    case "maintain":
    default:
      return 0;
  }
}

/**
 * Protein requirements based on scientific evidence
 *
 * Sources:
 * - Morton RW et al. (2018) Br J Sports Med - Meta-analysis
 * - Helms ER et al. (2014) J Int Soc Sports Nutr
 *
 * 1.6 g/kg maximizes MPS in surplus
 * 2.0-3.0 g/kg recommended in deficit for LBM preservation
 */
export function calculateProtein(
  weight: number,
  goalType: GoalType,
  trainingLevel: TrainingLevel
): number {
  const rates: Record<GoalType, Record<TrainingLevel, number>> = {
    cut: { beginner: 2.0, intermediate: 2.2, advanced: 2.4 },
    bulk: { beginner: 1.8, intermediate: 1.6, advanced: 1.6 },
    maintain: { beginner: 1.6, intermediate: 1.6, advanced: 1.8 },
    recomp: { beginner: 2.0, intermediate: 2.2, advanced: 2.4 },
  };
  return Math.round(weight * rates[goalType][trainingLevel]);
}

/**
 * Fat requirements
 * Minimum: 0.5-0.7 g/kg for hormonal function
 * Source: ACSM Position Stand
 */
export function calculateFat(
  targetCalories: number,
  weight: number,
  goalType: GoalType
): number {
  const fatPercentage = goalType === "cut" ? 0.25 : 0.3;
  const fatFromPercentage = (targetCalories * fatPercentage) / 9;
  const fatMinimum = weight * 0.6;
  return Math.round(Math.max(fatFromPercentage, fatMinimum));
}

/**
 * Carbs = remaining calories after protein and fat
 */
export function calculateCarbs(
  targetCalories: number,
  protein: number,
  fat: number
): number {
  const remaining = targetCalories - protein * 4 - fat * 9;
  return Math.max(Math.round(remaining / 4), 50);
}

/**
 * Fiber: 25-38 g/day (IOM recommendation)
 */
export function calculateFiber(gender: Gender): number {
  return gender === "male" ? 35 : 28;
}

/**
 * Water: 3.7L men, 2.7L women (IOM)
 */
export function calculateWater(gender: Gender, weight: number): number {
  const base = gender === "male" ? 3700 : 2700;
  const adjustment = Math.max(0, (weight - 70) * 15);
  return Math.round(base + adjustment);
}

/**
 * Complete TDEE calculation with all macro targets
 */
export function calculateFullTDEE(
  weight: number,
  height: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
  goalType: GoalType,
  trainingLevel: TrainingLevel
): TDEEResult {
  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  const deficit = calculateDeficit(tdee, goalType, trainingLevel, weight);
  const targetCalories = Math.round(tdee - deficit);

  const protein = calculateProtein(weight, goalType, trainingLevel);
  const fat = calculateFat(targetCalories, weight, goalType);
  const carbs = calculateCarbs(targetCalories, protein, fat);
  const fiber = calculateFiber(gender);
  const water = calculateWater(gender, weight);

  const weeklyChange = (deficit * 7) / 7700;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    activityMultiplier: ACTIVITY_MULTIPLIERS[activityLevel],
    deficit: Math.round(deficit),
    targetCalories,
    macros: { calories: targetCalories, protein, carbs, fat, fiber, water },
    weeklyChange: Math.round(weeklyChange * 100) / 100,
  };
}

/**
 * Adaptive TDEE calculation based on actual intake and weight change
 *
 * Formula: TDEE_Real = Avg_Calories + ((Weight_Change_kg × 7700) / Days)
 *
 * This eliminates errors from predictive equations and activity multipliers
 */
export function calculateAdaptiveTDEE(
  avgCalories: number,
  weightChangeKg: number,
  days: number
): number {
  if (days < 7) return 0;
  return Math.round(avgCalories + (weightChangeKg * 7700) / days);
}

/**
 * Calculate 7-day moving average for weight trend
 * Eliminates daily fluctuations (1-3kg from water, glycogen, sodium)
 */
export function calculateWeightMovingAvg(
  weights: { date: string; weight: number }[],
  window = 7
): { date: string; weight: number; movingAvg: number }[] {
  return weights.map((entry, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = weights.slice(start, i + 1);
    const avg = slice.reduce((sum, w) => sum + w.weight, 0) / slice.length;
    return { ...entry, movingAvg: Math.round(avg * 100) / 100 };
  });
}

/**
 * Suggest calorie adjustment based on progress
 *
 * Rule: If moving average hasn't changed in 2 weeks, adjust ±100-200 kcal
 */
export function suggestAdjustment(
  weeklyWeightChange: number,
  goalType: GoalType,
  weight: number
): { action: string; amount: number; reason: string } | null {
  const targetRate =
    goalType === "cut"
      ? -weight * 0.007
      : goalType === "bulk"
      ? weight * 0.003
      : 0;

  if (goalType === "maintain" || goalType === "recomp") {
    if (Math.abs(weeklyWeightChange) > weight * 0.005) {
      return {
        action: weeklyWeightChange > 0 ? "decrease" : "increase",
        amount: 150,
        reason: `Weight ${weeklyWeightChange > 0 ? "increasing" : "decreasing"} faster than expected for maintenance`,
      };
    }
    return null;
  }

  const diff = weeklyWeightChange - targetRate;
  if (goalType === "cut") {
    if (weeklyWeightChange > -0.1) {
      return {
        action: "decrease",
        amount: 150,
        reason: "Weight loss has stalled. Small deficit increase recommended.",
      };
    }
    if (weeklyWeightChange < -weight * 0.012) {
      return {
        action: "increase",
        amount: 150,
        reason: "Losing too fast. Risk of muscle loss. Increase intake slightly.",
      };
    }
  }

  if (goalType === "bulk") {
    if (weeklyWeightChange < 0.05) {
      return {
        action: "increase",
        amount: 150,
        reason: "Weight gain is too slow. Increase surplus slightly.",
      };
    }
    if (weeklyWeightChange > weight * 0.006) {
      return {
        action: "decrease",
        amount: 150,
        reason: "Gaining too fast. Excess fat accumulation likely. Reduce surplus.",
      };
    }
  }

  return null;
}

/**
 * Body fat estimation using US Navy method
 * Accuracy: ±3-4% compared to DEXA
 */
export function estimateBodyFat(
  gender: Gender,
  waist: number, // cm
  neck: number, // cm
  height: number, // cm
  hip?: number // cm (required for female)
): number {
  if (gender === "male") {
    return (
      495 /
        (1.0324 -
          0.19077 * Math.log10(waist - neck) +
          0.15456 * Math.log10(height)) -
      450
    );
  }
  const h = hip ?? 0;
  return (
    495 /
      (1.29579 -
        0.35004 * Math.log10(waist + h - neck) +
        0.221 * Math.log10(height)) -
    450
  );
}
