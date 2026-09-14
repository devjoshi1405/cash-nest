import React from "react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDropdownProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  icon?: React.ReactNode;
  className?: string;
}

export function FilterDropdown({
  label,
  value,
  onChange,
  options,
  icon,
  className,
}: FilterDropdownProps) {
  return (
    <div className={cn("relative inline-flex items-center", className)}>
      {icon && <span className="absolute left-3 pointer-events-none text-slate-400">{icon}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 text-sm text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-700 cursor-pointer pr-8",
          icon ? "pl-9" : "pl-3"
        )}
      >
        {label && <option value="all">All {label}</option>}
        {options.map((opt) => (
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
