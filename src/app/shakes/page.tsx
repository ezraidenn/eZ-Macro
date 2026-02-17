"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { t } from "@/lib/i18n";
import { v4 as uuid } from "uuid";
import { cn, formatDateKey } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Loader2,
  X,
  ImagePlus,
  Sparkles,
  Zap,
  Camera,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import type { SavedShake, MealEntry, MealFoodEntry } from "@/lib/types";

export default function ShakesPage() {
  const router = useRouter();
  const locale = useStore((s) => s.locale);
  const savedShakes = useStore((s) => s.savedShakes);
  const addShake = useStore((s) => s.addShake);
  const removeShake = useStore((s) => s.removeShake);
  const addMeal = useStore((s) => s.addMeal);
  const currentDate = useStore((s) => s.currentDate);

  const [showCreate, setShowCreate] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const pickPhoto = useCallback(() => {
    if (images.length >= 3) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          const compressed = await compressImage(file);
          setImages((prev) => [...prev.slice(0, 2), compressed]);
        } catch {}
      }
    };
    input.click();
  }, [images.length, compressImage]);

  async function analyzeShake() {
    if (images.length === 0 && !description) {
      setError(locale === "es" ? "Agrega al menos una foto o descripción" : "Add at least one photo or description");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.length > 0 ? images : undefined,
          userComment: description
            ? `This is a protein shake / supplement. ${description}. Extract exact nutritional values from labels if visible.`
            : "This is a protein shake / supplement. Extract exact nutritional values from the nutrition label.",
        }),
      });

      if (!res.ok) throw new Error("Analysis failed");

      const data = await res.json();

      // Combine all detected foods into one shake entry
      const totalCals = data.foods?.reduce((s: number, f: any) => s + (f.calories || 0), 0) || 0;
      const totalProtein = data.foods?.reduce((s: number, f: any) => s + (f.protein || 0), 0) || 0;
      const totalCarbs = data.foods?.reduce((s: number, f: any) => s + (f.carbs || 0), 0) || 0;
      const totalFat = data.foods?.reduce((s: number, f: any) => s + (f.fat || 0), 0) || 0;
      const totalFiber = data.foods?.reduce((s: number, f: any) => s + (f.fiber || 0), 0) || 0;

      const shakeName = data.foods?.length === 1
        ? data.foods[0].name
        : (locale === "es" ? "Batido de Proteína" : "Protein Shake");

      const shake: SavedShake = {
        id: uuid(),
        name: shakeName,
        description: description || (data.foods?.map((f: any) => f.name).join(" + ") || ""),
        calories: totalCals,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        fiber: totalFiber,
        photoUrl: images[0] || undefined,
        createdAt: new Date().toISOString(),
      };

      addShake(shake);
      toast.success(locale === "es" ? "Batido guardado" : "Shake saved");
      setShowCreate(false);
      setImages([]);
      setDescription("");
    } catch (err: any) {
      setError(err?.message || "Error al analizar");
      toast.error(err?.message || "Error");
    } finally {
      setAnalyzing(false);
    }
  }

  function quickAddShake(shake: SavedShake) {
    const now = new Date();
    const foodEntry: MealFoodEntry = {
      id: uuid(),
      food: {
        id: uuid(),
        name: shake.name,
        servingSize: 100,
        servingUnit: "g",
        calories: shake.calories,
        protein: shake.protein,
        carbs: shake.carbs,
        fat: shake.fat,
        fiber: shake.fiber,
      },
      servings: 1,
      calories: shake.calories,
      protein: shake.protein,
      carbs: shake.carbs,
      fat: shake.fat,
      fiber: shake.fiber,
    };

    const meal: MealEntry = {
      id: uuid(),
      type: "snack",
      name: shake.name,
      time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
      foods: [foodEntry],
      aiAnalyzed: false,
      verified: true,
    };

    addMeal(currentDate, meal);
    toast.success(locale === "es" ? `${shake.name} agregado` : `${shake.name} added`);
  }

  return (
    <AppShell>
      <div className="px-4 pt-6 safe-top space-y-5 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {locale === "es" ? "Mis Batidos" : "My Shakes"}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {locale === "es"
                ? "Escanea una vez, agrega rápido cada día"
                : "Scan once, quick-add every day"}
            </p>
          </div>
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 active:bg-emerald-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              {locale === "es" ? "Nuevo" : "New"}
            </button>
          )}
        </div>

        {/* Create New Shake */}
        {showCreate && (
          <div className="glass-card rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {locale === "es" ? "Escanear Batido" : "Scan Shake"}
              </p>
              <button
                onClick={() => { setShowCreate(false); setImages([]); setDescription(""); setError(null); }}
                className="p-1.5 rounded-lg bg-secondary text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Photo Grid */}
            <div className="flex gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative flex-1 h-28 rounded-xl overflow-hidden">
                  <img src={img} alt={`Label ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <button
                  onClick={pickPhoto}
                  className="flex-1 h-28 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground active:bg-secondary/50"
                >
                  <Camera className="h-5 w-5" />
                  <span className="text-[10px]">
                    {locale === "es" ? "Etiqueta" : "Label"} ({images.length}/3)
                  </span>
                </button>
              )}
            </div>

            {/* Description */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={locale === "es"
                ? "Ej: 1 scoop de whey protein con leche y un plátano"
                : "E.g: 1 scoop whey protein with milk and a banana"}
              className="input-field min-h-[60px] resize-none w-full"
              rows={2}
            />

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <button
              onClick={analyzeShake}
              disabled={analyzing}
              className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-medium text-white active:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {locale === "es" ? "Analizando..." : "Analyzing..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {locale === "es" ? "Analizar y Guardar" : "Analyze & Save"}
                </>
              )}
            </button>
          </div>
        )}

        {/* Saved Shakes List */}
        {savedShakes.length === 0 && !showCreate ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
              <Zap className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {locale === "es"
                ? "No tienes batidos guardados"
                : "No saved shakes yet"}
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-[250px]">
              {locale === "es"
                ? "Escanea las etiquetas de tu batido una vez y agrégalo rápido cada día"
                : "Scan your shake labels once and quick-add it every day"}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-2 flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400"
            >
              <Plus className="h-4 w-4" />
              {locale === "es" ? "Escanear Batido" : "Scan Shake"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {savedShakes.map((shake) => (
              <div key={shake.id} className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {shake.photoUrl ? (
                    <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0">
                      <img src={shake.photoUrl} alt={shake.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                      <Zap className="h-5 w-5 text-violet-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{shake.name}</p>
                    {shake.description && (
                      <p className="text-[10px] text-muted-foreground truncate">{shake.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeShake(shake.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Macros */}
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {Math.round(shake.calories)} kcal
                  </span>
                  <span className="text-indigo-400 tabular-nums">
                    P {Math.round(shake.protein)}g
                  </span>
                  <span className="text-amber-400 tabular-nums">
                    C {Math.round(shake.carbs)}g
                  </span>
                  <span className="text-red-400 tabular-nums">
                    F {Math.round(shake.fat)}g
                  </span>
                </div>

                {/* Quick Add Button */}
                <button
                  onClick={() => quickAddShake(shake)}
                  className="w-full rounded-xl bg-emerald-500/10 py-2.5 text-xs font-medium text-emerald-400 active:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Zap className="h-3.5 w-3.5" />
                  {locale === "es" ? "Agregar Hoy" : "Add Today"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
