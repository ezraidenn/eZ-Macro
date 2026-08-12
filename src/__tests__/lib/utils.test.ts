import {
  formatNumber,
  formatCalories,
  formatGrams,
  percentage,
  remaining,
  formatDateKey,
  addDaysToDateKey,
  diffInDays,
  isSameDay,
  getDaysInRange,
  movingAverage,
  isCountableUnit,
} from "@/lib/utils";

// ─── formatNumber ────────────────────────────────────────────────────────────

describe("formatNumber", () => {
  it("formats with no decimals by default", () => {
    expect(formatNumber(1234)).toBe("1,234");
  });

  it("formats with specified decimals", () => {
    expect(formatNumber(1234.567, 2)).toBe("1,234.57");
  });

  it("zero decimals truncates", () => {
    expect(formatNumber(99.9)).toBe("100"); // toFixed rounds
  });

  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("handles numbers under 1000 without comma", () => {
    expect(formatNumber(999)).toBe("999");
  });

  it("handles millions", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });
});

// ─── formatCalories ──────────────────────────────────────────────────────────

describe("formatCalories", () => {
  it("rounds to nearest integer", () => {
    expect(formatCalories(1234.9)).toBe("1,235");
  });

  it("uses locale formatting with commas", () => {
    const result = formatCalories(2500);
    expect(result).toMatch(/2.?500/); // either "2,500" or "2500" depending on locale
  });

  it("handles zero", () => {
    expect(formatCalories(0)).toBe("0");
  });
});

// ─── formatGrams ─────────────────────────────────────────────────────────────

describe("formatGrams", () => {
  it("shows one decimal for values < 10", () => {
    expect(formatGrams(5)).toBe("5.0");
    expect(formatGrams(9.4)).toBe("9.4");
  });

  it("rounds to integer for values >= 10", () => {
    expect(formatGrams(10.7)).toBe("11");
    expect(formatGrams(150)).toBe("150");
  });

  it("boundary: 9.99 shows one decimal", () => {
    expect(formatGrams(9.99)).toBe("10.0");
  });
});

// ─── percentage ──────────────────────────────────────────────────────────────

describe("percentage", () => {
  it("returns 0 when target is 0 (avoid division by zero)", () => {
    expect(percentage(100, 0)).toBe(0);
  });

  it("calculates basic percentage", () => {
    expect(percentage(50, 100)).toBe(50);
  });

  it("rounds to nearest integer", () => {
    expect(percentage(1, 3)).toBe(33);
  });

  it("caps at 100 even when over target", () => {
    expect(percentage(200, 100)).toBe(100);
  });

  it("returns 0 for zero current", () => {
    expect(percentage(0, 100)).toBe(0);
  });

  it("handles floating point target", () => {
    expect(percentage(75, 150)).toBe(50);
  });
});

// ─── remaining ───────────────────────────────────────────────────────────────

describe("remaining", () => {
  it("returns positive remainder when under target", () => {
    expect(remaining(30, 100)).toBe(70);
  });

  it("returns 0 when at exact target", () => {
    expect(remaining(100, 100)).toBe(0);
  });

  it("returns 0 when over target (never negative)", () => {
    expect(remaining(150, 100)).toBe(0);
  });

  it("handles zero current", () => {
    expect(remaining(0, 200)).toBe(200);
  });

  it("handles floating point values", () => {
    expect(remaining(33.3, 100)).toBeCloseTo(66.7, 1);
  });
});

// ─── formatDateKey ───────────────────────────────────────────────────────────

