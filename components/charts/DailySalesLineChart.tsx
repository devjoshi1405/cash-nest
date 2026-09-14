"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatINR } from "@/lib/currency";

export interface DailySalesTrendPoint {
  day: string;
  sales: number;
  cash?: number;
  upi?: number;
}

export function DailySalesLineChart({ data }: { data: DailySalesTrendPoint[] }) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xl text-xs space-y-1.5">
          <p className="font-bold text-slate-900 dark:text-white">{label}</p>
          <div className="flex items-center justify-between gap-4 text-amber-600 dark:text-amber-400">
            <span>Total Sales:</span>
            <span className="font-bold">{formatINR(payload[0]?.value)}</span>
          </div>
          {payload[1] && (
            <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
              <span>Cash:</span>
              <span className="font-bold">{formatINR(payload[1]?.value)}</span>
            </div>
          )}
          {payload[2] && (
            <div className="flex items-center justify-between gap-4 text-blue-600 dark:text-blue-400">
              <span>UPI / Online:</span>
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
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b833" />
          <XAxis
            dataKey="day"
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
          <Line
            type="monotone"
            dataKey="sales"
            name="Total Sales"
            stroke="#D97706"
            strokeWidth={3}
            dot={{ r: 4, fill: "#D97706" }}
            activeDot={{ r: 7 }}
          />
          {data[0]?.cash !== undefined && (
            <Line
              type="monotone"
              dataKey="cash"
              name="Cash Sales"
              stroke="#10B981"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          )}
          {data[0]?.upi !== undefined && (
            <Line
              type="monotone"
              dataKey="upi"
              name="UPI QR Sales"
              stroke="#3B82F6"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
