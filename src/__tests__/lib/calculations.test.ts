import {
  calculateBMR,
  calculateTDEE,
  calculateDeficit,
  calculateProtein,
  calculateFat,
  calculateCarbs,
  calculateFiber,
  calculateWater,
  calculateFullTDEE,
  calculateAdaptiveTDEE,
  calculateWeightMovingAvg,
  suggestAdjustment,
} from "@/lib/calculations";

// ─── calculateBMR ────────────────────────────────────────────────────────────

describe("calculateBMR", () => {
  it("calculates male BMR correctly (Mifflin-St Jeor)", () => {
    // (10×80 + 6.25×175 - 5×25) + 5 = 800 + 1093.75 - 125 + 5 = 1773.75
    expect(calculateBMR(80, 175, 25, "male")).toBeCloseTo(1773.75, 1);
  });

  it("calculates female BMR correctly", () => {
    // (10×60 + 6.25×165 - 5×30) - 161 = 600 + 1031.25 - 150 - 161 = 1320.25
    expect(calculateBMR(60, 165, 30, "female")).toBeCloseTo(1320.25, 1);
  });

  it("male BMR is always higher than female for same inputs", () => {
    const male = calculateBMR(75, 175, 28, "male");
    const female = calculateBMR(75, 175, 28, "female");
    // male formula adds 5, female subtracts 161 → difference of 166
    expect(male - female).toBeCloseTo(166, 0);
  });

  it("increases with higher weight", () => {
    const light = calculateBMR(60, 175, 25, "male");
    const heavy = calculateBMR(90, 175, 25, "male");
    expect(heavy).toBeGreaterThan(light);
  });

  it("decreases with higher age", () => {
    const young = calculateBMR(75, 175, 25, "male");
    const older = calculateBMR(75, 175, 45, "male");
    expect(older).toBeLessThan(young);
  });

  it("increases with greater height", () => {
    const short = calculateBMR(75, 160, 25, "male");
    const tall = calculateBMR(75, 190, 25, "male");
    expect(tall).toBeGreaterThan(short);
  });
});

// ─── calculateTDEE ───────────────────────────────────────────────────────────

describe("calculateTDEE", () => {
  const bmr = 1800;

  it("sedentary: multiplies by 1.2", () => {
    expect(calculateTDEE(bmr, "sedentary")).toBeCloseTo(2160, 0);
  });

  it("light: multiplies by 1.375", () => {
    expect(calculateTDEE(bmr, "light")).toBeCloseTo(2475, 0);
  });

  it("moderate: multiplies by 1.55", () => {
    expect(calculateTDEE(bmr, "moderate")).toBeCloseTo(2790, 0);
  });

  it("active: multiplies by 1.725", () => {
    expect(calculateTDEE(bmr, "active")).toBeCloseTo(3105, 0);
  });

  it("very_active: multiplies by 1.9", () => {
    expect(calculateTDEE(bmr, "very_active")).toBeCloseTo(3420, 0);
  });

  it("TDEE scales proportionally with BMR", () => {
    expect(calculateTDEE(2000, "moderate")).toBeCloseTo(3100, 0);
  });
});

// ─── calculateDeficit ────────────────────────────────────────────────────────

