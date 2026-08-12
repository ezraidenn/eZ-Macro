"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Sun,
  CloudSun,
  Moon,
  Cookie,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { type MealEntry, type MealType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { getMealLabel } from "@/lib/i18n";

const MEAL_ICONS: Record<MealType, React.ElementType> = {
  breakfast: Sun,
  lunch: CloudSun,
  dinner: Moon,
  snack: Cookie,
};

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "text-amber-400 bg-amber-400/10",
  lunch: "text-emerald-400 bg-emerald-400/10",
  dinner: "text-indigo-400 bg-indigo-400/10",
  snack: "text-violet-400 bg-violet-400/10",
};

interface MealCardProps {
  meal: MealEntry;
  onTap?: () => void;
  onDelete?: () => void;
  delay?: number;
}

export function MealCard({ meal, onTap, onDelete, delay = 0 }: MealCardProps) {
  const locale = useStore((s) => s.locale);
  const Icon = MEAL_ICONS[meal.type];
  const colorClass = MEAL_COLORS[meal.type];
  const totalCals = meal.foods.reduce((s, f) => s + f.calories, 0);
  const totalProtein = meal.foods.reduce((s, f) => s + f.protein, 0);
  const totalCarbs = meal.foods.reduce((s, f) => s + f.carbs, 0);
  const totalFat = meal.foods.reduce((s, f) => s + f.fat, 0);

  // Mostrar el nombre real de la comida (p. ej. un batido) cuando lo tiene;
  // los nombres genéricos ("Lunch"/"Almuerzo") se muestran localizados.
  const genericNames = [getMealLabel("es", meal.type), getMealLabel("en", meal.type)];
  const title =
    meal.name && !genericNames.includes(meal.name)
      ? meal.name
      : getMealLabel(locale, meal.type);

  return (
    <div
      className="glass-card rounded-2xl p-4 active:scale-[0.98] transition-transform"
      onClick={onTap}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            colorClass
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-[11px] text-muted-foreground">{meal.time}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tabular-nums">
                {Math.round(totalCals)}
              </span>
              <span className="text-[10px] text-muted-foreground">kcal</span>
            </div>
          </div>

          {/* Food items */}
          {meal.foods.length > 0 && (
            <div className="mt-2 space-y-1">
              {meal.foods.slice(0, 3).map((f) => (
                <p
                  key={f.id}
                  className="text-xs text-muted-foreground truncate"
                >
                  {f.food.name}{" "}
                  <span className="text-muted-foreground/50">
                    {Math.round(f.calories)} kcal
                  </span>
                </p>
              ))}
              {meal.foods.length > 3 && (
                <p className="text-[10px] text-muted-foreground/50">
                  +{meal.foods.length - 3} more items
                </p>
              )}
            </div>
          )}

          {/* Macro summary bar */}
          <div className="mt-3 flex items-center gap-3">
            <MacroChip label="P" value={totalProtein} color="text-indigo-400" />
            <MacroChip label="C" value={totalCarbs} color="text-amber-400" />
            <MacroChip label="F" value={totalFat} color="text-red-400" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
        </div>
      </div>
    </div>
  );
}

function MacroChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className={cn("text-[10px] font-bold", color)}>{label}</span>
      <span className="text-[10px] text-muted-foreground tabular-nums">
        {Math.round(value)}g
      </span>
    </div>
  );
}
