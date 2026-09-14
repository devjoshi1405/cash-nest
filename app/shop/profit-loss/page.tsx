"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { ProfitTrendChart } from "@/components/charts/ProfitTrendChart";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { formatINR } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import {
  getShopProfitLossData,
  ShopProfitLossData,
  ProfitLossPeriod,
} from "@/lib/data/shop/profit-loss";
import { getAuthenticatedShopWorkspace } from "@/lib/data/shop/workspace";
import {
  LineChart,
  DollarSign,
  TrendingDown,
  Percent,
  Calculator,
  RefreshCw,
  Info,
  Calendar,
  Sparkles,
  ArrowRight,
  PlusCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PERIOD_LABELS: Record<ProfitLossPeriod, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
  yearly: "This Year",
};

export default function ShopProfitLossPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [period, setPeriod] = useState<ProfitLossPeriod>("monthly");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ShopProfitLossData | null>(null);

  const loadData = useCallback(async () => {
    try {
      let targetWsId = workspaceId;
      if (!targetWsId) {
        const authWs = await getAuthenticatedShopWorkspace();
        if (!authWs) {
          setLoading(false);
          return;
        }
        targetWsId = authWs.workspaceId;
        setWorkspaceId(targetWsId);
      }

      const res = await getShopProfitLossData(targetWsId, period);
      setData(res);
    } catch (err) {
      console.error("Failed to load shop profit & loss data:", err);
      toast.error("Unable to load profit & loss statement.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const summary = data?.summary || {
    period,
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    shopExpenses: 0,
    netProfit: 0,
  };

  const grossMargin = data?.grossMargin ?? 0;
  const netMargin = data?.netMargin ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit & Loss Statement"
        description="Analyze gross profitability based on Cost of Goods Sold (COGS) and final net earnings after operating expenses."
        badge="🏪 Pan Shop Workspace"
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize cursor-pointer",
                  period === p
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Statement"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </PageHeader>

      {/* Architecture Notice Banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 p-4 flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
          <Info className="h-4 w-4" />
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-slate-900 dark:text-white">
              Standard Financial Accounting Principle Applied
            </p>
            {data?.dateRange && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/60 px-2 py-0.5 rounded-md">
                <Calendar className="h-3 w-3" />
                {formatDate(data.dateRange.startDate)}
                {data.dateRange.startDate !== data.dateRange.endDate && (
                  <> &ndash; {formatDate(data.dateRange.endDate)}</>
                )}
              </span>
            )}
          </div>
          <p>
            Profit in CashNest is calculated using <strong>Cost of Goods Sold (COGS)</strong> rather
            than bulk stock purchase outflows. This ensures purchasing excess inventory does not falsely
            depress your true operational profit.
          </p>
        </div>
      </div>

      {/* 5 Core Financial Metrics Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Revenue"
            amount={summary.revenue}
            icon={DollarSign}
            colorScheme="emerald"
            subtitle={`${PERIOD_LABELS[period]} gross retail sales`}
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
      )}

      {/* Quick Setup / Zero-State Reminder if No Activity */}
      {!loading && !data?.hasData && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                No Sales or Overhead Recorded for {PERIOD_LABELS[period]}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Log your daily cash drawer tally, wholesale stock purchases, or utility expenses to generate live profit calculations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/shop/daily-sales"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add Daily Sales
            </Link>
            <Link
              href="/shop/expenses"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors shadow-xs"
            >
              Add Expense
            </Link>
          </div>
        </div>
      )}

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
        title="Profitability Trajectory Across Recent Months"
        subtitle="Historical trend of Gross Profit vs final Net Profit"
      >
        {data?.profitTrend && data.profitTrend.length > 0 ? (
          <ProfitTrendChart data={data.profitTrend} />
        ) : (
          <div className="w-full h-72 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
            <TrendingUp className="h-8 w-8 text-slate-300 dark:text-slate-700" />
            <p>No historical monthly data recorded yet.</p>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
