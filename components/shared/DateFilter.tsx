import React from "react";
import { Calendar } from "lucide-react";
import { DateRangeFilter } from "@/types/common";
import { cn } from "@/lib/utils";

export interface DateFilterProps {
  value: DateRangeFilter | string;
  onChange: (value: DateRangeFilter) => void;
  className?: string;
}

const dateFilterOptions = [
  { label: "This Month", value: "this-month" },
  { label: "Last Month", value: "last-month" },
  { label: "Last 3 Months", value: "last-3-months" },
  { label: "Last 6 Months", value: "last-6-months" },
  { label: "This Year", value: "this-year" },
];

export function DateFilter({ value, onChange, className }: DateFilterProps) {
  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <Calendar className="absolute left-3 h-4 w-4 pointer-events-none text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DateRangeFilter)}
        className="appearance-none rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-8 py-2 text-sm font-medium text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-700 cursor-pointer"
      >
        {dateFilterOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
        ▼
      </span>
    </div>
  );
}
