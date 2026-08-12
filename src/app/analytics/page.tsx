"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCard } from "@/components/ui/metric-card";
import { calculateAdaptiveTDEE } from "@/lib/calculations";
import { formatDateKey, addDaysToDateKey, diffInDays } from "@/lib/utils";
import {
  Flame,
  Target,
  TrendingDown,
  TrendingUp,
  Activity,
  Zap,
  BarChart3,
  Calendar,
} from "lucide-react";
import { t } from "@/lib/i18n";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

export default function AnalyticsPage() {
  const dayLogs = useStore((s) => s.dayLogs);
  const targets = useStore((s) => s.targets);
  const weights = useStore((s) => s.weights);
  const tdeeResult = useStore((s) => s.tdeeResult);
  const locale = useStore((s) => s.locale);

  const last7Days = useMemo(() => {
    const days: { date: string; calories: number; protein: number; carbs: number; fat: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = formatDateKey(d); // clave en hora local, igual que el registro
      const log = dayLogs[key];
      days.push({
        date: d.toLocaleDateString(locale === "es" ? "es-MX" : "en-US", { weekday: "short" }),
        calories: log?.totals.calories ?? 0,
        protein: log?.totals.protein ?? 0,
        carbs: log?.totals.carbs ?? 0,
        fat: log?.totals.fat ?? 0,
      });
    }
    return days;
  }, [dayLogs, locale]);

  const avgCalories = useMemo(() => {
    const logged = last7Days.filter((d) => d.calories > 0);
    if (logged.length === 0) return 0;
    return Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length);
  }, [last7Days]);

  const avgProtein = useMemo(() => {
    const logged = last7Days.filter((d) => d.protein > 0);
    if (logged.length === 0) return 0;
    return Math.round(logged.reduce((s, d) => s + d.protein, 0) / logged.length);
  }, [last7Days]);

  const adherence = useMemo(() => {
    if (!targets) return 0;
    const logged = last7Days.filter((d) => d.calories > 0);
    if (logged.length === 0) return 0;
    const withinRange = logged.filter(
      (d) =>
        d.calories >= targets.calories * 0.9 &&
        d.calories <= targets.calories * 1.1
    );
    return Math.round((withinRange.length / logged.length) * 100);
  }, [last7Days, targets]);

  const adaptiveTDEE = useMemo(() => {
    if (weights.length < 2) return null;

    // Ventana: pesos dentro de los últimos 14 días NATURALES. Antes se usaba
    // "las últimas 14 entradas" y se pasaba el número de entradas como si
    // fueran días — con pesajes esporádicos el TDEE salía disparatado.
    const today = formatDateKey(new Date());
    const cutoff = addDaysToDateKey(today, -13);
    const recent = weights.filter((w) => w.date >= cutoff);
    if (recent.length < 2) return null;

    const first = recent[0];
    const last = recent[recent.length - 1];
    const spanDays = diffInDays(first.date, last.date);
    if (spanDays < 7) return null; // muy poco intervalo para estimar

    // Calorías promedio de los días registrados DENTRO del mismo intervalo
    // (misma ventana para energía y peso, si no la fórmula no cuadra)
    const loggedCalories: number[] = [];
    for (let key = first.date; key <= last.date; key = addDaysToDateKey(key, 1)) {
      const cals = dayLogs[key]?.totals.calories ?? 0;
      if (cals > 0) loggedCalories.push(cals);
    }
    // Con menos de la mitad de los días registrados, el promedio no es confiable
    if (loggedCalories.length < Math.ceil(spanDays / 2)) return null;

    const avgCals = loggedCalories.reduce((s, c) => s + c, 0) / loggedCalories.length;
    // Usar el promedio móvil en los extremos: el peso crudo de un solo día
    // trae ±1-2kg de ruido (agua/glucógeno) que distorsiona el TDEE hasta
    // ±1000 kcal; la media de 7 días lo elimina casi por completo.
    const weightChange =
      (last.movingAvg7d ?? last.weight) - (first.movingAvg7d ?? first.weight);
    const tdee = calculateAdaptiveTDEE(Math.round(avgCals), weightChange, spanDays);
    return tdee > 0 ? tdee : null;
  }, [weights, dayLogs]);

  const macroDistribution = useMemo(() => {
    const totalP = last7Days.reduce((s, d) => s + d.protein, 0);
    const totalC = last7Days.reduce((s, d) => s + d.carbs, 0);
    const totalF = last7Days.reduce((s, d) => s + d.fat, 0);
    const totalCals = totalP * 4 + totalC * 4 + totalF * 9;
    if (totalCals === 0) return [];
    return [
      { name: "Protein", value: Math.round((totalP * 4 / totalCals) * 100), fill: "#6366f1" },
      { name: "Carbs", value: Math.round((totalC * 4 / totalCals) * 100), fill: "#f59e0b" },
      { name: "Fat", value: Math.round((totalF * 9 / totalCals) * 100), fill: "#ef4444" },
    ];
  }, [last7Days]);

  const daysLogged = last7Days.filter((d) => d.calories > 0).length;

  return (
    <AppShell>
      <div className="px-4 pt-6 safe-top space-y-5">
        <h1 className="text-xl font-bold">{t(locale, "analytics.title")}</h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={Flame}
            label={t(locale, "analytics.avgCalories")}
            value={avgCalories > 0 ? `${avgCalories}` : "---"}
            subtitle={t(locale, "dashboard.last7days")}
            color="text-emerald-500"
            delay={0}
          />
          <MetricCard
            icon={Target}
            label={t(locale, "analytics.adherence")}
            value={`${adherence}%`}
            subtitle={t(locale, "analytics.adherenceDesc")}
            color="text-indigo-500"
            delay={0.05}
          />
          <MetricCard
            icon={Activity}
            label={t(locale, "analytics.adaptiveTDEE")}
            value={adaptiveTDEE ? `${adaptiveTDEE}` : "---"}
            subtitle={adaptiveTDEE ? t(locale, "analytics.basedOnData") : t(locale, "analytics.needData")}
            color="text-amber-500"
            delay={0.1}
          />
          <MetricCard
            icon={Calendar}
            label={t(locale, "analytics.daysLogged")}
            value={`${daysLogged}/7`}
            subtitle={t(locale, "analytics.thisWeek")}
            color="text-cyan-500"
            delay={0.15}
          />
        </div>

        {/* Calorie Intake Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t(locale, "analytics.dailyCalories")}
            </p>
            {targets && (
              <p className="text-[10px] text-emerald-400/60">
                {t(locale, "analytics.target")}: {targets.calories} kcal
              </p>
            )}
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days} barCategoryGap="20%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(0 0% 15%)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(0 0% 50%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(0 0% 50%)" }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(0 0% 8%)",
                    border: "1px solid hsl(0 0% 15%)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  cursor={{ fill: "hsl(0 0% 10%)" }}
                />
                <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                  {last7Days.map((entry, index) => {
                    const isOverTarget = targets
                      ? entry.calories > targets.calories * 1.1
                      : false;
                    const isUnderTarget = targets
                      ? entry.calories < targets.calories * 0.9 && entry.calories > 0
                      : false;
                    return (
                      <Cell
                        key={index}
                        fill={
                          entry.calories === 0
                            ? "hsl(0 0% 15%)"
                            : isOverTarget
                            ? "#ef4444"
                            : isUnderTarget
                            ? "#f59e0b"
                            : "#10b981"
                        }
                        fillOpacity={entry.calories === 0 ? 0.3 : 0.8}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Legend color="#10b981" label={t(locale, "analytics.onTarget")} />
            <Legend color="#f59e0b" label={t(locale, "analytics.under")} />
            <Legend color="#ef4444" label={t(locale, "analytics.over")} />
          </div>
        </motion.div>

        {/* Macro Distribution */}
        {macroDistribution.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card rounded-2xl p-4"
          >
            <p className="text-xs font-medium text-muted-foreground mb-3">
              {t(locale, "analytics.macroDistribution")}
            </p>
            <div className="flex items-center gap-4">
              <div className="h-32 w-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={macroDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {macroDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {macroDistribution.map((m) => (
                  <div key={m.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: m.fill }}
                      />
                      <span className="text-xs">{m.name}</span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums">
                      {m.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Weekly Protein Tracking */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t(locale, "analytics.dailyProtein")}
            </p>
            {targets && (
              <p className="text-[10px] text-indigo-400/60">
                {t(locale, "analytics.target")}: {targets.protein}g
              </p>
            )}
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days} barCategoryGap="20%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(0 0% 15%)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(0 0% 50%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(0 0% 50%)" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(0 0% 8%)",
                    border: "1px solid hsl(0 0% 15%)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  cursor={{ fill: "hsl(0 0% 10%)" }}
                />
                <Bar dataKey="protein" fill="#6366f1" radius={[6, 6, 0, 0]} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* TDEE Comparison */}
        {adaptiveTDEE && tdeeResult && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-card rounded-2xl p-4 space-y-3"
          >
            <p className="text-xs font-medium text-muted-foreground">
              {t(locale, "analytics.tdeeComparison")}
            </p>
            <div className="space-y-2">
              <TDEEBar
                label={t(locale, "analytics.estimated")}
                value={tdeeResult.tdee}
                max={Math.max(tdeeResult.tdee, adaptiveTDEE) * 1.1}
                color="bg-muted-foreground/30"
              />
              <TDEEBar
                label={t(locale, "analytics.adaptive")}
                value={adaptiveTDEE}
                max={Math.max(tdeeResult.tdee, adaptiveTDEE) * 1.1}
                color="bg-emerald-500"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {t(locale, "analytics.difference")}:{" "}
              <span className="font-semibold text-foreground">
                {adaptiveTDEE - tdeeResult.tdee > 0 ? "+" : ""}
                {adaptiveTDEE - tdeeResult.tdee} kcal
              </span>
              {" "}{t(locale, "analytics.adaptiveNote")}
            </p>
          </motion.div>
        )}

        <div className="h-4" />
      </div>
    </AppShell>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function TDEEBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = (value / max) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold tabular-nums">{value} kcal</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
    </div>
  );
}