describe("calculateDeficit", () => {
  const tdee = 2500;
  const weight = 80;

  describe("cut", () => {
    it("beginner cut: uses 0.8% body weight rate", () => {
      const deficit = calculateDeficit(tdee, "cut", "beginner", weight);
      // 80 × 0.008 × 7700 / 7 = 704, clamped to [300, 750]
      expect(deficit).toBeGreaterThanOrEqual(300);
      expect(deficit).toBeLessThanOrEqual(750);
    });

    it("intermediate cut: uses 0.6% body weight rate", () => {
      const deficit = calculateDeficit(tdee, "cut", "intermediate", weight);
      expect(deficit).toBeGreaterThanOrEqual(300);
      expect(deficit).toBeLessThanOrEqual(750);
    });

    it("advanced cut: same rate as intermediate", () => {
      const d_int = calculateDeficit(tdee, "cut", "intermediate", weight);
      const d_adv = calculateDeficit(tdee, "cut", "advanced", weight);
      expect(d_int).toBe(d_adv);
    });

    it("very light person: deficit clamped to minimum 300", () => {
      const deficit = calculateDeficit(tdee, "cut", "intermediate", 30);
      expect(deficit).toBe(300);
    });

    it("very heavy person: deficit clamped to maximum 750", () => {
      const deficit = calculateDeficit(tdee, "cut", "intermediate", 200);
      expect(deficit).toBe(750);
    });
  });

  describe("bulk", () => {
    it("returns negative value (surplus)", () => {
      expect(calculateDeficit(tdee, "bulk", "beginner", weight)).toBeLessThan(0);
    });

    it("beginner bulk surplus is 400", () => {
      expect(calculateDeficit(tdee, "bulk", "beginner", weight)).toBe(-400);
    });

    it("intermediate bulk surplus is 300", () => {
      expect(calculateDeficit(tdee, "bulk", "intermediate", weight)).toBe(-300);
    });

    it("advanced bulk surplus is 200", () => {
      expect(calculateDeficit(tdee, "bulk", "advanced", weight)).toBe(-200);
    });
  });

  describe("recomp", () => {
    it("returns -100 (slight surplus) for body recomposition", () => {
      expect(calculateDeficit(tdee, "recomp", "intermediate", weight)).toBe(-100);
    });
  });

  describe("maintain", () => {
    it("returns 0 for maintenance", () => {
      expect(calculateDeficit(tdee, "maintain", "intermediate", weight)).toBe(0);
    });
  });
});

// ─── calculateProtein ────────────────────────────────────────────────────────

describe("calculateProtein", () => {
  const weight = 80; // kg

  it("cut beginner: 2.0 g/kg", () => {
    expect(calculateProtein(weight, "cut", "beginner")).toBe(160);
  });

  it("cut intermediate: 2.2 g/kg", () => {
    expect(calculateProtein(weight, "cut", "intermediate")).toBe(176);
  });

  it("cut advanced: 2.4 g/kg", () => {
    expect(calculateProtein(weight, "cut", "advanced")).toBe(192);
  });

  it("bulk beginner: 1.8 g/kg", () => {
    expect(calculateProtein(weight, "bulk", "beginner")).toBe(144);
  });

  it("maintain intermediate: 1.6 g/kg", () => {
    expect(calculateProtein(weight, "maintain", "intermediate")).toBe(128);
  });

  it("recomp advanced: 2.4 g/kg", () => {
    expect(calculateProtein(weight, "recomp", "advanced")).toBe(192);
  });

  it("rounds to nearest integer", () => {
    // 73 × 2.2 = 160.6 → rounds to 161
    expect(calculateProtein(73, "cut", "intermediate")).toBe(161);
  });
});

// ─── calculateFat ────────────────────────────────────────────────────────────

describe("calculateFat", () => {
  it("cut goal: uses 25% of calories", () => {
    const target = 2000;
    const fat = calculateFat(target, 80, "cut");
    const fromPercentage = Math.round((target * 0.25) / 9); // ~56g
    const minimum = Math.round(80 * 0.6); // 48g
    expect(fat).toBe(Math.max(fromPercentage, minimum));
  });

  it("bulk goal: uses 30% of calories", () => {
    const target = 2500;
    const fat = calculateFat(target, 80, "bulk");
    const fromPercentage = Math.round((target * 0.30) / 9);
    const minimum = Math.round(80 * 0.6);
    expect(fat).toBe(Math.max(fromPercentage, minimum));
  });

  it("enforces minimum fat (0.6 g/kg) for very low calorie diets", () => {
    const fat = calculateFat(800, 80, "cut"); // low calories
    expect(fat).toBeGreaterThanOrEqual(Math.round(80 * 0.6)); // min 48g
  });

  it("always returns a positive integer", () => {
    expect(calculateFat(2000, 70, "maintain")).toBeGreaterThan(0);
  });
});

// ─── calculateCarbs ──────────────────────────────────────────────────────────

describe("calculateCarbs", () => {
  it("calculates carbs from remaining calories", () => {
    // 2000 kcal - (150g protein × 4) - (60g fat × 9) = 2000 - 600 - 540 = 860 kcal → 215g carbs
    expect(calculateCarbs(2000, 150, 60)).toBe(215);
  });

  it("enforces minimum 50g carbs", () => {
    // extreme deficit: calories barely cover protein+fat
    expect(calculateCarbs(1000, 200, 50)).toBe(50);
  });

  it("returns integer", () => {
    const carbs = calculateCarbs(2100, 160, 65);
    expect(Number.isInteger(carbs)).toBe(true);
  });
});

