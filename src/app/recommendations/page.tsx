"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { t } from "@/lib/i18n";
import { formatDateKey } from "@/lib/utils";
import { v4 as uuid } from "uuid";
import {
  Sparkles,
  Loader2,
  Plus,
  ChevronRight,
  Lightbulb,
  RefreshCw,
  Sun,
  CloudSun,
  Moon,
  Cookie,
} from "lucide-react";
import toast from "react-hot-toast";
import type { MealType, MealEntry, MealFoodEntry } from "@/lib/types";

const MEAL_ICONS: Record<string, React.ElementType> = {
  breakfast: Sun,
  lunch: CloudSun,
  dinner: Moon,
  snack: Cookie,
};

const MEAL_COLORS: Record<string, string> = {
  breakfast: "text-amber-400 bg-amber-400/10",
  lunch: "text-emerald-400 bg-emerald-400/10",
  dinner: "text-indigo-400 bg-indigo-400/10",
  snack: "text-violet-400 bg-violet-400/10",
};

interface Recommendation {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  emoji: string;
}

interface RecommendationsResponse {
  mealType: string;
  recommendations: Recommendation[];
  tip: string;
}

export default function RecommendationsPage() {
  const router = useRouter();
  const locale = useStore((s) => s.locale);
  const targets = useStore((s) => s.targets);
  const currentDate = useStore((s) => s.currentDate);
  const getLogForDate = useStore((s) => s.getLogForDate);
  const addMeal = useStore((s) => s.addMeal);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const log = getLogForDate(currentDate);
  const totals = log.totals;

  const remaining = targets
    ? {
        calories: Math.max(0, targets.calories - totals.calories),
        protein: Math.max(0, targets.protein - totals.protein),
        carbs: Math.max(0, targets.carbs - totals.carbs),
        fat: Math.max(0, targets.fat - totals.fat),
      }
    : null;

  async function fetchRecommendations() {
    if (!remaining) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remaining,
          mealsEaten: log.meals,
          locale,
        }),
      });

      if (!res.ok) throw new Error("Failed to get recommendations");

      const result: RecommendationsResponse = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Error al obtener recomendaciones");
    } finally {
      setLoading(false);
    }
  }

  function addRecommendationAsMeal(rec: Recommendation) {
    const mealType = (data?.mealType || "snack") as MealType;
    const now = new Date();

    const foodEntry: MealFoodEntry = {
      id: uuid(),
      food: {
        id: uuid(),
        name: rec.name,
        servingSize: 100,
        servingUnit: "g",
        calories: rec.calories,
        protein: rec.protein,
        carbs: rec.carbs,
        fat: rec.fat,
        fiber: rec.fiber || 0,
      },
      servings: 1,
      calories: rec.calories,
      protein: rec.protein,
      carbs: rec.carbs,
      fat: rec.fat,
      fiber: rec.fiber || 0,
    };

    const meal: MealEntry = {
      id: uuid(),
      type: mealType,
      name: rec.name,
      time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
      foods: [foodEntry],
      aiAnalyzed: false,
      verified: true,
    };

    addMeal(currentDate, meal);
    toast.success(locale === "es" ? "Comida agregada" : "Meal added");
  }

  useEffect(() => {
    if (remaining && !data && !loading) {
      fetchRecommendations();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const MealIcon = MEAL_ICONS[data?.mealType || "snack"] || Cookie;
  const mealColor = MEAL_COLORS[data?.mealType || "snack"] || "text-violet-400 bg-violet-400/10";

  return (
    <AppShell>
      <div className="px-4 pt-6 safe-top space-y-5 pb-24">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">
            {locale === "es" ? "Recomendaciones" : "Recommendations"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {locale === "es"
              ? "Sugerencias basadas en tus macros restantes"
              : "Suggestions based on your remaining macros"}
          </p>
        </div>

        {/* Remaining Macros Summary */}
        {remaining && (
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              {locale === "es" ? "Te falta por consumir:" : "Remaining to consume:"}
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-base font-bold tabular-nums text-emerald-400">
                  {Math.round(remaining.calories)}
                </p>
                <p className="text-[10px] text-muted-foreground">kcal</p>
              </div>
              <div>
                <p className="text-base font-bold tabular-nums text-indigo-400">
                  {Math.round(remaining.protein)}g
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {locale === "es" ? "proteína" : "protein"}
                </p>
              </div>
              <div>
                <p className="text-base font-bold tabular-nums text-amber-400">
                  {Math.round(remaining.carbs)}g
                </p>
                <p className="text-[10px] text-muted-foreground">carbs</p>
              </div>
              <div>
                <p className="text-base font-bold tabular-nums text-red-400">
                  {Math.round(remaining.fat)}g
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {locale === "es" ? "grasa" : "fat"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-sm text-muted-foreground">
              {locale === "es" ? "Generando recomendaciones..." : "Generating recommendations..."}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={fetchRecommendations}
              className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-medium"
            >
              {locale === "es" ? "Reintentar" : "Retry"}
            </button>
          </div>
        )}

        {/* Recommendations */}
        {data && !loading && (
          <>
            {/* Suggested Meal Type */}
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${mealColor}`}>
                <MealIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {locale === "es" ? "Te sugerimos para tu" : "We suggest for your"}{" "}
                  {t(locale, `meal.${data.mealType}` as any)}:
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {locale === "es"
                    ? `${log.meals.length} comidas registradas hoy`
                    : `${log.meals.length} meals logged today`}
                </p>
              </div>
              <button
                onClick={fetchRecommendations}
                className="p-2 rounded-lg bg-secondary text-muted-foreground active:bg-secondary/80"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Recommendation Cards */}
            <div className="space-y-3">
              {data.recommendations.map((rec, i) => (
                <div key={i} className="glass-card rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{rec.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{rec.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
                    </div>
                    <button
                      onClick={() => addRecommendationAsMeal(rec)}
                      className="shrink-0 flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400 active:bg-emerald-500/20"
                    >
                      <Plus className="h-3 w-3" />
                      {locale === "es" ? "Agregar" : "Add"}
                    </button>
                  </div>

                  {/* Macro Bars */}
                  <div className="grid grid-cols-4 gap-2">
                    <MacroBar
                      label="kcal"
                      value={rec.calories}
                      max={remaining?.calories || 1}
                      color="bg-emerald-400"
                    />
                    <MacroBar
                      label={locale === "es" ? "prot" : "prot"}
                      value={rec.protein}
                      max={remaining?.protein || 1}
                      color="bg-indigo-400"
                      unit="g"
                    />
                    <MacroBar
                      label="carbs"
                      value={rec.carbs}
                      max={remaining?.carbs || 1}
                      color="bg-amber-400"
                      unit="g"
                    />
                    <MacroBar
                      label={locale === "es" ? "grasa" : "fat"}
                      value={rec.fat}
                      max={remaining?.fat || 1}
                      color="bg-red-400"
                      unit="g"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* AI Tip */}
            {data.tip && (
              <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 p-4">
                <Lightbulb className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{data.tip}</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function MacroBar({
  label,
  value,
  max,
  color,
  unit = "",
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="text-center space-y-1">
      <p className="text-xs font-bold tabular-nums">
        {Math.round(value)}{unit}
      </p>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
