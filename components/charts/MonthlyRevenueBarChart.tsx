"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatINR } from "@/lib/currency";

export interface ShopMonthlyBarData {
  month: string;
  revenue: number;
  purchases?: number;
  expenses?: number;
}

export function MonthlyRevenueBarChart({ data }: { data: ShopMonthlyBarData[] }) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xl text-xs space-y-1.5">
          <p className="font-bold text-slate-900 dark:text-white">{label}</p>
          <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
            <span>Revenue:</span>
            <span className="font-bold">{formatINR(payload[0]?.value)}</span>
          </div>
          {payload[1] && (
            <div className="flex items-center justify-between gap-4 text-amber-600 dark:text-amber-400">
              <span>Purchases:</span>
              <span className="font-bold">{formatINR(payload[1]?.value)}</span>
            </div>
          )}
          {payload[2] && (
            <div className="flex items-center justify-between gap-4 text-rose-600 dark:text-rose-400">
              <span>Expenses:</span>
              <span className="font-bold">{formatINR(payload[2]?.value)}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b833" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: "10px", fontSize: "12px" }}
          />
          <Bar
            dataKey="revenue"
            name="Revenue"
            fill="#10B981"
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
          />
          {data[0]?.purchases !== undefined && (
            <Bar
              dataKey="purchases"
              name="Purchases"
              fill="#F59E0B"
              radius={[6, 6, 0, 0]}
              maxBarSize={28}
            />
          )}
          {data[0]?.expenses !== undefined && (
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill="#F43F5E"
              radius={[6, 6, 0, 0]}
              maxBarSize={28}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
