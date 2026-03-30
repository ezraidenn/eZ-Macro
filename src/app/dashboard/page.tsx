"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { CalorieBar } from "@/components/ui/calorie-bar";
import { MacroRing } from "@/components/ui/macro-ring";
import { MealCard } from "@/components/ui/meal-card";
import { MetricCard } from "@/components/ui/metric-card";
import { t, getGreetingLocalized } from "@/lib/i18n";
import {
  formatDate,
  formatDateKey,
  percentage,
} from "@/lib/utils";
import {
  Plus,
  Droplets,
  Leaf,
  TrendingDown,
  TrendingUp,
  Scale,
  ChevronLeft,
  ChevronRight,
  Settings,
  Lightbulb,
  Zap,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const targets = useStore((s) => s.targets);
  const tdeeResult = useStore((s) => s.tdeeResult);
  const currentDate = useStore((s) => s.currentDate);
  const setCurrentDate = useStore((s) => s.setCurrentDate);
  const dayLogs = useStore((s) => s.dayLogs);
  const removeMeal = useStore((s) => s.removeMeal);
  const weights = useStore((s) => s.weights);
  const locale = useStore((s) => s.locale);

  if (!profile || !targets) return null;

  const log = dayLogs[currentDate] ?? { date: currentDate, meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } };
  const totals = log.totals;
  const today = formatDateKey(new Date());
  const isToday = currentDate === today;

  const latestWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const weeklyChange =
    weights.length >= 7
      ? weights[weights.length - 1].weight - weights[weights.length - 7].weight
      : null;

  function handleDeleteMeal(mealId: string) {
    removeMeal(currentDate, mealId); // optimistic
    fetch("/api/sync/meals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealId }),
    }).catch(() => {});
  }

  function shiftDate(days: number) {
    const d = new Date(currentDate + "T12:00:00");
    d.setDate(d.getDate() + days);
    setCurrentDate(formatDateKey(d));
  }

  return (
    <AppShell>
      <div className="px-4 pt-6 safe-top space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{getGreetingLocalized(locale)}</p>
            <h1 className="text-xl font-bold">{profile.name}</h1>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-secondary px-1 py-1">
            <button
              onClick={() => shiftDate(-1)}
              className="p-1.5 rounded-full hover:bg-background/50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(today)}
              className="px-2 py-1 text-xs font-medium"
            >
              {isToday ? t(locale, "dashboard.today") : formatDate(new Date(currentDate + "T12:00:00"))}
            </button>
            <button
              onClick={() => shiftDate(1)}
              className="p-1.5 rounded-full hover:bg-background/50 transition-colors"
              disabled={isToday}
            >
              <ChevronRight className="h-4 w-4 opacity-50" />
            </button>
          </div>
        </div>

        {/* Calorie Progress */}
        <div className="glass-card rounded-2xl p-5">
          <CalorieBar consumed={totals.calories} target={targets.calories} />
        </div>

        {/* Macro Rings */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-around">
            <MacroRing
              value={totals.protein}
              target={targets.protein}
              label={t(locale, "macro.protein")}
              color="#6366f1"
            />
            <MacroRing
              value={totals.carbs}
              target={targets.carbs}
              label={t(locale, "macro.carbs")}
              color="#f59e0b"
            />
            <MacroRing
              value={totals.fat}
              target={targets.fat}
              label={t(locale, "macro.fat")}
              color="#ef4444"
            />
            <MacroRing
              value={totals.fiber}
              target={targets.fiber}
              label={t(locale, "macro.fiber")}
              color="#8b5cf6"
              size={72}
              strokeWidth={5}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={Scale}
            label={t(locale, "dashboard.currentWeight")}
            value={latestWeight ? `${latestWeight.weight} kg` : "---"}
            subtitle={latestWeight ? latestWeight.date : t(locale, "dashboard.noData")}
            delay={0.15}
            color="text-cyan-500"
          />
          <MetricCard
            icon={weeklyChange !== null && weeklyChange < 0 ? TrendingDown : TrendingUp}
            label={t(locale, "dashboard.weeklyChange")}
            value={
              weeklyChange !== null
                ? `${weeklyChange > 0 ? "+" : ""}${weeklyChange.toFixed(1)} kg`
                : "---"
            }
            subtitle={t(locale, "dashboard.last7days")}
            trend={
              weeklyChange !== null
                ? weeklyChange < 0
                  ? "down"
                  : weeklyChange > 0
                  ? "up"
                  : "neutral"
                : undefined
            }
            delay={0.2}
            color="text-amber-500"
          />
        </div>

        {/* Remaining Macros Summary */}
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            {t(locale, "dashboard.remaining")}
          </p>
          <div className="grid grid-cols-4 gap-2">
            <RemainingChip
              label={t(locale, "macro.calories")}
              current={totals.calories}
              target={targets.calories}
              unit="kcal"
              color="text-emerald-400"
            />
            <RemainingChip
              label={t(locale, "macro.protein")}
              current={totals.protein}
              target={targets.protein}
              unit="g"
              color="text-indigo-400"
            />
            <RemainingChip
              label={t(locale, "macro.carbs")}
              current={totals.carbs}
              target={targets.carbs}
              unit="g"
              color="text-amber-400"
            />
            <RemainingChip
              label={t(locale, "macro.fat")}
              current={totals.fat}
              target={targets.fat}
              unit="g"
              color="text-red-400"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => router.push("/recommendations")}
            className="flex flex-col items-center gap-1.5 rounded-xl bg-amber-500/10 p-3 active:bg-amber-500/15 transition-colors"
          >
            <Lightbulb className="h-5 w-5 text-amber-400" />
            <span className="text-[10px] font-medium text-amber-400">
              {locale === "es" ? "Sugerencias" : "Suggestions"}
            </span>
          </button>
          <button
            onClick={() => router.push("/shakes")}
            className="flex flex-col items-center gap-1.5 rounded-xl bg-violet-500/10 p-3 active:bg-violet-500/15 transition-colors"
          >
            <Zap className="h-5 w-5 text-violet-400" />
            <span className="text-[10px] font-medium text-violet-400">
              {locale === "es" ? "Batidos" : "Shakes"}
            </span>
          </button>
          <button
            onClick={() => router.push("/log")}
            className="flex flex-col items-center gap-1.5 rounded-xl bg-emerald-500/10 p-3 active:bg-emerald-500/15 transition-colors"
          >
            <Plus className="h-5 w-5 text-emerald-400" />
            <span className="text-[10px] font-medium text-emerald-400">
              {locale === "es" ? "Registrar" : "Log Meal"}
            </span>
          </button>
        </div>

        {/* Meals */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t(locale, "dashboard.meals")}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/settings")}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => router.push("/log")}
                className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 active:bg-emerald-500/20 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {t(locale, "dashboard.addMeal")}
              </button>
            </div>
          </div>

          {log.meals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t(locale, "dashboard.noMeals")}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {t(locale, "dashboard.noMealsHint")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {log.meals.map((meal, i) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  delay={0.3 + i * 0.05}
                  onTap={() => {}}
                  onDelete={() => handleDeleteMeal(meal.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom spacer */}
        <div className="h-4" />
      </div>
    </AppShell>
  );
}

function RemainingChip({
  label,
  current,
  target,
  unit,
  color,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}) {
  const rem = Math.max(target - current, 0);
  const isOver = current > target;
  return (
    <div className="text-center">
      <p
        className={`text-base font-bold tabular-nums ${
          isOver ? "text-red-400" : color
        }`}
      >
        {isOver ? `+${Math.round(current - target)}` : Math.round(rem)}
      </p>
      <p className="text-[10px] text-muted-foreground">{unit} {label.toLowerCase()}</p>
    </div>
  );
}
