import React from "react";
import { formatINR } from "@/lib/currency";
import { TrendingUp, TrendingDown, HelpCircle, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  amount: number | string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive?: boolean;
    label?: string;
  };
  subtitle?: string;
  formula?: string;
  badge?: string;
  colorScheme?: "emerald" | "rose" | "amber" | "blue" | "indigo" | "violet" | "slate";
  isRawString?: boolean;
  className?: string;
}

const colorStyles = {
  emerald: {
    bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20 border-emerald-500/20",
    iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
    border: "hover:border-emerald-500/30",
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  rose: {
    bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-500/20 border-rose-500/20",
    iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400",
    border: "hover:border-rose-500/30",
    accent: "text-rose-600 dark:text-rose-400",
  },
  amber: {
    bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20 border-amber-500/20",
    iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
    border: "hover:border-amber-500/30",
    accent: "text-amber-600 dark:text-amber-400",
  },
  blue: {
    bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 dark:bg-blue-500/20 border-blue-500/20",
    iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
    border: "hover:border-blue-500/30",
    accent: "text-blue-600 dark:text-blue-400",
  },
  indigo: {
    bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-500/20 border-indigo-500/20",
    iconBg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400",
    border: "hover:border-indigo-500/30",
    accent: "text-indigo-600 dark:text-indigo-400",
  },
  violet: {
    bg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 dark:bg-violet-500/20 border-violet-500/20",
    iconBg: "bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400",
    border: "hover:border-violet-500/30",
    accent: "text-violet-600 dark:text-violet-400",
  },
  slate: {
    bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 dark:bg-slate-500/20 border-slate-500/20",
    iconBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    border: "hover:border-slate-500/30",
    accent: "text-slate-900 dark:text-slate-100",
  },
};

export function StatCard({
  title,
  amount,
  icon: Icon,
  trend,
  subtitle,
  formula,
  badge,
  colorScheme = "slate",
  isRawString = false,
  className,
}: StatCardProps) {
  const styles = colorStyles[colorScheme] || colorStyles.slate;
  const displayAmount = isRawString ? amount : typeof amount === "number" ? formatINR(amount) : amount;

  return (
    <div
      className={cn(
        "relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all duration-200 hover:shadow-md card-hover",
        styles.border,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {displayAmount}
            </h3>
            {badge && (
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", styles.bg)}>
                {badge}
              </span>
            )}
          </div>
        </div>
        {Icon && (
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl p-2.5 shadow-xs", styles.iconBg)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {formula && (
        <div className="mt-3 flex items-center gap-1.5 rounded-md bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
          <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {formula}
          </span>
        </div>
      )}

      {(trend || subtitle) && !formula && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "flex items-center gap-0.5 font-semibold",
                  trend.isPositive ?? trend.value >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {(trend.isPositive ?? trend.value >= 0) ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {Math.abs(trend.value)}%
              </span>
              <span>{trend.label || "vs last month"}</span>
            </div>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
