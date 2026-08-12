import { normalizeUnitFields, computeItemKcal } from "@/lib/analysis";

const base = {
  name: "Huevo revuelto",
  estimatedGrams: 150,
  calories: 233,
  protein: 19,
  carbs: 2,
  fat: 16,
  fiber: 0,
};

describe("normalizeUnitFields", () => {
  it("keeps a well-formed countable item and enforces grams coherence", () => {
    const result = normalizeUnitFields({
      ...base,
      countable: true,
      unitCount: 3,
      unitLabel: "huevo",
      gramsPerUnit: 50,
    });
    expect(result.countable).toBe(true);
    expect(result.unitCount).toBe(3);
    expect(result.unitLabel).toBe("huevo");
    expect(result.gramsPerUnit).toBe(50);
    expect(result.estimatedGrams).toBe(150); // 3 × 50
  });

  it("recomputes estimatedGrams from unitCount × gramsPerUnit when inconsistent", () => {
    const result = normalizeUnitFields({
      ...base,
      estimatedGrams: 999, // la IA reportó un total incoherente
      countable: true,
      unitCount: 5,
      unitLabel: "tortilla",
      gramsPerUnit: 28,
    });
    expect(result.estimatedGrams).toBe(140);
  });

  it("derives gramsPerUnit from estimatedGrams when missing", () => {
    const result = normalizeUnitFields({
      ...base,
      countable: true,
      unitCount: 3,
      unitLabel: "huevo",
    });
    expect(result.gramsPerUnit).toBe(50); // 150 / 3
    expect(result.countable).toBe(true);
  });

  it("derives unitCount from estimatedGrams / gramsPerUnit when missing", () => {
    const result = normalizeUnitFields({
      ...base,
      countable: true,
      unitLabel: "tortilla",
      gramsPerUnit: 50,
    });
    expect(result.unitCount).toBe(3);
  });

  it("rounds unitCount to nearest 0.5", () => {
    const result = normalizeUnitFields({
      ...base,
      countable: true,
      unitCount: 2.4,
      gramsPerUnit: 50,
    });
    expect(result.unitCount).toBe(2.5);
  });

  it("degrades to non-countable when there is no usable unit data", () => {
    const result = normalizeUnitFields({ ...base, countable: true });
    // sin unitCount ni gramsPerUnit no se puede derivar nada → por gramos
    expect(result.countable).toBe(false);
    expect(result.unitCount).toBeUndefined();
    expect(result.gramsPerUnit).toBeUndefined();
    expect(result.estimatedGrams).toBe(150); // el total original se conserva
  });

  it("degrades to non-countable on absurd counts", () => {
    const result = normalizeUnitFields({
      ...base,
      countable: true,
      unitCount: 500,
      gramsPerUnit: 30,
    });
    expect(result.countable).toBe(false);
  });

  it("defaults unitLabel to 'pza' when missing", () => {
    const result = normalizeUnitFields({
      ...base,
      countable: true,
      unitCount: 2,
      gramsPerUnit: 30,
    });
    expect(result.unitLabel).toBe("pza");
  });

  it("leaves non-countable items untouched (strips unit fields)", () => {
    const result = normalizeUnitFields({
      ...base,
      name: "Frijoles refritos",
      countable: false,
      unitCount: 3, // ruido de la IA
    });
    expect(result.countable).toBe(false);
    expect(result.unitCount).toBeUndefined();
    expect(result.estimatedGrams).toBe(150);
  });

  it("does not mutate macros (siguen siendo totales)", () => {
    const result = normalizeUnitFields({
      ...base,
      countable: true,
      unitCount: 3,
      gramsPerUnit: 50,
    });
    expect(result.calories).toBe(233);
    expect(result.protein).toBe(19);
  });

  it("truncates absurdly long unit labels", () => {
    const result = normalizeUnitFields({
      ...base,
      countable: true,
      unitCount: 2,
      gramsPerUnit: 30,
      unitLabel: "x".repeat(100),
    });
    expect((result.unitLabel as string).length).toBeLessThanOrEqual(20);
  });
});

describe("computeItemKcal", () => {
  it("applies Atwater factors (P4 + C4 + F9)", () => {
    expect(computeItemKcal({ protein: 30, carbs: 40, fat: 10 })).toBe(370);
  });

  it("includes alcohol at 7 kcal/g (una cerveza no pierde sus calorías)", () => {
    // Cerveza regular: C13, P2, alcohol 14g → 60 + 98 = 158 kcal
    expect(computeItemKcal({ protein: 2, carbs: 13, fat: 0, alcoholGrams: 14 })).toBe(158);
  });

  it("treats missing/null/invalid fields as 0", () => {
    expect(computeItemKcal({})).toBe(0);
    expect(computeItemKcal({ protein: 10, alcoholGrams: null })).toBe(40);
    expect(computeItemKcal({ protein: 10, carbs: NaN })).toBe(40);
  });

  it("rounds to the nearest integer", () => {
    expect(computeItemKcal({ protein: 0.6, carbs: 0, fat: 0 })).toBe(2);
  });
});