// ─── calculateFiber ──────────────────────────────────────────────────────────

describe("calculateFiber", () => {
  it("male: 35g/day (IOM)", () => {
    expect(calculateFiber("male")).toBe(35);
  });

  it("female: 28g/day (IOM)", () => {
    expect(calculateFiber("female")).toBe(28);
  });
});

// ─── calculateWater ──────────────────────────────────────────────────────────

describe("calculateWater", () => {
  it("male base: 3700ml", () => {
    expect(calculateWater("male", 70)).toBe(3700);
  });

  it("female base: 2700ml", () => {
    expect(calculateWater("female", 70)).toBe(2700);
  });

  it("adds 15ml per kg above 70kg", () => {
    // 80kg male: 3700 + (10 × 15) = 3850
    expect(calculateWater("male", 80)).toBe(3850);
  });

  it("no adjustment below 70kg", () => {
    expect(calculateWater("male", 60)).toBe(3700);
  });

  it("returns rounded integer", () => {
    const water = calculateWater("female", 75);
    expect(Number.isInteger(water)).toBe(true);
  });
});

// ─── calculateFullTDEE ───────────────────────────────────────────────────────

describe("calculateFullTDEE", () => {
  const base = { weight: 80, height: 175, age: 25, gender: "male" as const };

  it("returns all required fields", () => {
    const result = calculateFullTDEE(
      base.weight, base.height, base.age, base.gender,
      "moderate", "cut", "intermediate"
    );
    expect(result).toHaveProperty("bmr");
    expect(result).toHaveProperty("tdee");
    expect(result).toHaveProperty("targetCalories");
    expect(result).toHaveProperty("macros");
    expect(result).toHaveProperty("weeklyChange");
    expect(result.macros).toHaveProperty("calories");
    expect(result.macros).toHaveProperty("protein");
    expect(result.macros).toHaveProperty("carbs");
    expect(result.macros).toHaveProperty("fat");
    expect(result.macros).toHaveProperty("fiber");
    expect(result.macros).toHaveProperty("water");
  });

  it("targetCalories equals macros.calories", () => {
    const result = calculateFullTDEE(
      base.weight, base.height, base.age, base.gender,
      "moderate", "cut", "intermediate"
    );
    expect(result.targetCalories).toBe(result.macros.calories);
  });

  it("cut goal: targetCalories < TDEE", () => {
    const result = calculateFullTDEE(
      base.weight, base.height, base.age, base.gender,
      "moderate", "cut", "intermediate"
    );
    expect(result.targetCalories).toBeLessThan(result.tdee);
  });

  it("bulk goal: targetCalories > TDEE", () => {
    const result = calculateFullTDEE(
      base.weight, base.height, base.age, base.gender,
      "moderate", "bulk", "intermediate"
    );
    expect(result.targetCalories).toBeGreaterThan(result.tdee);
  });

  it("maintain goal: targetCalories equals TDEE", () => {
    const result = calculateFullTDEE(
      base.weight, base.height, base.age, base.gender,
      "moderate", "maintain", "intermediate"
    );
    expect(result.targetCalories).toBe(result.tdee);
  });

  it("recomp goal: targetCalories slightly above TDEE (100 kcal surplus)", () => {
    const result = calculateFullTDEE(
      base.weight, base.height, base.age, base.gender,
      "moderate", "recomp", "intermediate"
    );
    expect(result.targetCalories).toBeGreaterThan(result.tdee);
    expect(result.targetCalories - result.tdee).toBe(100);
  });

  it("macro calories are roughly consistent with total (within 5% rounding)", () => {
    const result = calculateFullTDEE(
      base.weight, base.height, base.age, base.gender,
      "moderate", "cut", "intermediate"
    );
    const derivedCalories =
      result.macros.protein * 4 +
      result.macros.carbs * 4 +
      result.macros.fat * 9;
    const target = result.macros.calories;
    // Allow ±5% due to integer rounding in macro splits
    expect(Math.abs(derivedCalories - target) / target).toBeLessThan(0.05);
  });

  it("weeklyChange is negative for cut", () => {
    const result = calculateFullTDEE(
      base.weight, base.height, base.age, base.gender,
      "moderate", "cut", "intermediate"
    );
    expect(result.weeklyChange).toBeLessThan(0);
  });

  it("weeklyChange is positive for bulk", () => {
    const result = calculateFullTDEE(
      base.weight, base.height, base.age, base.gender,
      "moderate", "bulk", "intermediate"
    );
    expect(result.weeklyChange).toBeGreaterThan(0);
  });

  it("weeklyChange is 0 for maintain", () => {
    const result = calculateFullTDEE(
      base.weight, base.height, base.age, base.gender,
      "moderate", "maintain", "intermediate"
    );
    // Use toBe(0) but allow -0 (negative zero from -(0 * 7)/7700)
    expect(Object.is(result.weeklyChange, 0) || Object.is(result.weeklyChange, -0)).toBe(true);
  });

  it("all macro values are positive integers", () => {
    const result = calculateFullTDEE(
      base.weight, base.height, base.age, base.gender,
      "moderate", "cut", "intermediate"
    );
    expect(result.macros.protein).toBeGreaterThan(0);
    expect(result.macros.carbs).toBeGreaterThanOrEqual(50); // min 50g carbs
    expect(result.macros.fat).toBeGreaterThan(0);
    expect(result.macros.fiber).toBeGreaterThan(0);
    expect(result.macros.water).toBeGreaterThan(0);
  });
});

