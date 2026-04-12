"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ScanBarcode,
  X,
  Plus,
  Loader2,
  BookmarkCheck,
  Trash2,
  Camera,
  AlertCircle,
  ChevronRight,
  Barcode,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { MealFoodEntry, FoodSearchResult, SavedMealTemplate, MealType } from "@/lib/types";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onAddFood: (food: MealFoodEntry) => void;
  onLoadTemplate: (foods: MealFoodEntry[], type: MealType) => void;
  currentMealType: MealType;
}

type Tab = "search" | "saved";

// ─── Barcode Scanner ────────────────────────────────────────────────────────

function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const stopStream = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      // Check BarcodeDetector support
      if (typeof (window as any).BarcodeDetector === "undefined") {
        setError("barcode_unsupported");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        detectorRef.current = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"],
        });

        setScanning(true);

        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current);
            if (barcodes.length > 0) {
              stopStream();
              // Haptic feedback on mobile
              if (navigator.vibrate) navigator.vibrate(80);
              onDetected(barcodes[0].rawValue);
              return;
            }
          } catch {}
          animFrameRef.current = requestAnimationFrame(scan);
        };

        animFrameRef.current = requestAnimationFrame(scan);
      } catch (err: any) {
        if (!cancelled) {
          if (err.name === "NotAllowedError") {
            setError("camera_denied");
          } else {
            setError("camera_error");
          }
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [onDetected, stopStream]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 safe-top">
        <p className="text-white font-semibold text-sm">Escanear código de barras</p>
        <button
          onClick={() => { stopStream(); onClose(); }}
          className="p-2 rounded-full bg-white/10 text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Camera or Error */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <p className="text-white text-sm">
              {error === "barcode_unsupported"
                ? "Tu navegador no soporta el escáner. Usa Chrome en Android o Safari en iPhone."
                : error === "camera_denied"
                ? "Permiso de cámara denegado. Permite el acceso en la configuración del navegador."
                : "Error al acceder a la cámara."}
            </p>
            <button
              onClick={() => { stopStream(); onClose(); }}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-medium text-sm"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Targeting overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-36 relative">
                {/* Corner brackets */}
                {["top-0 left-0", "top-0 right-0 rotate-90", "bottom-0 right-0 rotate-180", "bottom-0 left-0 -rotate-90"].map((cls, i) => (
                  <div key={i} className={cn("absolute w-8 h-8 border-emerald-400", cls)}>
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-400" />
                    <div className="absolute top-0 left-0 h-full w-0.5 bg-emerald-400" />
                  </div>
                ))}
                {scanning && (
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-400/80 animate-[scan_2s_ease-in-out_infinite]" />
                )}
              </div>
            </div>
            <p className="absolute bottom-8 inset-x-0 text-center text-white/60 text-xs">
              Apunta al código de barras del producto
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Food Search Result Card ─────────────────────────────────────────────────

function FoodCard({
  food,
  onAdd,
  locale,
}: {
  food: FoodSearchResult;
  onAdd: (food: FoodSearchResult) => void;
  locale: string;
}) {
  return (
    <div className="glass-card rounded-xl p-3 flex items-start gap-3">
      {food.imageUrl ? (
        <img
          src={food.imageUrl}
          alt={food.name}
          className="h-12 w-12 rounded-lg object-cover shrink-0 bg-secondary"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <Barcode className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight line-clamp-2">{food.name}</p>
        {food.brand && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{food.brand}</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          {t(locale as any, "log.perServing")} {food.servingSize}{food.servingUnit}
        </p>
        <div className="flex gap-2 mt-1 text-[10px] tabular-nums">
          <span className="text-emerald-400">{food.calories} kcal</span>
          <span className="text-indigo-400">P {food.protein}g</span>
          <span className="text-amber-400">C {food.carbs}g</span>
          <span className="text-red-400">F {food.fat}g</span>
        </div>
      </div>
      <button
        onClick={() => onAdd(food)}
        className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 active:bg-emerald-500/20"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function FoodSearchModal({ open, onClose, onAddFood, onLoadTemplate, currentMealType }: Props) {
  const locale = useStore((s) => s.locale);
  const savedMealTemplates = useStore((s) => s.savedMealTemplates);
  const removeMealTemplate = useStore((s) => s.removeMealTemplate);

  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) throw new Error("search_failed");
        const data = await res.json();
        setResults(data.results || []);
        if ((data.results || []).length === 0) setSearchError("no_results");
      } catch {
        setSearchError("search_failed");
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleAddFood = useCallback((food: FoodSearchResult) => {
    const entry: MealFoodEntry = {
      id: uuid(),
      food: {
        id: food.id,
        name: food.name,
        brand: food.brand,
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
      },
      servings: 1,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
    };
    onAddFood(entry);
    toast.success(locale === "es" ? `${food.name} agregado` : `${food.name} added`);
  }, [onAddFood, locale]);

  const handleBarcodeDetected = useCallback(async (code: string) => {
    setShowScanner(false);
    setBarcodeLoading(true);
    try {
      const res = await fetch(`/api/foods/search?barcode=${encodeURIComponent(code)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.found && data.product) {
        handleAddFood(data.product);
        onClose();
      } else {
        toast.error(locale === "es" ? "Producto no encontrado" : "Product not found");
      }
    } catch {
      toast.error(locale === "es" ? "Error al buscar producto" : "Failed to look up product");
    } finally {
      setBarcodeLoading(false);
    }
  }, [handleAddFood, onClose, locale]);

  const handleLoadTemplate = useCallback((template: SavedMealTemplate) => {
    const foods: MealFoodEntry[] = template.foods.map((f) => ({
      id: uuid(),
      food: {
        id: uuid(),
        name: f.name,
        brand: f.brand,
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
    }));
    onLoadTemplate(foods, template.type as MealType);
    onClose();
  }, [onLoadTemplate, onClose]);

  if (!open) return null;

  if (showScanner) {
    return (
      <BarcodeScanner
        onDetected={handleBarcodeDetected}
        onClose={() => setShowScanner(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background safe-top">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={onClose} className="p-2 rounded-xl bg-secondary text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-base font-bold flex-1">
          {t(locale, "log.searchFood")}
        </h2>
        {barcodeLoading && <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-1">
        {(["search", "saved"] as Tab[]).map((tabId) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={cn(
              "flex-1 rounded-xl py-2 text-xs font-semibold transition-colors",
              tab === tabId
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-secondary/50 text-muted-foreground"
            )}
          >
            {tabId === "search"
              ? (locale === "es" ? "Buscar" : "Search")
              : (locale === "es" ? "Guardados" : "Saved")}
          </button>
        ))}
      </div>

      {/* Tab: Search */}
      {tab === "search" && (
        <div className="flex flex-col flex-1 overflow-hidden px-4 pt-3 gap-3">
          {/* Search bar + barcode */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={locale === "es" ? "Buscar alimento..." : "Search food..."}
                className="input-field w-full pl-9 pr-3"
                autoFocus
              />
            </div>
            <button
              onClick={() => setShowScanner(true)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 active:bg-emerald-500/20 shrink-0"
              title={locale === "es" ? "Escanear código de barras" : "Scan barcode"}
            >
              <ScanBarcode className="h-5 w-5" />
            </button>
          </div>

          {/* OpenFoodFacts attribution */}
          <p className="text-[9px] text-muted-foreground/60 text-center">
            {locale === "es"
              ? "Base de datos: Open Food Facts (open source)"
              : "Database: Open Food Facts (open source)"}
          </p>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-2 pb-6">
            {searching && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            )}
            {!searching && searchError === "no_results" && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {locale === "es" ? "Sin resultados. Intenta con otro término." : "No results. Try a different search."}
              </div>
            )}
            {!searching && searchError === "search_failed" && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {locale === "es" ? "Error al buscar. Verifica tu conexión." : "Search failed. Check your connection."}
              </div>
            )}
            {!searching && !searchError && query.trim().length >= 2 && results.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {locale === "es" ? "Escribe para buscar..." : "Type to search..."}
              </div>
            )}
            {!searching && results.map((food) => (
              <FoodCard key={food.id} food={food} onAdd={handleAddFood} locale={locale} />
            ))}
            {!query.trim() && (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <Search className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {locale === "es" ? "Busca cualquier alimento" : "Search any food"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {locale === "es"
                      ? "O usa el escáner para leer el código de barras"
                      : "Or use the scanner to read a barcode"}
                  </p>
                </div>
                <button
                  onClick={() => setShowScanner(true)}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400 active:bg-emerald-500/20"
                >
                  <ScanBarcode className="h-4 w-4" />
                  {locale === "es" ? "Escanear código de barras" : "Scan barcode"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Saved Meal Templates */}
      {tab === "saved" && (
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6 space-y-2">
          {savedMealTemplates.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                <BookmarkCheck className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {locale === "es" ? "Sin comidas guardadas" : "No saved meals"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {locale === "es"
                    ? "Guarda una comida desde la pantalla de revisión para reutilizarla aquí"
                    : "Save a meal from the review screen to reuse it here"}
                </p>
              </div>
            </div>
          ) : (
            savedMealTemplates.map((template) => (
              <div key={template.id} className="glass-card rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{template.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {template.foods.length} {locale === "es" ? "alimentos" : "foods"} ·{" "}
                      {Math.round(template.totalCalories)} kcal ·{" "}
                      P {Math.round(template.totalProtein)}g
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => removeMealTemplate(template.id)}
                      className="p-1.5 rounded-lg text-muted-foreground active:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleLoadTemplate(template)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400 active:bg-emerald-500/20"
                    >
                      {locale === "es" ? "Usar" : "Use"}
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {/* Food preview */}
                <div className="flex flex-wrap gap-1">
                  {template.foods.slice(0, 4).map((f, i) => (
                    <span key={i} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground truncate max-w-[120px]">
                      {f.name}
                    </span>
                  ))}
                  {template.foods.length > 4 && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                      +{template.foods.length - 4}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
