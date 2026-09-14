import React from "react";
import { formatINR, FormatINROptions } from "@/lib/currency";
import { cn } from "@/lib/utils";

export interface CurrencyDisplayProps extends FormatINROptions {
  amount: number | string | null | undefined;
  type?: "Income" | "Expense" | "neutral";
  colored?: boolean;
  className?: string;
}

export function CurrencyDisplay({
  amount,
  type = "neutral",
  colored = false,
  showSymbol = true,
  decimals = 0,
  compact = false,
  showSign = false,
  className,
}: CurrencyDisplayProps) {
  const num = Number(amount || 0);
  const formatted = formatINR(num, {
    showSymbol,
    decimals,
    compact,
    showSign: showSign || (colored && type !== "neutral"),
  });

  let colorClass = "text-slate-900 dark:text-white";
  if (colored) {
    if (type === "Income" || (type === "neutral" && num > 0 && showSign)) {
      colorClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
    } else if (type === "Expense" || (type === "neutral" && num < 0)) {
      colorClass = "text-rose-600 dark:text-rose-400 font-semibold";
    }
  }

  return <span className={cn("font-medium tracking-tight", colorClass, className)}>{formatted}</span>;
}
