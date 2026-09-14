"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddIncomeModal } from "@/components/forms/AddIncomeModal";
import { SkeletonCard, SkeletonTable } from "@/components/shared/SkeletonCard";
import { formatDate, getCurrentMonthDateRange, getPreviousMonthDateRange } from "@/lib/date";
import { HomeIncomeItem } from "@/types/home";
import { getHomeTransactions } from "@/lib/data/home/transactions";
import { getAuthenticatedHomeWorkspace } from "@/lib/data/home/workspace";
import { Wallet, Briefcase, Sparkles, TrendingUp, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function HomeIncomePage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incomeList, setIncomeList] = useState<HomeIncomeItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalThisMonth: 0,
    salaryThisMonth: 0,
    otherThisMonth: 0,
    totalPrevMonth: 0,
  });

  const loadIncomeData = useCallback(async () => {
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
          type: "income",
          pageSize: 100,
        }),
        getHomeTransactions({
          workspaceId: targetWsId,
          type: "income",
          startDate: prevMonth.startDate,
          endDate: prevMonth.endDate,
          pageSize: 100,
        }),
      ]);

      const items: HomeIncomeItem[] = currentRes.transactions.map((t) => ({
        id: t.id,
        source: t.name,
        category: t.category as any,
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        date: t.date,
        notes: t.notes,
      }));

      setIncomeList(items);

      let totalThisMonth = 0;
      let salaryThisMonth = 0;
      let otherThisMonth = 0;

      for (const item of items) {
        if (item.date >= currentMonth.startDate && item.date <= currentMonth.endDate) {
          totalThisMonth += item.amount;
          if (item.category.toLowerCase().includes("salary")) {
            salaryThisMonth += item.amount;
          } else {
            otherThisMonth += item.amount;
          }
        }
      }

      setSummary({
        totalThisMonth: Math.round(totalThisMonth),
        salaryThisMonth: Math.round(salaryThisMonth),
        otherThisMonth: Math.round(otherThisMonth),
        totalPrevMonth: prevRes.summary?.totalIncome || 0,
      });
    } catch (err) {
      console.error("Error loading income data:", err);
      toast.error("Failed to load income records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadIncomeData();
  }, [loadIncomeData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadIncomeData();
  };

  const handleAddIncomeSuccess = () => {
    loadIncomeData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income & Earnings"
        description="Monitor monthly salary credits, freelance earnings, interest returns, and side incomes."
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
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Income
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
            title="Total Monthly Income"
            amount={summary.totalThisMonth}
            icon={Wallet}
            colorScheme="emerald"
            subtitle="September 2026 earnings"
          />

          <StatCard
            title="Primary Salary"
            amount={summary.salaryThisMonth}
            icon={Briefcase}
            colorScheme="blue"
            subtitle="Fixed paycheck credits"
          />

          <StatCard
            title="Other & Freelance"
            amount={summary.otherThisMonth}
            icon={Sparkles}
            colorScheme="violet"
            subtitle="Side gigs, interest & bonus"
          />

          <StatCard
            title="Previous Month"
            amount={summary.totalPrevMonth}
            icon={TrendingUp}
            colorScheme="slate"
            subtitle="Prior month total"
          />
        </div>
      )}

      {/* Income History Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Income History
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified income receipts and deposits in Supabase
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            {incomeList.length} Entries
          </span>
        </div>

        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={6} cols={6} />
          </div>
        ) : incomeList.length === 0 ? (
          <EmptyState
            title="No income records"
            description="Start recording your salary, freelance, or other earnings."
            icon={Wallet}
            actionLabel="Add Income"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Source / Payer</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {incomeList.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(item.date)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {item.source}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200 dark:border-emerald-800/60">
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
                        type="Income"
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

      {/* Add Income Modal */}
      <AddIncomeModal
        isOpen={isAddModalOpen}
        workspaceId={workspaceId}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddIncomeSuccess}
      />
    </div>
  );
}

