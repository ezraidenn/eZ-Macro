"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

interface CalorieBarProps {
  consumed: number;
  target: number;
  className?: string;
}

export function CalorieBar({ consumed, target, className }: CalorieBarProps) {
  const pct = Math.min((consumed / Math.max(target, 1)) * 100, 100);
  const remaining = Math.max(target - consumed, 0);
  const isOver = consumed > target;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Flame className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Calories</p>
            <p className="text-lg font-bold tabular-nums leading-tight">
              {Math.round(consumed)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                / {Math.round(target)}
              </span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "text-sm font-semibold tabular-nums",
              isOver ? "text-red-400" : "text-emerald-400"
            )}
          >
            {isOver
              ? `+${Math.round(consumed - target)}`
              : Math.round(remaining)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {isOver ? "over" : "remaining"}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            isOver
              ? "bg-gradient-to-r from-red-500 to-red-400"
              : "bg-gradient-to-r from-emerald-600 to-emerald-400"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
        />
        {/* Glow effect at tip */}
        {pct > 5 && (
          <motion.div
            className={cn(
              "absolute top-0 h-full w-4 rounded-full blur-sm",
              isOver ? "bg-red-400/50" : "bg-emerald-400/50"
            )}
            initial={{ left: 0 }}
            animate={{ left: `calc(${pct}% - 8px)` }}
            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          />
        )}
      </div>
    </div>
  );
}
