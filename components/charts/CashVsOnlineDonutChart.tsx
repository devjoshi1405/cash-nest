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

export interface SplitItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export function CashVsOnlineDonutChart({ data }: { data: SplitItem[] }) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
          <p className="font-semibold text-emerald-600 dark:text-emerald-400">
            {formatINR(item.value)} ({item.percentage}%)
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
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-semibold uppercase text-slate-400">
            Total Revenue
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {formatINR(total, { compact: true })}
          </span>
        </div>
      </div>

      {/* Side Legend */}
      <div className="w-full sm:w-2/5 pl-2 space-y-2 text-xs">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {item.name}
              </span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