// ─── calculateAdaptiveTDEE ───────────────────────────────────────────────────

describe("calculateAdaptiveTDEE", () => {
  it("returns 0 when less than 7 days of data", () => {
    expect(calculateAdaptiveTDEE(2000, -0.5, 6)).toBe(0);
    expect(calculateAdaptiveTDEE(2000, -0.5, 0)).toBe(0);
  });

  it("calculates with exactly 7 days", () => {
    // No weight change: adaptive TDEE ≈ average intake
    expect(calculateAdaptiveTDEE(2000, 0, 7)).toBe(2000);
  });

  it("weight loss increases estimated TDEE (burned more than eaten)", () => {
    // Lost 0.5kg in 7 days: burned 0.5×7700/7 = 550 extra kcal/day
    expect(calculateAdaptiveTDEE(2000, -0.5, 7)).toBe(2000 + 550);
  });

  it("weight gain decreases estimated TDEE (stored energy)", () => {
    // Gained 0.5kg in 7 days: surplus was 550 kcal/day
    expect(calculateAdaptiveTDEE(2000, 0.5, 7)).toBe(2000 - 550);
  });

  it("returns rounded integer", () => {
    const result = calculateAdaptiveTDEE(1950, -0.3, 14);
    expect(Number.isInteger(result)).toBe(true);
  });

  it("handles 30-day periods", () => {
    // Lost 2kg in 30 days: 2×7700/30 = ~513 kcal/day extra burned
    const result = calculateAdaptiveTDEE(2000, -2, 30);
    expect(result).toBeCloseTo(2000 + (2 * 7700) / 30, 0);
  });
});

// ─── calculateWeightMovingAvg ─────────────────────────────────────────────────

