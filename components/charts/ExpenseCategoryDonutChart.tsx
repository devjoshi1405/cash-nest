"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatINR } from "@/lib/currency";
import { ExpenseCategoryDistribution } from "@/types/home";

const DEFAULT_COLORS = [
  "#10B981",
  "#6366F1",
  "#EC4899",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#06B6D4",
  "#64748B",
  "#14B8A6",
  "#F97316",
];

export function ExpenseCategoryDonutChart({
  data,
}: {
  data: ExpenseCategoryDistribution[];
}) {
  const totalExpense = data.reduce((acc, curr) => acc + curr.amount, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-900 dark:text-white">{item.category}</p>
          <p className="font-semibold text-rose-600 dark:text-rose-400">
            {formatINR(item.amount)} ({item.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72 flex flex-col sm:flex-row items-center justify-center">
      <div className="w-full sm:w-3/5 h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="amount"
              nameKey="category"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-semibold uppercase text-slate-400">
            Total Spent
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {formatINR(totalExpense, { compact: true })}
          </span>
        </div>
      </div>

      {/* Side Legend */}
      <div className="w-full sm:w-2/5 max-h-56 overflow-y-auto pl-2 space-y-1 text-xs">
        {data.map((item, idx) => (
          <div key={item.category} className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
                }}
              />
              <span className="text-slate-600 dark:text-slate-300 truncate">
                {item.category}
              </span>
            </div>
            <span className="font-semibold text-slate-900 dark:text-white shrink-0">
              {formatINR(item.amount, { compact: true })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
