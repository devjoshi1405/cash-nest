"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddExpenseModal } from "@/components/forms/AddExpenseModal";
import { ExpenseCategoryDonutChart } from "@/components/charts/ExpenseCategoryDonutChart";
import { SkeletonCard, SkeletonTable } from "@/components/shared/SkeletonCard";
import { formatDate, getCurrentMonthDateRange, getPreviousMonthDateRange } from "@/lib/date";
import { HomeExpenseItem, ExpenseCategoryDistribution } from "@/types/home";
import { getHomeTransactions } from "@/lib/data/home/transactions";
import { getAuthenticatedHomeWorkspace } from "@/lib/data/home/workspace";
import { TrendingDown, Calendar, Flame, Layers, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS = [
  "#10B981", "#6366F1", "#EC4899", "#F59E0B", "#8B5CF6",
  "#EF4444", "#06B6D4", "#64748B", "#14B8A6", "#F97316", "#3B82F6", "#84CC16",
];

export default function HomeExpensesPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expenseList, setExpenseList] = useState<HomeExpenseItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalThisMonth: 0,
    dailyAverage: 0,
    highestCategory: "None",
    totalPrevMonth: 0,
  });

  const loadExpensesData = useCallback(async () => {
    try {
      let targetWsId = workspaceId;
      if (!targetWsId) {
        const authWs = await getAuthenticatedHomeWorkspace();
        if (!authWs) {
          setLoading(false);
          return;
        }
        targetWsId = authWs.workspaceId;
        setWorkspaceId(targetWsId);
      }

      const currentMonth = getCurrentMonthDateRange();
      const prevMonth = getPreviousMonthDateRange();

      const [currentRes, prevRes] = await Promise.all([
        getHomeTransactions({
          workspaceId: targetWsId,
          type: "expense",
          pageSize: 100,
        }),
        getHomeTransactions({
          workspaceId: targetWsId,
          type: "expense",
          startDate: prevMonth.startDate,
          endDate: prevMonth.endDate,
          pageSize: 100,
        }),
      ]);

      const items: HomeExpenseItem[] = currentRes.transactions.map((t) => ({
        id: t.id,
        title: t.name,
        category: t.category as any,
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        date: t.date,
        notes: t.notes,
      }));

      setExpenseList(items);

      let totalThisMonth = 0;
      const catTotals: Record<string, number> = {};

      for (const item of items) {
        if (item.date >= currentMonth.startDate && item.date <= currentMonth.endDate) {
          totalThisMonth += item.amount;
          catTotals[item.category] = (catTotals[item.category] || 0) + item.amount;
        }
      }

      let highestCat = "None";
      let highestAmt = 0;
      for (const [cat, amt] of Object.entries(catTotals)) {
        if (amt > highestAmt) {
          highestAmt = amt;
          highestCat = cat;
        }
      }

      const now = new Date();
      const daysElapsed = Math.max(1, now.getDate());
      const dailyAverage = Math.round(totalThisMonth / daysElapsed);

      setSummary({
        totalThisMonth: Math.round(totalThisMonth),
        dailyAverage,
        highestCategory: highestCat,
        totalPrevMonth: prevRes.summary?.totalExpense || 0,
      });
    } catch (err) {
      console.error("Error loading expenses data:", err);
      toast.error("Failed to load expense records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadExpensesData();
  }, [loadExpensesData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadExpensesData();
  };

  const handleAddExpenseSuccess = () => {
    loadExpensesData();
  };

  // Category distributions for donut chart
  const categoryDistributions: ExpenseCategoryDistribution[] = useMemo(() => {
    const catMap: Record<string, number> = {};
    let total = 0;

    for (const exp of expenseList) {
      catMap[exp.category] = (catMap[exp.category] || 0) + exp.amount;
      total += exp.amount;
    }

    return Object.entries(catMap)
      .map(([cat, amount], idx) => ({
        category: cat as any,
        amount: Math.round(amount),
        percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenseList]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Tracking"
        description="Categorize and optimize household spending, monthly bills, and daily living costs."
        badge="🏠 Home Workspace"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
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
            title="Total Monthly Expenses"
            amount={summary.totalThisMonth}
            icon={TrendingDown}
            colorScheme="rose"
            subtitle="September 2026 total"
          />

          <StatCard
            title="Daily Spending Average"
            amount={summary.dailyAverage}
            icon={Calendar}
            colorScheme="amber"
            subtitle="Based on current month days"
          />

          <StatCard
            title="Highest Expense Category"
            amount={summary.highestCategory}
            isRawString
            icon={Flame}
            colorScheme="violet"
            subtitle="Top spending allocation"
          />

          <StatCard
            title="Previous Month Spend"
            amount={summary.totalPrevMonth}
            icon={Layers}
            colorScheme="slate"
            subtitle="Prior month total"
          />
        </div>
      )}

      {/* Expense Categories Chart */}
      {categoryDistributions.length > 0 && (
        <ChartCard
          title="Expense Distribution by Category"
          subtitle="Visual share of recorded household allocations in Supabase"
        >
          <ExpenseCategoryDonutChart data={categoryDistributions} />
        </ChartCard>
      )}

      {/* Expense History Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Expense Records
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Itemized expenses and payment methods in Supabase
            </p>
          </div>
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
            {expenseList.length} Expenses
          </span>
        </div>

        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={6} cols={6} />
          </div>
        ) : expenseList.length === 0 ? (
          <EmptyState
            title="No expenses recorded"
            description="Add your first household, utility, or shopping expense to track spending."
            icon={TrendingDown}
            actionLabel="Add Expense"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {expenseList.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(item.date)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-semibold text-[11px] border border-rose-200 dark:border-rose-800/60">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {item.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs">
                      {item.notes || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <CurrencyDisplay
                        amount={item.amount}
                        type="Expense"
                        colored
                        showSign
                        className="text-sm font-bold"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        workspaceId={workspaceId}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddExpenseSuccess}
      />
    </div>
  );
}

