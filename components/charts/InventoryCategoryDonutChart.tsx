"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatINR } from "@/lib/currency";
import { CategoryInventoryValue } from "@/types/inventory";

const DEFAULT_COLORS = [
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#EAB308",
  "#6366F1",
  "#14B8A6",
  "#64748B",
];

export function InventoryCategoryDonutChart({
  data,
}: {
  data: CategoryInventoryValue[];
}) {
  const totalValuation = data.reduce((acc, curr) => acc + curr.inventoryValue, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: CategoryInventoryValue = payload[0].payload;
      return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-900 dark:text-white">{item.category}</p>
          <p className="font-semibold text-amber-600 dark:text-amber-400">
            {formatINR(item.inventoryValue)} ({item.percentage}%)
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {item.productCount} product{item.productCount !== 1 ? "s" : ""} · {item.totalStockUnits} units in stock
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
              dataKey="inventoryValue"
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
            Stock Value
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {formatINR(totalValuation, { compact: true })}
          </span>
        </div>
      </div>

      {/* Side Legend */}
      <div className="w-full sm:w-2/5 max-h-56 overflow-y-auto pl-2 space-y-1.5 text-xs">
        {data.map((item, idx) => (
          <div key={item.category} className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
                }}
              />
              <span className="text-slate-600 dark:text-slate-300 truncate font-medium">
                {item.category}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatINR(item.inventoryValue, { compact: true })}
              </span>
              <span className="text-[10px] text-slate-400 ml-1">
                ({item.percentage}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