describe("calculateWeightMovingAvg", () => {
  it("returns empty array for empty input", () => {
    expect(calculateWeightMovingAvg([])).toEqual([]);
  });

  it("single entry: moving avg equals weight", () => {
    const result = calculateWeightMovingAvg([{ date: "2024-01-01", weight: 80 }]);
    expect(result[0].movingAvg).toBe(80);
  });

  it("7-day window: first 6 entries average fewer values", () => {
    const weights = Array.from({ length: 10 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      weight: 80 + i * 0.1,
    }));
    const result = calculateWeightMovingAvg(weights, 7);
    // Entry 0: avg of [80]
    expect(result[0].movingAvg).toBeCloseTo(80, 2);
    // Entry 6: avg of entries 0-6
    const expected = weights.slice(0, 7).reduce((s, w) => s + w.weight, 0) / 7;
    expect(result[6].movingAvg).toBeCloseTo(expected, 2);
  });

  it("preserves original weight and date fields", () => {
    const weights = [
      { date: "2024-01-01", weight: 80 },
      { date: "2024-01-02", weight: 80.5 },
    ];
    const result = calculateWeightMovingAvg(weights);
    expect(result[0].date).toBe("2024-01-01");
    expect(result[0].weight).toBe(80);
    expect(result[1].date).toBe("2024-01-02");
    expect(result[1].weight).toBe(80.5);
  });

  it("moving avg smooths out fluctuations", () => {
    const weights = [
      { date: "2024-01-01", weight: 80 },
      { date: "2024-01-02", weight: 82 }, // spike
      { date: "2024-01-03", weight: 80 },
      { date: "2024-01-04", weight: 80 },
      { date: "2024-01-05", weight: 80 },
      { date: "2024-01-06", weight: 80 },
      { date: "2024-01-07", weight: 80 },
    ];
    const result = calculateWeightMovingAvg(weights, 7);
    // Day 7 avg: (80+82+80+80+80+80+80)/7 = 80.29
    expect(result[6].movingAvg).toBeCloseTo(80.29, 1);
    // The spike at day 2 is more pronounced without smoothing
    expect(result[6].movingAvg).toBeLessThan(weights[1].weight);
  });

  it("window is calendar days, not entry count: sparse entries outside 7 days are excluded", () => {
    const weights = [
      { date: "2024-01-01", weight: 90 }, // hace semanas — no debe entrar en la ventana
      { date: "2024-01-02", weight: 90 },
      { date: "2024-02-01", weight: 80 },
      { date: "2024-02-03", weight: 82 },
    ];
    const result = calculateWeightMovingAvg(weights, 7);
    // 2024-02-03: ventana = [2024-01-28 .. 2024-02-03] → solo 80 y 82
    expect(result[3].movingAvg).toBeCloseTo(81, 2);
    // 2024-02-01: ventana solo lo incluye a él
    expect(result[2].movingAvg).toBeCloseTo(80, 2);
  });
});

// ─── suggestAdjustment ───────────────────────────────────────────────────────

describe("suggestAdjustment", () => {
  const weight = 80;

  describe("cut", () => {
    it("suggests decrease when weight loss stalled (<-0.1 kg/week)", () => {
      const result = suggestAdjustment(0, "cut", weight);
      expect(result).not.toBeNull();
      expect(result!.action).toBe("decrease");
    });

    it("suggests increase when losing too fast (>1.2% BW/week)", () => {
      const result = suggestAdjustment(-1.2, "cut", weight); // 1.5% of 80kg/week
      expect(result).not.toBeNull();
      expect(result!.action).toBe("increase");
    });

    it("returns null when loss is in optimal range", () => {
      // ~0.5% of 80kg = -0.4 kg/week (optimal for cut)
      const result = suggestAdjustment(-0.4, "cut", weight);
      expect(result).toBeNull();
    });
  });

  describe("bulk", () => {
    it("suggests increase when not gaining (< 0.05 kg/week)", () => {
      const result = suggestAdjustment(0, "bulk", weight);
      expect(result).not.toBeNull();
      expect(result!.action).toBe("increase");
    });

    it("suggests decrease when gaining too fast (>0.6% BW/week)", () => {
      const result = suggestAdjustment(0.6, "bulk", weight); // 0.75% of 80kg
      expect(result).not.toBeNull();
      expect(result!.action).toBe("decrease");
    });

    it("returns null for moderate gain", () => {
      // 0.3 kg/week is moderate for 80kg person
      const result = suggestAdjustment(0.3, "bulk", weight);
      expect(result).toBeNull();
    });
  });

  describe("maintain", () => {
    it("returns null when weight is stable (< 0.005% BW)", () => {
      const result = suggestAdjustment(0, "maintain", weight);
      expect(result).toBeNull();
    });

    it("suggests decrease when gaining on maintenance", () => {
      const result = suggestAdjustment(0.5, "maintain", weight); // >0.5% of 80kg
      expect(result).not.toBeNull();
      expect(result!.action).toBe("decrease");
    });

    it("suggests increase when losing on maintenance", () => {
      const result = suggestAdjustment(-0.5, "maintain", weight);
      expect(result).not.toBeNull();
      expect(result!.action).toBe("increase");
    });
  });

  describe("recomp", () => {
    it("behaves like maintain for large deviations", () => {
      const result = suggestAdjustment(0.5, "recomp", weight);
      expect(result).not.toBeNull();
    });
  });

  it("adjustment amount is always 150 kcal", () => {
    const result = suggestAdjustment(0, "cut", weight);
    expect(result!.amount).toBe(150);
  });

  it("includes a reason string", () => {
    const result = suggestAdjustment(0, "cut", weight);
    expect(typeof result!.reason).toBe("string");
    expect(result!.reason.length).toBeGreaterThan(0);
  });
});
