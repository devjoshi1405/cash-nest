import React from "react";
import { cn } from "@/lib/utils";

export type BadgeType =
  | "Income"
  | "Expense"
  | "Paid"
  | "Partially Paid"
  | "Partial"
  | "Unpaid"
  | "Pending"
  | "Overdue"
  | "In Stock"
  | "Low Stock"
  | "Out of Stock"
  | "Safe"
  | "Near Limit"
  | "Exceeded"
  | "Cash"
  | "UPI"
  | "Bank"
  | "Credit Card"
  | string;

export interface StatusBadgeProps {
  status: BadgeType;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ status, className, dot = true }: StatusBadgeProps) {
  let badgeStyle = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  let dotColor = "bg-slate-400";

  switch (status) {
    case "Income":
    case "Paid":
    case "In Stock":
    case "Safe":
      badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60";
      dotColor = "bg-emerald-500";
      break;

    case "Partially Paid":
    case "Partial":
    case "Low Stock":
    case "Near Limit":
    case "Pending":
      badgeStyle = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60";
      dotColor = "bg-amber-500";
      break;

    case "Expense":
    case "Unpaid":
    case "Overdue":
    case "Out of Stock":
    case "Exceeded":
      badgeStyle = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60";
      dotColor = "bg-rose-500";
      break;

    case "UPI":
      badgeStyle = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60";
      dotColor = "bg-blue-500";
      break;

    case "Cash":
      badgeStyle = "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/60";
      dotColor = "bg-teal-500";
      break;

    case "Bank":
    case "Credit Card":
      badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60";
      dotColor = "bg-indigo-500";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors",
        badgeStyle,
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />}
      <span>{status}</span>
    </span>
  );
}
