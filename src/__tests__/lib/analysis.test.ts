import { normalizeUnitFields } from "@/lib/analysis";

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
