"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/utils";
import { t, getActivityLabel, getGoalLabel, getTrainingLabel } from "@/lib/i18n";
import {
  type Gender,
  type ActivityLevel,
  type GoalType,
  type TrainingLevel,
  ACTIVITY_LABELS,
  GOAL_LABELS,
} from "@/lib/types";
import {
  User,
  Ruler,
  Target,
  Activity,
  Dumbbell,
  Save,
  RotateCcw,
  Flame,
  Zap,
  Info,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const tdeeResult = useStore((s) => s.tdeeResult);
  const targets = useStore((s) => s.targets);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const locale = useStore((s) => s.locale);

  const [name, setName] = useState(profile?.name ?? "");
  const [gender, setGender] = useState<Gender>(profile?.gender ?? "male");
  const [age, setAge] = useState(profile?.age ?? 25);
  const [height, setHeight] = useState(profile?.height ?? 175);
  const [weight, setWeight] = useState(profile?.weight ?? 75);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    profile?.activityLevel ?? "moderate"
  );
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>(
    profile?.trainingLevel ?? "intermediate"
  );
  const [goalType, setGoalType] = useState<GoalType>(
    profile?.goalType ?? "cut"
  );

  async function handleSave() {
    if (!name.trim()) {
      toast.error(t(locale, "profile.nameRequired"));
      return;
    }
    const profileData = {
      name,
      gender,
      age,
      height,
      weight,
      activityLevel,
      trainingLevel,
      goalType,
    };
    setProfile(profileData);

    try {
      const res = await fetch("/api/sync/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? t(locale, "auth.genericError"));
        return;
      }
    } catch {
      toast.error(t(locale, "auth.genericError"));
      return;
    }

    toast.success(t(locale, "profile.updated"));
  }

  function handleReset() {
    setOnboarded(false);
    window.location.href = "/onboarding";
  }

  return (
    <AppShell>
      <div className="px-4 pt-6 safe-top space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{t(locale, "profile.title")}</h1>
          <button
            onClick={() => router.push("/settings")}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Current Targets Summary */}
        {tdeeResult && targets && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4 space-y-3"
          >
            <p className="text-xs font-medium text-muted-foreground">
              {t(locale, "profile.currentTargets")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t(locale, "profile.dailyCalories")}</p>
                  <p className="text-sm font-bold tabular-nums">
                    {targets.calories} kcal
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">TDEE</p>
                  <p className="text-sm font-bold tabular-nums">
                    {tdeeResult.tdee} kcal
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <MiniMacro label="Protein" value={`${targets.protein}g`} color="text-indigo-400" />
              <MiniMacro label="Carbs" value={`${targets.carbs}g`} color="text-amber-400" />
              <MiniMacro label="Fat" value={`${targets.fat}g`} color="text-red-400" />
              <MiniMacro label="Fiber" value={`${targets.fiber}g`} color="text-violet-400" />
            </div>
          </motion.div>
        )}

        {/* Edit Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-4"
        >
          <Field label={t(locale, "onboarding.name")} icon={User}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
          </Field>

          <Field label={t(locale, "onboarding.gender")} icon={User}>
            <div className="flex gap-2">
              {(["male", "female"] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={cn(
                    "flex-1 rounded-xl py-2.5 text-xs font-medium transition-all",
                    gender === g
                      ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {g === "male" ? t(locale, "onboarding.male") : t(locale, "onboarding.female")}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label={t(locale, "onboarding.age")} icon={User}>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="input-field text-center"
              />
            </Field>
            <Field label={t(locale, "onboarding.height")} icon={Ruler}>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="input-field text-center"
              />
            </Field>
            <Field label={t(locale, "onboarding.weight")} icon={Ruler}>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="input-field text-center"
              />
            </Field>
          </div>

          <Field label={t(locale, "onboarding.activityTitle")} icon={Activity}>
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
              className="input-field"
            >
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((l) => (
                <option key={l} value={l}>
                  {getActivityLabel(locale, l)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t(locale, "onboarding.trainingExp")} icon={Dumbbell}>
            <div className="flex gap-2">
              {(["beginner", "intermediate", "advanced"] as TrainingLevel[]).map(
                (lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setTrainingLevel(lvl)}
                    className={cn(
                      "flex-1 rounded-xl py-2.5 text-xs font-medium capitalize transition-all",
                      trainingLevel === lvl
                        ? "bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {getTrainingLabel(locale, lvl)}
                  </button>
                )
              )}
            </div>
          </Field>

          <Field label={t(locale, "onboarding.goalTitle")} icon={Target}>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(GOAL_LABELS) as GoalType[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGoalType(g)}
                  className={cn(
                    "rounded-xl py-2.5 text-xs font-medium transition-all",
                    goalType === g
                      ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {getGoalLabel(locale, g)}
                </button>
              ))}
            </div>
          </Field>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm text-muted-foreground active:bg-secondary/80"
          >
            <RotateCcw className="h-4 w-4" />
            {t(locale, "profile.reset")}
          </button>
          <button
            onClick={handleSave}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-black active:bg-emerald-600 transition-colors"
          >
            <Save className="h-4 w-4" />
            {t(locale, "profile.save")}
          </button>
        </div>

        {/* Scientific Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-secondary/30 p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">
              {t(locale, "profile.howCalculated")}
            </p>
          </div>
          <ul className="space-y-1 text-[10px] text-muted-foreground/70 leading-relaxed">
            <li>{t(locale, "profile.sciNote1")}</li>
            <li>{t(locale, "profile.sciNote2")}</li>
            <li>{t(locale, "profile.sciNote3")}</li>
            <li>{t(locale, "profile.sciNote4")}</li>
            <li>{t(locale, "profile.sciNote5")}</li>
            <li>{t(locale, "profile.sciNote6")}</li>
          </ul>
        </motion.div>

        <div className="h-4" />
      </div>
    </AppShell>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </label>
      {children}
    </div>
  );
}

function MiniMacro({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <p className={`text-sm font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