describe("formatDateKey", () => {
  it("formats date as YYYY-MM-DD", () => {
    const date = new Date("2024-06-15T12:00:00Z");
    const key = formatDateKey(date);
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("zero-pads month and day", () => {
    // Note: using UTC date to avoid timezone issues in tests
    const date = new Date("2024-01-05T12:00:00Z");
    const key = formatDateKey(date);
    expect(key).toContain("-01-");
    expect(key.endsWith("-05")).toBe(true);
  });

  it("returns consistent string format", () => {
    const date = new Date("2024-12-31T12:00:00Z");
    const key = formatDateKey(date);
    expect(key.length).toBe(10); // YYYY-MM-DD = 10 chars
  });

  it("uses LOCAL date, not UTC: a late-evening local time stays on the same local day", () => {
    // 23:30 hora local — con toISOString() (UTC) esto caía en el día siguiente
    // para timezones negativos (p. ej. México), que era el bug original.
    const date = new Date(2024, 5, 15, 23, 30, 0); // 15 jun 2024, 23:30 local
    expect(formatDateKey(date)).toBe("2024-06-15");
  });

  it("uses LOCAL date at start of day", () => {
    const date = new Date(2024, 5, 15, 0, 10, 0); // 15 jun 2024, 00:10 local
    expect(formatDateKey(date)).toBe("2024-06-15");
  });
});

// ─── addDaysToDateKey / diffInDays ───────────────────────────────────────────

describe("addDaysToDateKey", () => {
  it("adds days across month boundaries", () => {
    expect(addDaysToDateKey("2024-01-30", 3)).toBe("2024-02-02");
  });

  it("subtracts days with negative input", () => {
    expect(addDaysToDateKey("2024-03-01", -1)).toBe("2024-02-29"); // año bisiesto
  });

  it("zero days returns the same key", () => {
    expect(addDaysToDateKey("2024-06-15", 0)).toBe("2024-06-15");
  });
});

describe("diffInDays", () => {
  it("returns positive difference when b is after a", () => {
    expect(diffInDays("2024-06-01", "2024-06-15")).toBe(14);
  });

  it("returns 0 for the same day", () => {
    expect(diffInDays("2024-06-15", "2024-06-15")).toBe(0);
  });

  it("returns negative when b is before a", () => {
    expect(diffInDays("2024-06-15", "2024-06-10")).toBe(-5);
  });

  it("crosses month boundaries correctly", () => {
    expect(diffInDays("2024-01-25", "2024-02-05")).toBe(11);
  });
});

// ─── isSameDay ───────────────────────────────────────────────────────────────

describe("isSameDay", () => {
  it("returns true for same date at different times", () => {
    const a = new Date("2024-06-15T08:00:00Z");
    const b = new Date("2024-06-15T23:59:59Z");
    expect(isSameDay(a, b)).toBe(true);
  });

  it("returns false for different dates", () => {
    const a = new Date("2024-06-15T12:00:00Z");
    const b = new Date("2024-06-16T12:00:00Z");
    expect(isSameDay(a, b)).toBe(false);
  });

  it("returns true for identical dates", () => {
    const d = new Date("2024-01-01T00:00:00Z");
    expect(isSameDay(d, d)).toBe(true);
  });
});

// ─── getDaysInRange ───────────────────────────────────────────────────────────

describe("getDaysInRange", () => {
  it("returns single day when start equals end", () => {
    const d = new Date("2024-01-01T12:00:00Z");
    const result = getDaysInRange(d, d);
    expect(result.length).toBe(1);
  });

  it("returns correct number of days for a week", () => {
    const start = new Date("2024-01-01T12:00:00Z");
    const end = new Date("2024-01-07T12:00:00Z");
    const result = getDaysInRange(start, end);
    expect(result.length).toBe(7);
  });

  it("returns days in order", () => {
    const start = new Date("2024-01-01T12:00:00Z");
    const end = new Date("2024-01-03T12:00:00Z");
    const result = getDaysInRange(start, end);
    // YYYY-MM-DD strings sort lexicographically = chronologically
    expect(formatDateKey(result[0]) < formatDateKey(result[1])).toBe(true);
    expect(formatDateKey(result[1]) < formatDateKey(result[2])).toBe(true);
  });

  it("returns empty array when end is before start", () => {
    const start = new Date("2024-01-05T12:00:00Z");
    const end = new Date("2024-01-01T12:00:00Z");
    const result = getDaysInRange(start, end);
    expect(result.length).toBe(0);
  });
});

// ─── isCountableUnit ─────────────────────────────────────────────────────────

describe("isCountableUnit", () => {
  it("mass/volume units are NOT countable", () => {
    for (const unit of ["g", "G", "gr", "gramos", "kg", "ml", "l", "oz", "lb", " g "]) {
      expect(isCountableUnit(unit)).toBe(false);
    }
  });

  it("piece-like units ARE countable", () => {
    for (const unit of ["pza", "tortilla", "rebanada", "taco", "huevo", "lata", "cda"]) {
      expect(isCountableUnit(unit)).toBe(true);
    }
  });

  it("empty/undefined is not countable", () => {
    expect(isCountableUnit("")).toBe(false);
    expect(isCountableUnit(undefined)).toBe(false);
    expect(isCountableUnit(null)).toBe(false);
  });
});

// ─── movingAverage ────────────────────────────────────────────────────────────

describe("movingAverage", () => {
  it("returns 0 for empty array", () => {
    expect(movingAverage([], 7)).toBe(0);
  });

  it("returns value itself for single element", () => {
    expect(movingAverage([5], 7)).toBe(5);
  });

  it("averages last N values", () => {
    const values = [10, 20, 30, 40, 50];
    // window 3: avg of [30, 40, 50] = 40
    expect(movingAverage(values, 3)).toBeCloseTo(40, 1);
  });

  it("uses all values when window > length", () => {
    const values = [10, 20, 30];
    // window 7 but only 3 values: avg = 20
    expect(movingAverage(values, 7)).toBeCloseTo(20, 1);
  });

  it("full array average with window equal to length", () => {
    const values = [80, 81, 79, 80.5, 80.2];
    const expected = values.reduce((s, v) => s + v, 0) / values.length;
    expect(movingAverage(values, values.length)).toBeCloseTo(expected, 2);
  });
});
