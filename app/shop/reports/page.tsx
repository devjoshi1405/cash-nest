"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { DateFilter } from "@/components/shared/DateFilter";
import { DailySalesLineChart } from "@/components/charts/DailySalesLineChart";
import { CashVsOnlineDonutChart } from "@/components/charts/CashVsOnlineDonutChart";
import { MonthlyRevenueBarChart } from "@/components/charts/MonthlyRevenueBarChart";
import { ProfitTrendChart } from "@/components/charts/ProfitTrendChart";
import {
  mockShopDailySalesTrend,
  mockShopCashVsOnlineSplit,
  mockShopMonthlyRevenueTrend,
} from "@/data/shop/reports";
import { mockProfitTrend } from "@/data/shop/profit-loss";
import { DateRangeFilter } from "@/types/common";
import {
  FileSpreadsheet,
  FileText,
  DollarSign,
  TrendingUp,
  Percent,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export default function ShopReportsPage() {
  const [dateRange, setDateRange] = useState<DateRangeFilter>("this-month");

  const handleExportCSV = () => {
    toast.info("Simulated CSV Export: In Phase 2, this will export sales and profit CSV records.");
  };

  const handleExportPDF = () => {
    toast.info("Simulated PDF Export: In Phase 2, this will export shop financial statements.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pan Shop Reports & Analytics"
        description="Comprehensive analysis of daily counter collections, digital UPI ratios, supplier payables, and net profit margins."
        badge="🏪 Pan Shop Workspace"
      >
        <div className="flex flex-wrap items-center gap-2">
          <DateFilter value={dateRange} onChange={setDateRange} />

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

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Revenue"
          amount={80000}
          icon={DollarSign}
          colorScheme="emerald"
          subtitle="September counter total"
          trend={{ value: 8.2, isPositive: true }}
        />

        <StatCard
          title="Net Profit Margin"
          amount="21.25%"
          isRawString
          icon={Percent}
          colorScheme="indigo"
          subtitle="₹17,000 net take-home"
        />

        <StatCard
          title="UPI Digital Adoption"
          amount="35.8%"
          isRawString
          icon={TrendingUp}
          colorScheme="blue"
          subtitle="Growing digital footfall"
        />

        <StatCard
          title="Outstanding Payables"
          amount={12500}
          icon={Clock}
          colorScheme="rose"
          badge="Supplier Dues"
          subtitle="Across 3 distributors"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Line */}
        <ChartCard
          title="Daily Sales Velocity"
          subtitle="7-day sales progression across cash and UPI"
        >
          <DailySalesLineChart data={mockShopDailySalesTrend} />
        </ChartCard>

        {/* Cash vs UPI Ratio */}
        <ChartCard
          title="Collection Channel Breakdown"
          subtitle="Percentage share of cash vs online QR payments"
        >
          <CashVsOnlineDonutChart data={mockShopCashVsOnlineSplit} />
        </ChartCard>

        {/* Revenue vs Purchases */}
        <ChartCard
          title="Revenue vs Inventory Purchases"
          subtitle="Monthly cash deployed vs sales generated"
        >
          <MonthlyRevenueBarChart data={mockShopMonthlyRevenueTrend} />
        </ChartCard>

        {/* Profit Trajectory */}
        <ChartCard
          title="Profit Margins (Gross vs Net)"
          subtitle="COGS margin and operating net earnings"
        >
          <ProfitTrendChart data={mockProfitTrend} />
        </ChartCard>
      </div>
    </div>
  );
}
