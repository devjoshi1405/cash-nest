"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddBudgetModal } from "@/components/forms/AddBudgetModal";
import { formatINR } from "@/lib/currency";
import { mockHomeBudgets } from "@/data/home/budget";
import { BudgetRecord, BudgetStatus } from "@/types/home";
import {
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Plus,
  Utensils,
  Fuel,
  ShoppingBag,
  Film,
  Receipt,
  HeartPulse,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

const categoryIconMap: Record<string, any> = {
  Kitchen: Utensils,
  Petrol: Fuel,
  Shopping: ShoppingBag,
  Entertainment: Film,
  Bills: Receipt,
  Medical: HeartPulse,
};

export default function HomeBudgetPage() {
  const [budgets, setBudgets] = useState<BudgetRecord[]>(mockHomeBudgets);
  const [selectedMonth, setSelectedMonth] = useState("2026-09");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddBudget = (newBudget: BudgetRecord) => {
    setBudgets((prev) => [newBudget, ...prev]);
  };

  const totalAllocated = budgets.reduce((acc, curr) => acc + curr.allocatedAmount, 0);
  const totalSpent = budgets.reduce((acc, curr) => acc + curr.spentAmount, 0);
  const totalRemaining = totalAllocated - totalSpent;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Budgets"
        description="Set category spending limits, track progress against caps, and prevent overspending."
        badge="🏠 Home Workspace"
      >
        <div className="flex items-center gap-2">
          {/* Month Selector */}
          <div className="relative">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer shadow-xs focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Budget
          </button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Monthly Budget"
          amount={totalAllocated}
          icon={PiggyBank}
          colorScheme="blue"
          subtitle={`${budgets.length} tracked categories`}
        />

        <StatCard
          title="Total Amount Spent"
          amount={totalSpent}
          icon={AlertTriangle}
          colorScheme="rose"
          subtitle={`${Math.round((totalSpent / (totalAllocated || 1)) * 100)}% of total cap`}
        />

        <StatCard
          title="Remaining Budget Pool"
          amount={totalRemaining}
          icon={CheckCircle2}
          colorScheme="emerald"
          subtitle="Available for rest of month"
        />
      </div>

      {/* Budget Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {budgets.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              title="No budgets configured"
              description="Define category spending caps to monitor your budget adherence."
              icon={PiggyBank}
              actionLabel="Add Category Budget"
              onAction={() => setIsAddModalOpen(true)}
            />
          </div>
        ) : (
          budgets.map((b) => {
            const Icon = categoryIconMap[b.category] || Package;
            const percentage = Math.round((b.spentAmount / (b.allocatedAmount || 1)) * 100);

            let status: BudgetStatus = "Safe";
            let barColor = "bg-emerald-500";
            if (percentage >= 100) {
              status = "Exceeded";
              barColor = "bg-rose-500";
            } else if (percentage >= 80) {
              status = "Near Limit";
              barColor = "bg-amber-500";
            }

            return (
              <div
                key={b.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 card-hover flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {b.category}
                        </h4>
                        <span className="text-[11px] text-slate-400">{b.month}</span>
                      </div>
                    </div>
                    <StatusBadge status={status} />
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
                          status === "Exceeded"
                            ? "text-rose-600 dark:text-rose-400"
                            : status === "Near Limit"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {percentage}%
                      </span>
                    </div>

                    <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-300", barColor)}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Budget
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
                          b.remainingAmount < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        Remaining
                      </span>
                      <span
                        className={cn(
                          "text-xs font-bold",
                          b.remainingAmount < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {formatINR(b.remainingAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer advice */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                  {status === "Exceeded" ? (
                    <span className="text-rose-500 font-medium">
                      ⚠️ Over budget by {formatINR(Math.abs(b.remainingAmount))}!
                    </span>
                  ) : status === "Near Limit" ? (
                    <span className="text-amber-500 font-medium">
                      ⚠️ Approaching cap: {formatINR(b.remainingAmount)} left
                    </span>
                  ) : (
                    <span className="text-emerald-500 font-medium">
                      ✓ Spending is on track ({formatINR(b.remainingAmount)} safe)
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Budget Modal */}
      <AddBudgetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddBudget}
      />
    </div>
  );
}
