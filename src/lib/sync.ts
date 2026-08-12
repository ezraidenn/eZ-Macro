// Sincronización de datos usuario ⇄ servidor.
//
// Principios:
// - El servidor es la fuente de verdad, pero el merge es por ID con tombstones:
//   nada se duplica (los POST llevan el id del cliente y son idempotentes) y
//   los borrados no "resucitan" desde el localStorage de otro dispositivo.
// - Las comidas locales que faltan en el servidor se suben ANTES del rebuild y
//   sus respuestas se incluyen en el estado final (no desaparecen de la UI).
// - Si una subida falla, la comida se conserva localmente y se reintenta en el
//   próximo sync.
// - 401 se propaga como estado para que la UI cierre sesión en vez de fallar
//   en silencio.
import { useStore, useAuthStore, markStoreHydrated } from "./store";
import type { DayLog, MealEntry, WeightEntry } from "./types";
import { createMealOnServer, mapServerMeal, type ServerMealDto } from "./meal-sync";
import { calculateWeightMovingAvg } from "./calculations";

export type SyncStatus = "ok" | "unauthorized" | "error";

export interface SyncResult {
  status: SyncStatus;
  hasProfile: boolean;
  /** Tema guardado en el perfil del servidor (para aplicarlo vía next-themes). */
  theme?: "dark" | "light";
}

// Dedup de syncs concurrentes: la landing y el StoreHydrator pueden pedir el
// sync a la vez; ambos esperan la misma promesa.
let inflight: Promise<SyncResult> | null = null;
let inflightUserId: string | null = null;

export function syncUserDataFromServer(): Promise<SyncResult> {
  const userId = useAuthStore.getState().userId;
  if (inflight && inflightUserId === userId) return inflight;

  inflightUserId = userId;
  inflight = doSync().finally(() => {
    inflight = null;
    inflightUserId = null;
  });
  return inflight;
}

async function doSync(): Promise<SyncResult> {
  try {
    // ── 1. Perfil (crítico) ──────────────────────────────────────────────
    const profileRes = await fetch("/api/sync/profile");
    if (profileRes.status === 401) {
      return { status: "unauthorized", hasProfile: false };
    }
    if (!profileRes.ok) {
      return { status: "error", hasProfile: false };
    }

    const profileData = await profileRes.json();

    // Sesión válida ⇒ el store puede persistirse aunque el perfil aún no
    // exista (usuario recién registrado que va camino al onboarding).
    markStoreHydrated();

    let theme: "dark" | "light" | undefined;
    if (profileData.profile) {
      const p = profileData.profile;
      useStore.getState().setProfile({
        name: p.name,
        gender: p.gender,
        age: p.age,
        height: p.height,
        weight: p.weight,
        activityLevel: p.activityLevel,
        trainingLevel: p.trainingLevel,
        goalType: p.goalType,
      });
      useStore.getState().setOnboarded(true);
      // Preferencias también viajan entre dispositivos
      if (p.locale === "es" || p.locale === "en") {
        useStore.getState().setLocale(p.locale);
      }
      if (p.theme === "dark" || p.theme === "light") {
        theme = p.theme;
      }
    }

    // ── 2. Comidas (best effort: si falla, se conserva lo local) ────────
    try {
      await syncMeals();
    } catch (err) {
      console.error("[sync] Meals sync error:", err);
    }

    // ── 3. Pesos (best effort) ───────────────────────────────────────────
    try {
      await syncWeights();
    } catch (err) {
      console.error("[sync] Weights sync error:", err);
    }

    return { status: "ok", hasProfile: !!profileData.profile, theme };
  } catch {
    return { status: "error", hasProfile: false };
  }
}

function emptyDayLog(date: string): DayLog {
  return { date, meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } };
}

