"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: string;
  className?: string;
  delay?: number;
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  trendValue,
  color = "text-emerald-500",
  className,
  delay = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "glass-card rounded-2xl p-4 space-y-2",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            color.includes("emerald") && "bg-emerald-500/10",
            color.includes("indigo") && "bg-indigo-500/10",
            color.includes("amber") && "bg-amber-500/10",
            color.includes("red") && "bg-red-500/10",
            color.includes("cyan") && "bg-cyan-500/10",
            color.includes("violet") && "bg-violet-500/10"
          )}
        >
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        {trend && trendValue && (
          <span
            className={cn(
              "text-[11px] font-medium tabular-nums",
              trend === "up" && "text-emerald-400",
              trend === "down" && "text-red-400",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {trend === "up" ? "+" : trend === "down" ? "" : ""}
            {trendValue}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}
