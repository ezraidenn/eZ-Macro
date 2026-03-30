"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { cn, formatDateKey } from "@/lib/utils";
import {
  type MealType,
  type MealEntry,
  type MealFoodEntry,
  type AIFoodAnalysis,
  MEAL_LABELS,
} from "@/lib/types";
import {
  Camera,
  Upload,
  Pencil,
  Sun,
  CloudSun,
  Moon,
  Cookie,
  Loader2,
  Check,
  X,
  Plus,
  Minus,
  AlertCircle,
  Sparkles,
  ImagePlus,
} from "lucide-react";
import toast from "react-hot-toast";
import { t, getMealLabel } from "@/lib/i18n";

const MEAL_TYPE_OPTIONS: { type: MealType; icon: React.ElementType; color: string }[] = [
  { type: "breakfast", icon: Sun, color: "text-amber-400 bg-amber-400/10" },
  { type: "lunch", icon: CloudSun, color: "text-emerald-400 bg-emerald-400/10" },
  { type: "dinner", icon: Moon, color: "text-indigo-400 bg-indigo-400/10" },
  { type: "snack", icon: Cookie, color: "text-violet-400 bg-violet-400/10" },
];

// Helper function to determine meal type based on current hour
function getMealTypeByTime(): MealType {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 21) return "dinner";
  return "snack";
}

