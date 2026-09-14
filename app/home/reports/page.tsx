"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { DateFilter } from "@/components/shared/DateFilter";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { IncomeExpenseBarChart } from "@/components/charts/IncomeExpenseBarChart";
import { ExpenseCategoryDonutChart } from "@/components/charts/ExpenseCategoryDonutChart";
import { MonthlySpendingTrendChart } from "@/components/charts/MonthlySpendingTrendChart";
import { CashVsOnlineDonutChart } from "@/components/charts/CashVsOnlineDonutChart";
import { getHomeReportsData, HomeReportsData } from "@/lib/data/home/reports";
import { getAuthenticatedHomeWorkspace } from "@/lib/data/home/workspace";
import { formatINR } from "@/lib/currency";
import { DateRangeFilter } from "@/types/common";
import {
  FileSpreadsheet,
  FileText,
  TrendingUp,
  CreditCard,
  Flame,
  Calendar,
  RefreshCw,
  PiggyBank,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function HomeReportsPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("this-month");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportsData, setReportsData] = useState<HomeReportsData | null>(null);

  const loadReports = useCallback(async (range: DateRangeFilter) => {
    try {
      const authWs = await getAuthenticatedHomeWorkspace();
      if (!authWs) {
        setLoading(false);
        return;
      }
      setWorkspaceId(authWs.workspaceId);

      const data = await getHomeReportsData(authWs.workspaceId, range);
      setReportsData(data);
    } catch (err) {
      console.error("Error loading reports:", err);
      toast.error("Failed to load reports from Supabase.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports(dateRange);
  }, [dateRange, loadReports]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadReports(dateRange);
  };

  const handleExportCSV = () => {
    toast.info("CSV Export: Transaction & Budget statements will be formatted for export.");
  };

  const handleExportPDF = () => {
    toast.info("PDF Export: A printable statement report will be generated.");
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
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
            title="Refresh Data"
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

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Net Savings Rate"
          amount={`${reportsData?.savingsRate || 0}%`}
          isRawString
          icon={TrendingUp}
          colorScheme="emerald"
          subtitle={`${formatINR(reportsData?.netSavings || 0)} saved on ${formatINR(
            reportsData?.totalIncome || 0
          )}`}
          trend={{
            value: reportsData?.savingsRate || 0,
            isPositive: (reportsData?.netSavings || 0) >= 0,
          }}
        />

        <StatCard
          title="Highest Expense Item"
          amount={
            reportsData?.highestExpenseItem
              ? formatINR(reportsData.highestExpenseItem.amount)
              : "₹0"
          }
          isRawString
          icon={Flame}
          colorScheme="rose"
          subtitle={reportsData?.highestExpenseItem?.name || "No expense items recorded"}
        />

        <StatCard
          title="Average Daily Outflow"
          amount={reportsData?.averageDailyOutflow || 0}
          icon={Calendar}
          colorScheme="amber"
          subtitle="Estimated outflow per day"
        />

        <StatCard
          title="Primary Payment Mode"
          amount={
            reportsData?.primaryPaymentMode.name !== "None"
              ? `${reportsData?.primaryPaymentMode.name} (${reportsData?.primaryPaymentMode.percentage}%)`
              : "None"
          }
          isRawString
          icon={CreditCard}
          colorScheme="blue"
          subtitle="Dominant payment mode"
        />
      </div>

      {/* Budget vs Actual Spending Section (If budgets configured) */}
      {reportsData && reportsData.budgetVsActual.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-emerald-600" />
                Monthly Budget vs. Actual Spending
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Active category allocations vs total realized expenses
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportsData.budgetVsActual.map((item) => {
              const visualWidth = Math.min(100, Math.max(0, item.percentage));
              const isOver = item.remaining < 0;

              return (
                <div
                  key={item.category}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{item.icon || "🏷️"}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.category}
                      </span>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Used</span>
                      <span
                        className={cn(
                          "font-bold",
                          item.status === "Exceeded"
                            ? "text-rose-600 dark:text-rose-400"
                            : item.status === "Near Limit"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {item.percentage}%
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          item.status === "Exceeded"
                            ? "bg-rose-500"
                            : item.status === "Near Limit"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        )}
                        style={{ width: `${visualWidth}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Cap</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatINR(item.budget)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Spent</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatINR(item.spent)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">
                        {isOver ? "Over" : "Left"}
                      </span>
                      <span
                        className={cn(
                          "font-bold",
                          isOver
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {formatINR(Math.abs(item.remaining))}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense Bar */}
        <ChartCard
          title="Income vs Expenses (Monthly)"
          subtitle="6-month cashflow comparison trajectory"
        >
          <IncomeExpenseBarChart
            data={reportsData?.monthlyComparisons || []}
          />
        </ChartCard>

        {/* Expense by Category */}
        <ChartCard
          title="Expense Distribution by Category"
          subtitle="Breakdown of living, utilities, and discretionary spends"
        >
          <ExpenseCategoryDonutChart
            data={reportsData?.expenseCategories || []}
          />
        </ChartCard>

        {/* Daily Spending Trend Area */}
        <ChartCard
          title="Spending Trend Velocity"
          subtitle="Daily expense fluctuations in the active period"
        >
          <MonthlySpendingTrendChart
            data={reportsData?.spendingTrend || []}
          />
        </ChartCard>

        {/* Payment Method Distribution */}
        <ChartCard
          title="Payment Method Share"
          subtitle="Distribution of outflow across digital and cash modes"
        >
          <CashVsOnlineDonutChart
            data={reportsData?.paymentMethods || []}
          />
        </ChartCard>
      </div>
    </div>
  );
}
