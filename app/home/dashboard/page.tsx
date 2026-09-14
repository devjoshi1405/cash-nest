"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { StatCard } from "@/components/shared/StatCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { ChartCard } from "@/components/shared/ChartCard";
import { formatDate } from "@/lib/date";
import { IncomeExpenseBarChart } from "@/components/charts/IncomeExpenseBarChart";
import { ExpenseCategoryDonutChart } from "@/components/charts/ExpenseCategoryDonutChart";
import { MonthlySpendingTrendChart } from "@/components/charts/MonthlySpendingTrendChart";
import { AddTransactionModal } from "@/components/forms/AddTransactionModal";
import { HomeTransaction } from "@/types/home";
import {
  getHomeDashboardData,
  HomeDashboardData,
} from "@/lib/data/home/dashboard";
import { getAuthenticatedHomeWorkspace } from "@/lib/data/home/workspace";
import { formatINR } from "@/lib/currency";
import {
  Wallet,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function HomeDashboardPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [dashboardData, setDashboardData] = useState<HomeDashboardData | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const authWs = await getAuthenticatedHomeWorkspace();
      if (!authWs) {
        setLoading(false);
        return;
      }
      setWorkspaceId(authWs.workspaceId);

      const data = await getHomeDashboardData(authWs.workspaceId);
      setDashboardData(data);
    } catch (err) {
      console.error("Error loading dashboard:", err);
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleAddTransactionSuccess = (newTx: HomeTransaction) => {
    loadDashboard();
  };

  const recentTransactions = dashboardData?.recentTransactions || [];

  return (
    <div className="space-y-6">
      {/* Page Header with Action Buttons */}
      <PageHeader
        title="Home Finance Dashboard"
        description="Track household budgets, monthly income, daily expenses, and personal cashflow."
        badge="🏠 Home Workspace"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-xs transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Transaction
          </button>
        </div>
      </PageHeader>

      {/* 5 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Income This Month"
          amount={dashboardData?.incomeThisMonth || 0}
          icon={Wallet}
          colorScheme="emerald"
          trend={
            dashboardData
              ? {
                  value: dashboardData.incomeGrowthPct,
                  isPositive: dashboardData.incomeTrendPositive,
                  label: "vs last month",
                }
              : undefined
          }
        />

        <StatCard
          title="Expenses This Month"
          amount={dashboardData?.expensesThisMonth || 0}
          icon={TrendingDown}
          colorScheme="rose"
          trend={
            dashboardData
              ? {
                  value: dashboardData.expensesGrowthPct,
                  isPositive: dashboardData.expensesTrendPositive,
                  label: "vs last month",
                }
              : undefined
          }
        />

        <StatCard
          title="Monthly Savings"
          amount={dashboardData?.monthlySavings || 0}
          icon={PiggyBank}
          colorScheme={
            (dashboardData?.monthlySavings || 0) >= 0 ? "blue" : "rose"
          }
          formula={
            dashboardData
              ? `${formatINR(dashboardData.incomeThisMonth)} - ${formatINR(
                  dashboardData.expensesThisMonth
                )}`
              : undefined
          }
        />

        <Link href="/home/borrow-lend" className="block cursor-pointer">
          <StatCard
            title="Money To Pay (I Owe)"
            amount={dashboardData?.moneyToPay || 0}
            icon={ArrowUpRight}
            colorScheme="amber"
            subtitle={`${dashboardData?.activeBorrowingsCount || 0} active borrowings`}
            badge={
              (dashboardData?.overdueDebtAmount || 0) > 0
                ? "Overdue Warning"
                : undefined
            }
          />
        </Link>

        <Link href="/home/borrow-lend" className="block cursor-pointer">
          <StatCard
            title="Money To Receive"
            amount={dashboardData?.moneyToReceive || 0}
            icon={ArrowDownLeft}
            colorScheme="indigo"
            subtitle={`${dashboardData?.activeLendingsCount || 0} active lendings`}
          />
        </Link>
      </div>

      {/* Monthly Budget Overview Widget (if budgets exist) */}
      {dashboardData && dashboardData.budgetTotal > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Monthly Budget Health
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] font-bold",
                  dashboardData.budgetPercentage >= 100
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                    : dashboardData.budgetPercentage >= 80
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                )}
              >
                {dashboardData.budgetPercentage}% Used
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {formatINR(dashboardData.budgetSpent)} of {formatINR(dashboardData.budgetTotal)} spent
              {dashboardData.budgetRemaining >= 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium ml-1.5">
                  ({formatINR(dashboardData.budgetRemaining)} remaining buffer)
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 font-medium ml-1.5">
                  (Over cap by {formatINR(Math.abs(dashboardData.budgetRemaining))})
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> {dashboardData.budgetSafeCount} safe
              </span>
              {dashboardData.budgetNearLimitCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> {dashboardData.budgetNearLimitCount} near limit
                </span>
              )}
              {dashboardData.budgetExceededCount > 0 && (
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                  <AlertTriangle className="h-3.5 w-3.5" /> {dashboardData.budgetExceededCount} exceeded
                </span>
              )}
            </div>

            <Link
              href="/home/budget"
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              View Budgets <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Dashboard Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expenses Bar Chart */}
        <ChartCard
          title="Income vs Expenses"
          subtitle="Monthly cashflow comparison for 2026"
          className="lg:col-span-2"
        >
          <IncomeExpenseBarChart
            data={dashboardData?.monthlyComparisons || []}
          />
        </ChartCard>

        {/* Expense Categories Donut Chart */}
        <ChartCard
          title="Expense Breakdown"
          subtitle="Distribution by category this month"
        >
          <ExpenseCategoryDonutChart
            data={dashboardData?.expenseCategories || []}
          />
        </ChartCard>
      </div>

      {/* Spending Trend & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Trend Line Chart */}
        <ChartCard
          title="Monthly Spending Trend"
          subtitle="Daily spending pattern across current month"
          className="lg:col-span-1"
        >
          <MonthlySpendingTrendChart
            data={dashboardData?.spendingTrend || []}
          />
        </ChartCard>

        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Transactions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Latest income and expense activities
              </p>
            </div>
            <Link
              href="/home/transactions"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Transaction</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No recent transactions found. Click &quot;Add Transaction&quot; to begin!
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {tx.name}
                        </span>
                        {tx.notes && (
                          <span className="text-[11px] text-slate-400 truncate max-w-xs block">
                            {tx.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={tx.type} />
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-slate-600 dark:text-slate-400 text-xs">
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <CurrencyDisplay
                          amount={tx.amount}
                          type={tx.type}
                          colored
                          showSign
                          className="text-sm font-bold"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddTransactionSuccess}
      />
    </div>
  );
}