export default function LogPage() {
  const router = useRouter();
  const addMeal = useStore((s) => s.addMeal);
  const currentDate = useStore((s) => s.currentDate);
  const locale = useStore((s) => s.locale);

  const [mealType, setMealType] = useState<MealType>(getMealTypeByTime());
  const [mode, setMode] = useState<"select" | "photo" | "analyzing" | "review">("select");
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<AIFoodAnalysis | null>(null);
  const [foods, setFoods] = useState<MealFoodEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userComment, setUserComment] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 1024;
        let w = img.width;
        let h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    try {
      const compressed = await compressImage(file);
      setImagePreviews((prev) => [...prev.slice(0, 2), compressed]);
      setMode("photo");
    } catch {
      setError("Error al cargar la imagen");
    }
  }, [compressImage]);

  const addMorePhotos = useCallback(() => {
    if (imagePreviews.length >= 3) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          const compressed = await compressImage(file);
          setImagePreviews((prev) => [...prev.slice(0, 2), compressed]);
        } catch {}
      }
    };
    input.click();
  }, [imagePreviews.length, compressImage]);

  const removePhoto = useCallback((index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  function adjustServing(index: number, delta: number) {
    setFoods((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        const newServings = Math.max(0.25, f.servings + delta * 0.25);
        const ratio = newServings / f.servings;
        return {
          ...f,
          servings: newServings,
          calories: f.calories * ratio,
          protein: f.protein * ratio,
          carbs: f.carbs * ratio,
          fat: f.fat * ratio,
          fiber: f.fiber * ratio,
        };
      })
    );
  }

  function removeFood(index: number) {
    setFoods((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveMeal() {
    if (foods.length === 0 || saving) return;
    setSaving(true);

    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    try {
      const res = await fetch("/api/sync/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal: {
            type: mealType,
            name: MEAL_LABELS[mealType],
            time,
            foods,
            photoUrl: imagePreviews[0] ?? null,
            aiAnalyzed: !!analysis,
            verified: true,
          },
          date: currentDate,
        }),
      });

      if (!res.ok) {
        toast.error(t(locale, "log.saveError"));
        return;
      }

      const { meal: saved } = await res.json();

      // Construir MealEntry con el ID real de la BD
      const meal: MealEntry = {
        id: saved.id,
        type: saved.type as MealType,
        name: saved.name,
        time: saved.time,
        photoUrl: saved.photoUrl ?? undefined,
        aiAnalyzed: saved.aiAnalyzed,
        verified: saved.verified,
        foods: saved.foods.map((f: {
          id: string; name: string; servingSize: number; servingUnit: string;
          servings: number; calories: number; protein: number; carbs: number;
          fat: number; fiber: number;
        }): MealFoodEntry => ({
          id: f.id,
          food: {
            id: f.id,
            name: f.name,
            servingSize: f.servingSize,
            servingUnit: f.servingUnit,
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fat: f.fat,
            fiber: f.fiber,
          },
          servings: f.servings,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          fiber: f.fiber,
        })),
      };

      addMeal(currentDate, meal);
      toast.success(t(locale, "log.mealSaved"));
      router.push("/dashboard");
    } catch {
      toast.error(t(locale, "log.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="px-4 pt-6 safe-top space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{t(locale, "log.title")}</h1>
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-secondary text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Meal Type Selector */}
        <div className="flex gap-2">
          {MEAL_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => setMealType(opt.type)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 transition-all",
                mealType === opt.type
                  ? `${opt.color} ring-1 ring-current/20`
                  : "bg-secondary/50 text-muted-foreground"
              )}
            >
              <opt.icon className="h-4 w-4" />
              <span className="text-[10px] font-medium">{t(locale, `meal.${opt.type}`)}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Mode: Select */}
          {mode === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-3"
            >
              <button
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.capture = "environment";
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  };
                  input.click();
                }}
                className="flex w-full items-center gap-4 rounded-2xl bg-emerald-500/10 p-5 text-left active:bg-emerald-500/15 transition-colors"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
                  <Camera className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-400">{t(locale, "log.takePhoto")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(locale, "log.takePhotoDesc")}
                  </p>
                </div>
                <Sparkles className="ml-auto h-4 w-4 text-emerald-400/50" />
              </button>

              <button
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  };
                  input.click();
                }}
                className="flex w-full items-center gap-4 rounded-2xl bg-secondary/50 p-5 text-left active:bg-secondary transition-colors"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t(locale, "log.uploadPhoto")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(locale, "log.uploadPhotoDesc")}
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  setFoods([]);
                  setMode("review");
                }}
                className="flex w-full items-center gap-4 rounded-2xl bg-secondary/50 p-5 text-left active:bg-secondary transition-colors"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                  <Pencil className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t(locale, "log.manualEntry")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(locale, "log.manualEntryDesc")}
                  </p>
                </div>
              </button>
            </motion.div>
          )}

          {/* Mode: Photo (before analysis) */}
          {mode === "photo" && (
            <motion.div
              key="photo"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              {/* Photo Grid */}
              <div className="flex gap-2">
                {imagePreviews.map((img, i) => (
                  <div key={i} className="relative flex-1 h-36 rounded-xl overflow-hidden">
                    <img src={img} alt={`Food ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {imagePreviews.length < 3 && (
                  <button
                    onClick={addMorePhotos}
                    className="flex-1 h-36 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground active:bg-secondary/50"
                  >
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[10px]">{imagePreviews.length}/3</span>
                  </button>
                )}
              </div>

              {/* User Comment Input - BEFORE analysis */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {t(locale, "log.addContext")}
                </label>
                <textarea
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  placeholder={t(locale, "log.contextPlaceholder")}
                  className="input-field min-h-[60px] resize-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMode("select");
                    setImagePreviews([]);
                    setUserComment("");
                  }}
                  className="flex-1 rounded-xl bg-secondary py-3 text-sm font-medium active:bg-secondary/80 transition-colors"
                >
                  {t(locale, "common.cancel")}
                </button>
                <button
                  onClick={async () => {
                    if (imagePreviews.length === 0) return;
                    setMode("analyzing");
                    setError(null);

                    try {
                      const res = await fetch("/api/analyze-food", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          images: imagePreviews,
                          userComment: userComment || undefined 
                        }),
                      });

                      if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || "Analysis failed");
                      }

                      const data: AIFoodAnalysis = await res.json();
                      setAnalysis(data);
                      
                      const mapped: MealFoodEntry[] = data.foods.map((f) => ({
                        id: uuid(),
                        food: {
                          id: uuid(),
                          name: f.name,
                          servingSize: f.estimatedGrams,
                          servingUnit: "g",
                          calories: f.calories,
                          protein: f.protein,
                          carbs: f.carbs,
                          fat: f.fat,
                          fiber: f.fiber,
                        },
                        servings: 1,
                        calories: f.calories,
                        protein: f.protein,
                        carbs: f.carbs,
                        fat: f.fat,
                        fiber: f.fiber,
                      }));
                      
                      setFoods(mapped);
                      setMode("review");
                    } catch (err: any) {
                      const msg = err?.message || "Error al analizar la imagen";
                      setError(msg);
                      toast.error(msg);
                      setMode("photo");
                    }
                  }}
                  className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-medium text-white active:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {t(locale, "log.analyzePhoto")}
                </button>
              </div>
            </motion.div>
          )}

          {/* Mode: Analyzing */}
          {mode === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 space-y-4"
            >
              {imagePreviews.length > 0 && (
                <div className="flex gap-2">
                  {imagePreviews.map((img, i) => (
                    <div key={i} className="h-20 w-20 rounded-xl overflow-hidden">
                      <img src={img} alt={`Food ${i + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <div className="text-center">
                <p className="text-sm font-semibold">{t(locale, "log.analyzing")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(locale, "log.analyzingDesc")}
                </p>
              </div>
            </motion.div>
          )}

          {/* Mode: Review */}
          {mode === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {imagePreviews.length > 0 && (
                <div className="flex gap-2">
                  {imagePreviews.map((img, i) => (
                    <div key={i} className="h-28 flex-1 rounded-xl overflow-hidden">
                      <img src={img} alt={`Food ${i + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* AI Notes */}
              {analysis?.notes && analysis.notes.length > 0 && (
                <div className="rounded-xl bg-indigo-500/10 p-3 space-y-1">
                  <p className="text-[10px] font-medium text-indigo-400">{t(locale, "log.aiNotes")}</p>
                  {analysis.notes.map((note, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{note}</p>
                  ))}
                </div>
              )}

              {/* Food Items */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {foods.length > 0
                    ? `${foods.length} ${t(locale, "log.itemsDetected")}`
                    : t(locale, "log.addManually")}
                </p>

                {foods.map((f, i) => (
                  <div
                    key={f.id}
                    className="glass-card rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {f.food.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {Math.round(f.food.servingSize * f.servings)}g
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => adjustServing(i, -1)}
                          className="p-1 rounded-lg bg-secondary"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-medium tabular-nums">
                          {f.servings.toFixed(2)}
                        </span>
                        <button
                          onClick={() => adjustServing(i, 1)}
                          className="p-1 rounded-lg bg-secondary"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeFood(i)}
                          className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 text-[10px]">
                      <span className="text-emerald-400 tabular-nums">
                        {Math.round(f.calories)} kcal
                      </span>
                      <span className="text-indigo-400 tabular-nums">
                        P {Math.round(f.protein)}g
                      </span>
                      <span className="text-amber-400 tabular-nums">
                        C {Math.round(f.carbs)}g
                      </span>
                      <span className="text-red-400 tabular-nums">
                        F {Math.round(f.fat)}g
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              {foods.length > 0 && (
                <div className="glass-card rounded-xl p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {t(locale, "log.mealTotal")}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold tabular-nums text-emerald-400">
                      {Math.round(foods.reduce((s, f) => s + f.calories, 0))} kcal
                    </span>
                    <div className="flex gap-3 text-xs">
                      <span className="text-indigo-400 tabular-nums">
                        P {Math.round(foods.reduce((s, f) => s + f.protein, 0))}g
                      </span>
                      <span className="text-amber-400 tabular-nums">
                        C {Math.round(foods.reduce((s, f) => s + f.carbs, 0))}g
                      </span>
                      <span className="text-red-400 tabular-nums">
                        F {Math.round(foods.reduce((s, f) => s + f.fat, 0))}g
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setMode("select");
                    setImagePreviews([]);
                    setAnalysis(null);
                    setFoods([]);
                    setError(null);
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary"
                >
                  <X className="h-5 w-5" />
                </button>
                <button
                  onClick={saveMeal}
                  disabled={foods.length === 0 || saving}
                  className={cn(
                    "flex h-12 flex-1 items-center justify-center gap-2 rounded-xl font-semibold text-sm transition-all",
                    foods.length > 0 && !saving
                      ? "bg-emerald-500 text-black active:bg-emerald-600"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {t(locale, "log.saveMeal")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
