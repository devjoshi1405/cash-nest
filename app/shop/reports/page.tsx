"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { DailySalesLineChart } from "@/components/charts/DailySalesLineChart";
import { CashVsOnlineDonutChart } from "@/components/charts/CashVsOnlineDonutChart";
import { MonthlyRevenueBarChart } from "@/components/charts/MonthlyRevenueBarChart";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { formatINR } from "@/lib/currency";
import {
  getShopSalesReportData,
  ShopSalesReportData,
} from "@/lib/data/shop/reports";
import { getAuthenticatedShopWorkspace } from "@/lib/data/shop/workspace";
import {
  FileSpreadsheet,
  FileText,
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
  Lock,
  RefreshCw,
  ShoppingBag,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DATE_RANGE_OPTIONS = [
  { label: "This Month", value: "this-month" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "this-week" },
  { label: "Last Month", value: "last-month" },
  { label: "Last 3 Months", value: "last-3-months" },
  { label: "Last 6 Months", value: "last-6-months" },
  { label: "This Year", value: "this-year" },
  { label: "Custom Range", value: "custom" },
];

export default function ShopReportsPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dateRange, setDateRange] = useState("this-month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [reportData, setReportData] = useState<ShopSalesReportData>({
    totalSales: 0,
    totalCash: 0,
    totalUpi: 0,
    totalCard: 0,
    totalOther: 0,
    totalOnline: 0,
    upiDigitalPercentage: 0,
    averageDailySales: 0,
    recordedDays: 0,
    bestSalesDay: null,
    salesTrend: [],
    paymentSplit: [],
    monthlyRevenueTrend: [],
    hasData: false,
  });

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

      const data = await getShopSalesReportData(
        targetWsId,
        dateRange,
        dateRange === "custom"
          ? { startDate: customStartDate, endDate: customEndDate }
          : undefined
      );

      setReportData(data);
    } catch (err) {
      console.error("Failed to load shop sales reports:", err);
      toast.error("Unable to load shop sales reports.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId, dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleExportCSV = () => {
    toast.info("Exporting CSV will be enabled in a future release.");
  };

  const handleExportPDF = () => {
    toast.info("Exporting PDF statements will be enabled in a future release.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pan Shop Reports & Analytics"
        description="Comprehensive analytics of counter revenue, cash vs digital QR adoption, daily sales velocity, and historical performance."
        badge="🏪 Pan Shop Workspace"
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Selector */}
          <div className="relative inline-flex items-center">
            <Calendar className="absolute left-3 h-4 w-4 pointer-events-none text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-8 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-xs"
            >
              {DATE_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              ▼
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Analytics"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Export CSV
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-rose-600" /> Export PDF
          </button>
        </div>
      </PageHeader>

      {/* Custom Date Range Toolbar */}
      {dateRange === "custom" && (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">From Date:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">To Date:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* KPI Highlights */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Period Revenue"
            amount={reportData.totalSales}
            icon={DollarSign}
            colorScheme="amber"
            subtitle={`${reportData.recordedDays} active business days`}
          />

          <StatCard
            title="Digital UPI Adoption"
            amount={`${reportData.upiDigitalPercentage}%`}
            isRawString
            icon={TrendingUp}
            colorScheme="blue"
            subtitle={`UPI QR & POS Collections: ${formatINR(reportData.totalOnline)}`}
          />

          <StatCard
            title="Average Daily Sales"
            amount={reportData.averageDailySales}
            icon={Coins}
            colorScheme="emerald"
            subtitle="Per open / recorded day"
          />

          <StatCard
            title="Best Sales Day"
            amount={reportData.bestSalesDay ? reportData.bestSalesDay.amount : 0}
            icon={ShoppingBag}
            colorScheme="violet"
            subtitle={
              reportData.bestSalesDay
                ? reportData.bestSalesDay.formattedDate
                : "No sales recorded in period"
            }
          />
        </div>
      )}

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Line */}
        <ChartCard
          title="Daily Sales Velocity"
          subtitle="Sales progression across cash and digital channels for the period"
        >
          {reportData.salesTrend.length === 0 ? (
            <div className="w-full h-72 flex items-center justify-center text-xs text-slate-400">
              No daily sales recorded for this period.
            </div>
          ) : (
            <DailySalesLineChart data={reportData.salesTrend} />
          )}
        </ChartCard>

        {/* Cash vs UPI Ratio */}
        <ChartCard
          title="Collection Channel Breakdown"
          subtitle="Percentage share of cash drawer vs online QR and POS card payments"
        >
          {reportData.paymentSplit.every((p) => p.value === 0) ? (
            <div className="w-full h-72 flex items-center justify-center text-xs text-slate-400">
              No payment breakdown data available.
            </div>
          ) : (
            <CashVsOnlineDonutChart data={reportData.paymentSplit} />
          )}
        </ChartCard>

        {/* Revenue vs Purchases */}
        <ChartCard
          title="Revenue Trajectory (6 Months)"
          subtitle="Monthly cash collections (Purchases will connect in Phase 7)"
        >
          <MonthlyRevenueBarChart data={reportData.monthlyRevenueTrend} />
        </ChartCard>

        {/* Profit Trajectory Placeholder */}
        <ChartCard
          title="Net Profit & Cost Margins"
          subtitle="Gross margin vs operating net earnings"
        >
          <div className="w-full h-72 flex flex-col items-center justify-center p-6 text-center rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                Profit & Loss Analytics Available in Phase 8
              </p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Net profit margins require integration of purchase invoices (COGS) and recurring shop operating expenses (rent, electricity, labor).
              </p>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              Coming in Phase 6 (Expenses) & Phase 8 (P&L)
            </span>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
