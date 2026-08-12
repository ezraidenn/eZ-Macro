/**
 * Normalización de los campos de unidades que devuelve el análisis IA.
 *
 * La IA reporta por item: countable, unitCount, unitLabel y gramsPerUnit
 * (los macros del item son siempre TOTALES). Este normalizador garantiza,
 * antes de que el cliente los use para steppers de ±1 pieza:
 *   - unitCount en múltiplos de 0.5 y ≥ 0.5
 *   - gramsPerUnit entero y > 0 (derivado de estimatedGrams si falta)
 *   - estimatedGrams coherente (= unitCount × gramsPerUnit)
 *   - degradación limpia a "no contable" cuando los datos no cierran
 */

interface RawAnalyzedFood {
  estimatedGrams?: unknown;
  countable?: unknown;
  unitCount?: unknown;
  unitLabel?: unknown;
  gramsPerUnit?: unknown;
  [key: string]: unknown;
}

/**
 * Energía de un item con factores Atwater + alcohol (7 kcal/g).
 * El alcohol no es un macro estándar pero SÍ aporta calorías: sin este término,
 * el validador "corregía" una cerveza de 150 kcal a ~60 kcal (undercount real).
 */
export function computeItemKcal(m: {
  protein?: unknown;
  carbs?: unknown;
  fat?: unknown;
  alcoholGrams?: unknown;
}): number {
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return Math.round(n(m.protein) * 4 + n(m.carbs) * 4 + n(m.fat) * 9 + n(m.alcoholGrams) * 7);
}

const MAX_UNIT_COUNT = 50; // nadie tiene 50 tortillas en un plato: dato corrupto
const MAX_LABEL_LENGTH = 20;

/** El normalizador garantiza estos campos en la salida (agregándolos si faltan). */
export type WithUnitFields<T> = Omit<
  T,
  "countable" | "unitCount" | "unitLabel" | "gramsPerUnit"
> & {
  countable: boolean;
  unitCount?: number;
  unitLabel?: string;
  gramsPerUnit?: number;
};

export function normalizeUnitFields<T extends RawAnalyzedFood>(item: T): WithUnitFields<T> {
  const grams =
    typeof item.estimatedGrams === "number" && item.estimatedGrams > 0
      ? item.estimatedGrams
      : undefined;

  let countable = item.countable === true;
  let unitCount = typeof item.unitCount === "number" ? item.unitCount : NaN;
  let gramsPerUnit = typeof item.gramsPerUnit === "number" ? item.gramsPerUnit : NaN;
  const unitLabel =
    typeof item.unitLabel === "string" && item.unitLabel.trim()
      ? item.unitLabel.trim().slice(0, MAX_LABEL_LENGTH)
      : "pza";

  if (countable && (!Number.isFinite(unitCount) || unitCount <= 0)) {
    // Sin conteo: intentar derivarlo del peso total / peso por pieza
    if (Number.isFinite(gramsPerUnit) && gramsPerUnit > 0 && grams) {
      unitCount = grams / gramsPerUnit;
    } else {
      countable = false;
    }
  }

  if (countable) {
    // Piezas en múltiplos de 0.5 (media tortilla es real; 0.37 no)
    unitCount = Math.round(unitCount * 2) / 2;
    if (unitCount < 0.5 || unitCount > MAX_UNIT_COUNT) countable = false;
  }

  if (countable) {
    if (!Number.isFinite(gramsPerUnit) || gramsPerUnit <= 0) {
      gramsPerUnit = grams ? grams / unitCount : 0;
    }
    gramsPerUnit = Math.round(gramsPerUnit);
    if (gramsPerUnit <= 0) countable = false;
  }

  if (!countable) {
    return {
      ...item,
      countable: false,
      unitCount: undefined,
      unitLabel: undefined,
      gramsPerUnit: undefined,
    };
  }

  return {
    ...item,
    countable: true,
    unitCount,
    unitLabel,
    gramsPerUnit,
    // Coherencia visual: el total de gramos siempre cierra con el desglose
    estimatedGrams: Math.round(unitCount * gramsPerUnit),
  };
}
