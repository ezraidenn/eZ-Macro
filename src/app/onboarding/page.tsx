"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";
import {
  type Gender,
  type ActivityLevel,
  type GoalType,
  type TrainingLevel,
  ACTIVITY_LABELS,
  ACTIVITY_DESCRIPTIONS,
  GOAL_LABELS,
  GOAL_DESCRIPTIONS,
} from "@/lib/types";
import {
  ChevronRight,
  ChevronLeft,
  Target,
  Activity,
  Dumbbell,
  Ruler,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateFullTDEE } from "@/lib/calculations";
import { t, getActivityLabel, getActivityDesc, getGoalLabel, getGoalDesc, getTrainingLabel } from "@/lib/i18n";

const STEPS = ["basics", "activity", "goal", "review"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { setProfile, setOnboarded, recalculateTDEE } = useStore();
  const locale = useStore((s) => s.locale);
  const userId = useAuthStore((s) => s.userId);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState(25);
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(75);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>("intermediate");
  const [goalType, setGoalType] = useState<GoalType>("cut");
  const [isFinishing, setIsFinishing] = useState(false);

  const canNext =
    step === 0
      ? name.trim().length > 0 && age > 0 && height > 0 && weight > 0
      : true;

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  async function finish() {
    if (!userId) {
      toast.error(locale === "es" ? "Error: No hay sesión activa" : "Error: No active session");
      router.replace("/auth");
      return;
    }

    setIsFinishing(true);

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
    
    // Set profile in store first
    setProfile(profileData);
    setOnboarded(true);

    // Sync to DB
    try {
      const res = await fetch("/api/sync/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      if (!res.ok) {
        throw new Error("Failed to sync profile");
      }

      // Success - redirect to dashboard
      router.replace("/dashboard");
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error(locale === "es" ? "Error al guardar perfil" : "Failed to save profile");
      setIsFinishing(false);
    }
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">{t(locale, "onboarding.title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t(locale, "onboarding.subtitle")}
              </p>
            </div>

            <div className="space-y-4">
              <Field label={t(locale, "onboarding.name")}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t(locale, "onboarding.namePlaceholder")}
                  className="input-field"
                />
              </Field>

              <Field label={t(locale, "onboarding.gender")}>
                <div className="flex gap-2">
                  {(["male", "female"] as Gender[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={cn(
                        "flex-1 rounded-xl py-3 text-sm font-medium transition-all",
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
                <Field label={t(locale, "onboarding.age")}>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="input-field text-center"
                    min={14}
                    max={99}
                  />
                </Field>
                <Field label={t(locale, "onboarding.height")}>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="input-field text-center"
                    min={100}
                    max={250}
                  />
                </Field>
                <Field label={t(locale, "onboarding.weight")}>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="input-field text-center"
                    min={30}
                    max={300}
                  />
                </Field>
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-5 w-5 text-emerald-500" />
                <h1 className="text-2xl font-bold">{t(locale, "onboarding.activityTitle")}</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {t(locale, "onboarding.activitySubtitle")}
              </p>
            </div>

            <div className="space-y-2">
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setActivityLevel(level)}
                  className={cn(
                    "w-full rounded-xl p-4 text-left transition-all",
                    activityLevel === level
                      ? "bg-emerald-500/10 ring-1 ring-emerald-500/30"
                      : "bg-secondary/50 active:bg-secondary"
                  )}
                >
                  <p className="text-sm font-semibold">{getActivityLabel(locale, level)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getActivityDesc(locale, level)}
                  </p>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t(locale, "onboarding.trainingExp")}</p>
              <div className="flex gap-2">
                {(["beginner", "intermediate", "advanced"] as TrainingLevel[]).map((tl) => (
                  <button
                    key={tl}
                    onClick={() => setTrainingLevel(tl)}
                    className={cn(
                      "flex-1 rounded-xl py-3 text-xs font-medium transition-all",
                      trainingLevel === tl
                        ? "bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {getTrainingLabel(locale, tl)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-5 w-5 text-emerald-500" />
                <h1 className="text-2xl font-bold">{t(locale, "onboarding.goalTitle")}</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {t(locale, "onboarding.goalSubtitle")}
              </p>
            </div>

            <div className="space-y-2">
              {(Object.keys(GOAL_LABELS) as GoalType[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGoalType(g)}
                  className={cn(
                    "w-full rounded-xl p-4 text-left transition-all",
                    goalType === g
                      ? "bg-emerald-500/10 ring-1 ring-emerald-500/30"
                      : "bg-secondary/50 active:bg-secondary"
                  )}
                >
                  <p className="text-sm font-semibold">{getGoalLabel(locale, g)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getGoalDesc(locale, g)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <ReviewStep
            name={name}
            gender={gender}
            age={age}
            height={height}
            weight={weight}
            activityLevel={activityLevel}
            trainingLevel={trainingLevel}
            goalType={goalType}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-4 pt-8 pb-6 safe-top overflow-hidden">
      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-6 mt-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i <= step ? "bg-emerald-500" : "bg-secondary"
            )}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-4">
        {step > 0 && (
          <button
            onClick={back}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={next}
          disabled={!canNext || isFinishing}
          className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step === STEPS.length - 1 ? (
            <>
              {isFinishing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {locale === "es" ? "Guardando..." : "Saving..."}
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  {t(locale, "onboarding.startTracking")}
                </>
              )}
            </>
          ) : (
            <>
              {t(locale, "onboarding.continue")}
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function ReviewStep(props: {
  name: string;
  gender: Gender;
  age: number;
  height: number;
  weight: number;
  activityLevel: ActivityLevel;
  trainingLevel: TrainingLevel;
  goalType: GoalType;
}) {
  const locale = useStore((s) => s.locale);
  const result = calculateFullTDEE(
    props.weight,
    props.height,
    props.age,
    props.gender,
    props.activityLevel,
    props.goalType,
    props.trainingLevel
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t(locale, "onboarding.planTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(locale, "onboarding.planSubtitle")}
        </p>
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">BMR</span>
          <span className="text-sm font-semibold tabular-nums">{result.bmr} kcal</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">TDEE</span>
          <span className="text-sm font-semibold tabular-nums">{result.tdee} kcal</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {result.deficit > 0 ? t(locale, "common.deficit") : result.deficit < 0 ? t(locale, "common.surplus") : t(locale, "common.balance")}
          </span>
          <span className="text-sm font-semibold tabular-nums text-amber-400">
            {result.deficit > 0 ? "-" : result.deficit < 0 ? "+" : ""}
            {Math.abs(result.deficit)} kcal
          </span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-emerald-400">{t(locale, "common.dailyTarget")}</span>
          <span className="text-lg font-bold tabular-nums text-emerald-400">
            {result.targetCalories} kcal
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <MacroBox label={t(locale, "macro.protein")} value={`${result.macros.protein}g`} color="bg-indigo-500/10 text-indigo-400" />
        <MacroBox label={t(locale, "macro.carbs")} value={`${result.macros.carbs}g`} color="bg-amber-500/10 text-amber-400" />
        <MacroBox label={t(locale, "macro.fat")} value={`${result.macros.fat}g`} color="bg-red-500/10 text-red-400" />
        <MacroBox label={t(locale, "macro.fiber")} value={`${result.macros.fiber}g`} color="bg-violet-500/10 text-violet-400" />
      </div>

      {result.weeklyChange !== 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {t(locale, "onboarding.weeklyChange")}:{" "}
          <span className="font-semibold text-foreground">
            {result.weeklyChange > 0 ? "+" : ""}
            {result.weeklyChange} kg/week
          </span>
        </p>
      )}
    </div>
  );
}

function MacroBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className={cn("rounded-xl p-3 text-center", color)}>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] font-medium opacity-70">{label}</p>
    </div>
  );
}
