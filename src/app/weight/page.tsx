"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { formatDateKey } from "@/lib/utils";
import { Scale, TrendingDown, TrendingUp, Minus, Plus, Check } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import toast from "react-hot-toast";
import { t } from "@/lib/i18n";

export default function WeightPage() {
  const weights = useStore((s) => s.weights);
  const addWeight = useStore((s) => s.addWeight);
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const locale = useStore((s) => s.locale);
  const [inputWeight, setInputWeight] = useState(
    profile?.weight?.toString() ?? "75"
  );

  const today = formatDateKey(new Date());
  const todayEntry = weights.find((w) => w.date === today);
  const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : null;

  const weeklyChange =
    weights.length >= 7
      ? weights[weights.length - 1].weight - weights[Math.max(0, weights.length - 7)].weight
      : null;

  const monthlyChange =
    weights.length >= 30
      ? weights[weights.length - 1].weight - weights[Math.max(0, weights.length - 30)].weight
      : null;

  const chartData = weights.slice(-30).map((w) => ({
    date: w.date.slice(5),
    weight: w.weight,
    avg: w.movingAvg7d ?? w.weight,
  }));

  async function handleSave() {
    const val = parseFloat(inputWeight);
    if (isNaN(val) || val < 20 || val > 400) {
      toast.error(t(locale, "weight.invalidWeight"));
      return;
    }
    addWeight(today, val);

    // Update profile weight and recalculate TDEE/macros
    if (profile) {
      setProfile({ ...profile, weight: val });
    }

    // Sync to DB
    try {
      await fetch("/api/sync/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, weight: val }),
      });
    } catch {}

    toast.success(t(locale, "weight.logged"));
  }

  function adjustWeight(delta: number) {
    const val = parseFloat(inputWeight);
    if (!isNaN(val)) {
      setInputWeight((val + delta).toFixed(1));
    }
  }

  return (
    <AppShell>
      <div className="px-4 pt-6 safe-top space-y-5">
        <h1 className="text-xl font-bold">{t(locale, "weight.title")}</h1>

        {/* Weight Input */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
              <Scale className="h-4 w-4 text-cyan-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t(locale, "weight.todayWeight")}</p>
              <p className="text-[10px] text-muted-foreground">
                {todayEntry ? t(locale, "weight.alreadyLogged") : t(locale, "weight.tip")}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => adjustWeight(-0.1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary active:bg-secondary/80"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="relative">
              <input
                type="number"
                value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
                step="0.1"
                className="w-28 bg-transparent text-center text-3xl font-bold tabular-nums outline-none"
              />
              <span className="absolute -right-6 bottom-1 text-xs text-muted-foreground">
                kg
              </span>
            </div>
            <button
              onClick={() => adjustWeight(0.1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary active:bg-secondary/80"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleSave}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-black active:bg-emerald-600 transition-colors"
          >
            <Check className="h-4 w-4" />
            {todayEntry ? t(locale, "weight.updateWeight") : t(locale, "weight.logWeight")}
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatBox
            label="Current"
            value={latestWeight ? `${latestWeight.toFixed(1)}` : "---"}
            unit="kg"
          />
          <StatBox
            label="7-Day"
            value={
              weeklyChange !== null
                ? `${weeklyChange > 0 ? "+" : ""}${weeklyChange.toFixed(1)}`
                : "---"
            }
            unit="kg"
            color={
              weeklyChange !== null
                ? weeklyChange < 0
                  ? "text-emerald-400"
                  : weeklyChange > 0
                  ? "text-red-400"
                  : ""
                : ""
            }
          />
          <StatBox
            label="30-Day"
            value={
              monthlyChange !== null
                ? `${monthlyChange > 0 ? "+" : ""}${monthlyChange.toFixed(1)}`
                : "---"
            }
            unit="kg"
            color={
              monthlyChange !== null
                ? monthlyChange < 0
                  ? "text-emerald-400"
                  : monthlyChange > 0
                  ? "text-red-400"
                  : ""
                : ""
            }
          />
        </div>

        {/* Chart */}
        {chartData.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-4"
          >
            <p className="text-xs font-medium text-muted-foreground mb-3">
              {t(locale, "weight.trend")}
            </p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
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
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={["dataMin - 1", "dataMax + 1"]}
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
                    labelStyle={{ color: "hsl(0 0% 60%)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="hsl(0 0% 40%)"
                    strokeWidth={1}
                    dot={{ r: 2, fill: "hsl(0 0% 40%)" }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded bg-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{t(locale, "weight.daily")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded bg-emerald-500" />
                <span className="text-[10px] text-muted-foreground">{t(locale, "weight.7dayAvg")}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* History */}
        {weights.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t(locale, "weight.history")}</p>
            {[...weights]
              .reverse()
              .slice(0, 14)
              .map((w) => (
                <div
                  key={w.date}
                  className="flex items-center justify-between rounded-xl bg-secondary/30 px-4 py-3"
                >
                  <span className="text-xs text-muted-foreground">{w.date}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {w.weight.toFixed(1)} kg
                    </span>
                    {w.movingAvg7d && (
                      <span className="text-[10px] text-emerald-400/60 tabular-nums">
                        avg {w.movingAvg7d.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        <div className="h-4" />
      </div>
    </AppShell>
  );
}

function StatBox({
  label,
  value,
  unit,
  color = "",
}: {
  label: string;
  value: string;
  unit: string;
  color?: string;
}) {
  return (
    <div className="glass-card rounded-xl p-3 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{unit}</p>
    </div>
  );
}
