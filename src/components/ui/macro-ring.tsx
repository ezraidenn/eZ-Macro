"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MacroRingProps {
  value: number;
  target: number;
  label: string;
  unit?: string;
  color: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function MacroRing({
  value,
  target,
  label,
  unit = "g",
  color,
  size = 88,
  strokeWidth = 6,
  className,
}: MacroRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / Math.max(target, 1), 1);
  const offset = circumference * (1 - pct);
  const remaining = Math.max(target - value, 0);
  const isOver = value > target;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(0 0% 12%)"
            strokeWidth={strokeWidth}
          />
          {/* Animated progress */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isOver ? "#ef4444" : color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-sm font-semibold tabular-nums leading-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {Math.round(value)}
          </motion.span>
          <span className="text-[10px] text-muted-foreground">{unit}</span>
        </div>
      </div>
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-[10px] tabular-nums",
          isOver ? "text-red-400" : "text-muted-foreground/60"
        )}
      >
        {isOver
          ? `+${Math.round(value - target)} over`
          : `${Math.round(remaining)} left`}
      </span>
    </div>
  );
}
