"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { DateFilter } from "@/components/shared/DateFilter";
import { IncomeExpenseBarChart } from "@/components/charts/IncomeExpenseBarChart";
import { ExpenseCategoryDonutChart } from "@/components/charts/ExpenseCategoryDonutChart";
import { MonthlySpendingTrendChart } from "@/components/charts/MonthlySpendingTrendChart";
import { CashVsOnlineDonutChart } from "@/components/charts/CashVsOnlineDonutChart";
import {
  mockHomeMonthlyComparisons,
  mockHomeSpendingTrend,
  mockHomePaymentMethodDistribution,
} from "@/data/home/reports";
import { mockExpenseCategoryDistributions } from "@/data/home/expenses";
import { DateRangeFilter } from "@/types/common";
import {
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  CreditCard,
  Flame,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

export default function HomeReportsPage() {
  const [dateRange, setDateRange] = useState<DateRangeFilter>("this-month");

  const handleExportCSV = () => {
    toast.info("Simulated CSV Export: In Phase 2, this will download your formatted statements.");
  };

  const handleExportPDF = () => {
    toast.info("Simulated PDF Export: In Phase 2, this will generate a printable financial report.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports & Analytics"
        description="Deep dive into your cashflow history, savings rate, category breakdowns, and payment channels."
        badge="🏠 Home Workspace"
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

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Net Savings Rate"
          amount="30.4%"
          isRawString
          icon={TrendingUp}
          colorScheme="emerald"
          subtitle="₹7,600 saved on ₹25,000"
          trend={{ value: 4.2, isPositive: true }}
        />

        <StatCard
          title="Highest Expense Item"
          amount="₹3,200"
          isRawString
          icon={Flame}
          colorScheme="rose"
          subtitle="Two-Wheeler Loan EMI"
        />

        <StatCard
          title="Average Daily Outflow"
          amount={580}
          icon={Calendar}
          colorScheme="amber"
          subtitle="Over current 30-day period"
        />

        <StatCard
          title="Primary Payment Mode"
          amount="UPI (51.1%)"
          isRawString
          icon={CreditCard}
          colorScheme="blue"
          subtitle="GPay / PhonePe / Paytm"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense Bar */}
        <ChartCard
          title="Income vs Expenses (Monthly)"
          subtitle="6-month cashflow comparison trajectory"
        >
          <IncomeExpenseBarChart data={mockHomeMonthlyComparisons} />
        </ChartCard>

        {/* Expense by Category */}
        <ChartCard
          title="Expense Distribution by Category"
          subtitle="Breakdown of living, utilities, and discretionary spends"
        >
          <ExpenseCategoryDonutChart data={mockExpenseCategoryDistributions} />
        </ChartCard>

        {/* Daily Spending Trend Area */}
        <ChartCard
          title="Spending Trend Velocity"
          subtitle="Daily expense fluctuations in the active period"
        >
          <MonthlySpendingTrendChart data={mockHomeSpendingTrend} />
        </ChartCard>

        {/* Payment Method Distribution */}
        <ChartCard
          title="Payment Method Share"
          subtitle="Distribution of outflow across digital and cash modes"
        >
          <CashVsOnlineDonutChart data={mockHomePaymentMethodDistribution} />
        </ChartCard>
      </div>
    </div>
  );
}