function recalcTotals(log: DayLog) {
  log.totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  log.meals.forEach((meal) => {
    meal.foods.forEach((f) => {
      log.totals.calories += f.calories;
      log.totals.protein += f.protein;
      log.totals.carbs += f.carbs;
      log.totals.fat += f.fat;
      log.totals.fiber += f.fiber;
    });
  });
}

async function syncMeals() {
  // includeDeleted=1: los tombstones nos dicen qué NO re-subir (borrados en
  // otro dispositivo que este localStorage todavía tiene).
  const res = await fetch("/api/sync/meals?includeDeleted=1");
  if (!res.ok) return; // conservar lo local tal cual

  const data = await res.json();
  const serverMeals: ServerMealDto[] = data.meals ?? [];
  const serverIds = new Set(serverMeals.map((m) => m.id));

  const localDayLogs = useStore.getState().dayLogs;
  const localMeals = Object.entries(localDayLogs).flatMap(([date, log]) =>
    log.meals.map((meal) => ({ meal, date }))
  );

  // Subir comidas locales que el servidor no conoce (por ID, no por contenido)
  const missing = localMeals.filter(({ meal }) => !serverIds.has(meal.id));
  const uploaded: Array<{ meal: MealEntry; date: string }> = [];
  const keptLocal: Array<{ meal: MealEntry; date: string }> = [];

  for (const { meal, date } of missing) {
    const result = await createMealOnServer(
      {
        id: meal.id,
        type: meal.type,
        name: meal.name,
        time: meal.time,
        aiAnalyzed: meal.aiAnalyzed,
        verified: meal.verified,
        foods: meal.foods,
      },
      date
    );
    if (result.ok) {
      uploaded.push({ meal: result.meal, date });
    } else {
      console.error("[sync] No se pudo subir la comida:", meal.name, result.error);
      // No perder datos: se queda local y se reintenta en el próximo sync
      keptLocal.push({ meal, date });
    }
  }

  // Rebuild: activos del servidor + recién subidas + las que no pudieron subirse
  const rebuilt: Record<string, DayLog> = {};
  const push = (date: string, meal: MealEntry) => {
    if (!rebuilt[date]) rebuilt[date] = emptyDayLog(date);
    rebuilt[date].meals.push(meal);
  };

  serverMeals.filter((m) => !m.deletedAt).forEach((m) => push(m.date, mapServerMeal(m)));
  uploaded.forEach(({ meal, date }) => push(date, meal));
  keptLocal.forEach(({ meal, date }) => push(date, meal));

  Object.values(rebuilt).forEach((log) => {
    log.meals.sort((a, b) => a.time.localeCompare(b.time));
    recalcTotals(log);
  });

  useStore.setState({ dayLogs: rebuilt });
}

async function syncWeights() {
  const res = await fetch("/api/sync/weights");
  if (!res.ok) return;

  const data = await res.json();
  const server: Array<{ date: string; weight: number }> = data.weights ?? [];
  const serverDates = new Set(server.map((w) => w.date));

  // Subir pesos locales que el servidor no tiene (p. ej. POST fallido offline)
  const localWeights = useStore.getState().weights;
  const missing = localWeights.filter((w) => !serverDates.has(w.date));
  for (const w of missing) {
    try {
      const up = await fetch("/api/sync/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: w.date, weight: w.weight }),
      });
      if (!up.ok) console.error("[sync] No se pudo subir el peso de", w.date);
    } catch {
      // se conserva local igualmente
    }
  }

  // Merge (server + locales faltantes) y promedio móvil SIEMPRE recalculado
  // en cliente: derivado, nunca confiado a la BD.
  const merged = [
    ...server.map((w) => ({ date: w.date, weight: w.weight })),
    ...missing.map((w) => ({ date: w.date, weight: w.weight })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const weights: WeightEntry[] = calculateWeightMovingAvg(merged).map((w) => ({
    date: w.date,
    weight: w.weight,
    movingAvg7d: w.movingAvg,
  }));

  useStore.setState({ weights });
}
