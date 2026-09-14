"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddShopExpenseModal } from "@/components/forms/AddShopExpenseModal";
import { ExpenseCategoryDonutChart } from "@/components/charts/ExpenseCategoryDonutChart";
import { formatDate } from "@/lib/date";
import {
  mockShopExpenses,
  mockShopExpenseSummary,
  mockShopExpenseCategoryDistributions,
} from "@/data/shop/expenses";
import { ShopExpense } from "@/types/shop";
import { TrendingDown, Calendar, Building2, Plus, Sparkles } from "lucide-react";

export default function ShopExpensesPage() {
  const [expenses, setExpenses] = useState<ShopExpense[]>(mockShopExpenses);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddExpenseSuccess = (newExp: ShopExpense) => {
    setExpenses((prev) => [newExp, ...prev]);
  };

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shop Operating Expenses"
        description="Monitor premise rent, helper wages, commercial electricity, freezer maintenance, and packaging costs."
        badge="🏪 Pan Shop Workspace"
      >
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Shop Expense
        </button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Expenses This Month"
          amount={totalExpenses || mockShopExpenseSummary.totalExpensesThisMonth}
          icon={TrendingDown}
          colorScheme="rose"
          subtitle="Fixed & variable shop overheads"
        />

        <StatCard
          title="Most Expensive Category"
          amount={mockShopExpenseSummary.mostExpensiveCategory}
          isRawString
          icon={Building2}
          colorScheme="violet"
          subtitle="Premise lease"
        />

        <StatCard
          title="Daily Average Expense"
          amount={mockShopExpenseSummary.dailyAverage}
          icon={Calendar}
          colorScheme="amber"
          subtitle="Over current 30-day cycle"
        />
      </div>

      {/* Expense Category Donut Chart */}
      <ChartCard
        title="Shop Overhead Distribution"
        subtitle="Breakdown of fixed rent, electricity, helper wages and supplies"
      >
        <ExpenseCategoryDonutChart data={mockShopExpenseCategoryDistributions as any} />
      </ChartCard>

      {/* Expense History Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Operating Expense Log
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Itemized operating costs and maintenance payments
            </p>
          </div>
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
            {expenses.length} Records
          </span>
        </div>

        {expenses.length === 0 ? (
          <EmptyState
            title="No shop expenses logged"
            description="Record your shop rent, helper wages, packaging or electricity bills."
            icon={TrendingDown}
            actionLabel="Add Shop Expense"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Expense Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(exp.date)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {exp.title}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-semibold text-[11px] border border-rose-200 dark:border-rose-800/60">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {exp.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs">
                      {exp.notes || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <CurrencyDisplay
                        amount={exp.amount}
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

      {/* Add Shop Expense Modal */}
      <AddShopExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddExpenseSuccess}
      />
    </div>
  );
}
