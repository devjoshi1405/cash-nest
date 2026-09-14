"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddExpenseModal } from "@/components/forms/AddExpenseModal";
import { ExpenseCategoryDonutChart } from "@/components/charts/ExpenseCategoryDonutChart";
import { formatDate } from "@/lib/date";
import {
  mockHomeExpenseItems,
  mockHomeExpenseSummary,
  mockExpenseCategoryDistributions,
} from "@/data/home/expenses";
import { HomeExpenseItem } from "@/types/home";
import { TrendingDown, Calendar, Flame, Layers, Plus } from "lucide-react";

export default function HomeExpensesPage() {
  const [expenseList, setExpenseList] = useState<HomeExpenseItem[]>(mockHomeExpenseItems);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddExpense = (newExp: HomeExpenseItem) => {
    setExpenseList((prev) => [newExp, ...prev]);
  };

  const totalExpenses = expenseList.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Tracking"
        description="Categorize and optimize household spending, monthly bills, and daily living costs."
        badge="🏠 Home Workspace"
      >
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Monthly Expenses"
          amount={totalExpenses || mockHomeExpenseSummary.totalMonthlyExpenses}
          icon={TrendingDown}
          colorScheme="rose"
          trend={{
            value: mockHomeExpenseSummary.growthPercentage,
            isPositive: false,
            label: "vs last month",
          }}
        />

        <StatCard
          title="Daily Spending Average"
          amount={mockHomeExpenseSummary.dailyAverage}
          icon={Calendar}
          colorScheme="amber"
          subtitle="Based on 30 days"
        />

        <StatCard
          title="Highest Expense Category"
          amount={mockHomeExpenseSummary.highestCategory}
          isRawString
          icon={Flame}
          colorScheme="violet"
          subtitle="Kitchen & Bike EMI"
        />

        <StatCard
          title="Previous Month Spend"
          amount={mockHomeExpenseSummary.previousMonthExpenses}
          icon={Layers}
          colorScheme="slate"
          subtitle="August 2026 Total"
        />
      </div>

      {/* Expense Categories Chart */}
      <ChartCard
        title="Expense Distribution by Category"
        subtitle="Visual share of monthly household allocations"
      >
        <ExpenseCategoryDonutChart data={mockExpenseCategoryDistributions} />
      </ChartCard>

      {/* Expense History Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Expense Records
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Itemized expenses and payment methods
            </p>
          </div>
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
            {expenseList.length} Expenses
          </span>
        </div>

        {expenseList.length === 0 ? (
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
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddExpense}
      />
    </div>
  );
}
