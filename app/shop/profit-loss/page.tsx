"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { ProfitTrendChart } from "@/components/charts/ProfitTrendChart";
import { mockProfitLossSummaries, mockProfitTrend } from "@/data/shop/profit-loss";
import { formatINR } from "@/lib/currency";
import {
  LineChart,
  DollarSign,
  TrendingDown,
  Percent,
  Calculator,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ShopProfitLossPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");

  const summary = mockProfitLossSummaries[period] || mockProfitLossSummaries.monthly;
  const grossMargin = Math.round((summary.grossProfit / (summary.revenue || 1)) * 100);
  const netMargin = Math.round((summary.netProfit / (summary.revenue || 1)) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit & Loss Statement"
        description="Analyze gross profitability based on Cost of Goods Sold (COGS) and final net earnings after operating expenses."
        badge="🏪 Pan Shop Workspace"
      >
        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all capitalize cursor-pointer",
                period === p
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Architecture Notice Banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 p-4 flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
          <Info className="h-4 w-4" />
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <p className="font-bold text-slate-900 dark:text-white">
            Standard Financial Accounting Principle Applied
          </p>
          <p>
            Profit in CashNest is calculated using <strong>Cost of Goods Sold (COGS)</strong> rather
            than bulk stock purchase outflows. This ensures purchasing excess inventory does not falsely
            depress your true operational profit.
          </p>
        </div>
      </div>

      {/* 5 Core Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Revenue"
          amount={summary.revenue}
          icon={DollarSign}
          colorScheme="emerald"
          subtitle={`${period} gross retail sales`}
        />

        <StatCard
          title="Cost of Goods (COGS)"
          amount={summary.cogs}
          icon={TrendingDown}
          colorScheme="amber"
          subtitle="Wholesale product cost"
        />

        <StatCard
          title="Gross Profit"
          amount={summary.grossProfit}
          icon={Percent}
          colorScheme="blue"
          badge={`${grossMargin}% Margin`}
          formula="Revenue - COGS = Gross Profit"
        />

        <StatCard
          title="Shop Operating Expenses"
          amount={summary.shopExpenses}
          icon={TrendingDown}
          colorScheme="rose"
          subtitle="Rent, power, wages & SIM"
        />

        <StatCard
          title="Final Net Profit"
          amount={summary.netProfit}
          icon={LineChart}
          colorScheme="indigo"
          badge={`${netMargin}% Net`}
          formula="Gross Profit - Expenses = Net Profit"
        />
      </div>

      {/* Visual Step-by-Step Profit Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="h-4 w-4 text-emerald-600" />
              Step 1: Gross Profit Equation
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {grossMargin}% Gross Margin
            </span>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-600 dark:text-slate-300">Total Counter Revenue (+)</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {formatINR(summary.revenue)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-rose-600 dark:text-rose-400">Cost of Goods Sold (COGS) (-)</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                - {formatINR(summary.cogs)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
              <span className="font-bold text-emerald-900 dark:text-emerald-200">
                Gross Profit (=)
              </span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-lg">
                {formatINR(summary.grossProfit)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="h-4 w-4 text-indigo-600" />
              Step 2: Net Profit Equation
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {netMargin}% Net Margin
            </span>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-600 dark:text-slate-300">Gross Profit Brought Forward (+)</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {formatINR(summary.grossProfit)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-rose-600 dark:text-rose-400">Total Operating Expenses (-)</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                - {formatINR(summary.shopExpenses)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
              <span className="font-bold text-indigo-900 dark:text-indigo-200">
                Net Take-Home Profit (=)
              </span>
              <span className="font-extrabold text-indigo-700 dark:text-indigo-300 text-lg">
                {formatINR(summary.netProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profit Trajectory Chart */}
      <ChartCard
        title="Profitability Trajectory Across Months"
        subtitle="Gross profit margin vs final net profit trend for 2026"
      >
        <ProfitTrendChart data={mockProfitTrend} />
      </ChartCard>
    </div>
  );
}
