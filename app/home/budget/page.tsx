"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AddBudgetModal } from "@/components/forms/AddBudgetModal";
import { EditBudgetModal } from "@/components/forms/EditBudgetModal";
import { formatINR } from "@/lib/currency";
import { BudgetRecord, BudgetStatus, BudgetSummary } from "@/types/home";
import {
  getBudgets,
  deleteBudget,
  calculateBudgetUsage,
  calculateBudgetStatus,
  normalizeBudgetMonth,
} from "@/lib/data/home/budgets";
import { getAuthenticatedHomeWorkspace } from "@/lib/data/home/workspace";
import {
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function HomeBudgetPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Month state (e.g., "2026-09")
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetRecord | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<BudgetRecord | null>(null);

  // Load budgets for selected month
  const loadBudgetsData = useCallback(
    async (monthStr: string) => {
      try {
        const authWs = await getAuthenticatedHomeWorkspace();
        if (!authWs) {
          setLoading(false);
          return;
        }
        setWorkspaceId(authWs.workspaceId);

        const records = await getBudgets({
          workspaceId: authWs.workspaceId,
          month: monthStr,
        });

        setBudgets(records);
      } catch (err) {
        console.error("Error loading budgets:", err);
        toast.error("Failed to load budgets from Supabase.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    setLoading(true);
    loadBudgetsData(selectedMonth);
  }, [selectedMonth, loadBudgetsData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBudgetsData(selectedMonth);
  };

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(newMonth);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(current);
  };

  // Summary Metrics
  const summary: BudgetSummary = useMemo(() => {
    const totalBudget = budgets.reduce((acc, b) => acc + b.allocatedAmount, 0);
    const totalSpent = budgets.reduce((acc, b) => acc + b.spentAmount, 0);
    const totalRemaining = Math.round((totalBudget - totalSpent) * 100) / 100;
    const overallPercentage = calculateBudgetUsage(totalBudget, totalSpent);
    const overallStatus = calculateBudgetStatus(totalBudget, totalSpent);

    const categoriesExceededCount = budgets.filter((b) => b.status === "Exceeded").length;
    const categoriesNearLimitCount = budgets.filter((b) => b.status === "Near Limit").length;
    const categoriesSafeCount = budgets.filter((b) => b.status === "Safe").length;

    return {
      totalBudget: Math.round(totalBudget),
      totalSpent: Math.round(totalSpent),
      totalRemaining,
      overallPercentage,
      overallStatus,
      categoriesCount: budgets.length,
      categoriesExceededCount,
      categoriesNearLimitCount,
      categoriesSafeCount,
    };
  }, [budgets]);

  // Handle Add Budget Success
  const handleAddBudgetSuccess = (newBudget: BudgetRecord) => {
    loadBudgetsData(selectedMonth);
  };

  // Handle Edit Budget Success
  const handleEditBudgetSuccess = (updatedBudget: BudgetRecord) => {
    setBudgets((prev) =>
      prev.map((b) => (b.id === updatedBudget.id ? updatedBudget : b))
    );
    setEditingBudget(null);
  };

  // Handle Delete Budget Confirm
  const handleDeleteBudgetConfirm = async () => {
    if (!deletingBudget) return;
    try {
      const result = await deleteBudget(deletingBudget.id);
      if (!result.success) {
        toast.error(result.error || "Failed to delete budget.");
        return;
      }

      setBudgets((prev) => prev.filter((b) => b.id !== deletingBudget.id));
      toast.success(`Budget for "${deletingBudget.category}" deleted.`);
      setDeletingBudget(null);
    } catch {
      toast.error("Failed to delete budget.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Budgets"
        description="Set category spending limits, track progress against caps, and prevent overspending."
        badge="🏠 Home Workspace"
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector & Controls */}
          <div className="flex items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 shadow-xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent px-2 py-1 text-xs font-bold text-slate-900 dark:text-white cursor-pointer focus:outline-none"
            />

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              title="Next Month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleCurrentMonth}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-xs transition-all"
          >
            Current Month
          </button>

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
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create Budget
          </button>
        </div>
      </PageHeader>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Monthly Budget"
          amount={summary.totalBudget}
          icon={PiggyBank}
          colorScheme="blue"
          subtitle={`${summary.categoriesCount} configured categories`}
        />

        <StatCard
          title="Total Amount Spent"
          amount={summary.totalSpent}
          icon={AlertTriangle}
          colorScheme={summary.overallStatus === "Exceeded" ? "rose" : summary.overallStatus === "Near Limit" ? "amber" : "slate"}
          subtitle={`${summary.overallPercentage}% of total allocated cap`}
        />

        <StatCard
          title="Remaining Budget Pool"
          amount={summary.totalRemaining}
          icon={CheckCircle2}
          colorScheme={summary.totalRemaining < 0 ? "rose" : "emerald"}
          subtitle={
            summary.totalRemaining < 0
              ? "Over budget across pool"
              : "Available for rest of month"
          }
        />

        <StatCard
          title="Categories Status"
          amount={
            summary.categoriesExceededCount > 0
              ? `${summary.categoriesExceededCount} Exceeded`
              : summary.categoriesNearLimitCount > 0
              ? `${summary.categoriesNearLimitCount} Near Limit`
              : "All Safe"
          }
          isRawString
          icon={Flame}
          colorScheme={
            summary.categoriesExceededCount > 0
              ? "rose"
              : summary.categoriesNearLimitCount > 0
              ? "amber"
              : "emerald"
          }
          subtitle={`${summary.categoriesSafeCount} safe, ${summary.categoriesNearLimitCount} warning`}
        />
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm animate-pulse space-y-4"
            >
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
              <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-full" />
              <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        /* Budget Category Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {budgets.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="No budgets set for this month"
                description="Set category budgets to keep your household spending strictly under control."
                icon={PiggyBank}
                actionLabel="Create Category Budget"
                onAction={() => setIsAddModalOpen(true)}
              />
            </div>
          ) : (
            budgets.map((b) => {
              const percentageVal = b.percentage ?? 0;
              const visualWidth = Math.min(100, Math.max(0, percentageVal));
              const isOver = b.remainingAmount < 0;

              let barColor = "bg-emerald-500";
              if (b.status === "Exceeded") {
                barColor = "bg-rose-500";
              } else if (b.status === "Near Limit") {
                barColor = "bg-amber-500";
              }

              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 card-hover flex flex-col justify-between"
                >
                  <div>
                    {/* Header with Category Icon, Name, and Quick Edit/Delete */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-lg">
                          {b.categoryIcon || "🏷️"}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white">
                            {b.category}
                          </h4>
                          <span className="text-[11px] text-slate-400">{b.month}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={b.status} />
                        <button
                          type="button"
                          onClick={() => setEditingBudget(b)}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                          title="Edit Budget Cap"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingBudget(b)}
                          className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                          title="Delete Budget"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Percentage */}
                    <div className="mt-5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          Budget Utilization
                        </span>
                        <span
                          className={cn(
                            "font-bold",
                            b.status === "Exceeded"
                              ? "text-rose-600 dark:text-rose-400"
                              : b.status === "Near Limit"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {b.percentage}%
                        </span>
                      </div>

                      <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-300", barColor)}
                          style={{ width: `${visualWidth}%` }}
                        />
                      </div>
                    </div>

                    {/* Financial Matrix */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">
                          Budget Cap
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {formatINR(b.allocatedAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">
                          Spent
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {formatINR(b.spentAmount)}
                        </span>
                      </div>
                      <div>
                        <span
                          className={cn(
                            "text-[10px] block uppercase",
                            isOver ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {isOver ? "Over Budget" : "Remaining"}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-bold",
                            isOver ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {formatINR(Math.abs(b.remainingAmount))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer dynamic advice */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    {b.status === "Exceeded" ? (
                      <span className="text-rose-600 dark:text-rose-400 font-medium">
                        ⚠️ Over budget by {formatINR(Math.abs(b.remainingAmount))}!
                      </span>
                    ) : b.status === "Near Limit" ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        ⚠️ Approaching limit: {formatINR(b.remainingAmount)} left
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Spending is safe ({formatINR(b.remainingAmount)} buffer remaining)
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Budget Modal */}
      <AddBudgetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        workspaceId={workspaceId}
        defaultMonth={selectedMonth}
        onSuccess={handleAddBudgetSuccess}
      />

      {/* Edit Budget Modal */}
      {editingBudget && (
        <EditBudgetModal
          isOpen={!!editingBudget}
          onClose={() => setEditingBudget(null)}
          budget={editingBudget}
          onSuccess={handleEditBudgetSuccess}
        />
      )}

      {/* Delete Budget Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deletingBudget}
        onClose={() => setDeletingBudget(null)}
        onConfirm={handleDeleteBudgetConfirm}
        title="Delete Category Budget"
        message={`Are you sure you want to remove the ${deletingBudget?.category} budget for ${deletingBudget?.month}? Note: Your logged expense transactions will remain unaffected.`}
        confirmLabel="Delete Budget"
        isDestructive={true}
      />
    </div>
  );
}
