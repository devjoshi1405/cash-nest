"use client";

import React, { useState } from "react";
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
import { mockHomeTransactions } from "@/data/home/transactions";
import {
  mockHomeMonthlyComparisons,
  mockHomeSpendingTrend,
} from "@/data/home/reports";
import { mockExpenseCategoryDistributions } from "@/data/home/expenses";
import { HomeTransaction } from "@/types/home";
import {
  Wallet,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function HomeDashboardPage() {
  const [transactions, setTransactions] = useState<HomeTransaction[]>(mockHomeTransactions);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddTransaction = (newTx: HomeTransaction) => {
    setTransactions((prev) => [newTx, ...prev]);
  };

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Header with Action Button */}
      <PageHeader
        title="Home Finance Dashboard"
        description="Track household budgets, monthly income, daily expenses, and personal cashflow."
        badge="🏠 Home Workspace"
      >
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Transaction
        </button>
      </PageHeader>

      {/* 5 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Income This Month"
          amount={25000}
          icon={Wallet}
          colorScheme="emerald"
          trend={{ value: 12.5, isPositive: true, label: "vs last month" }}
        />

        <StatCard
          title="Expenses This Month"
          amount={17400}
          icon={TrendingDown}
          colorScheme="rose"
          trend={{ value: 3.8, isPositive: false, label: "decrease" }}
        />

        <StatCard
          title="Monthly Savings"
          amount={7600}
          icon={PiggyBank}
          colorScheme="blue"
          formula="₹25,000 - ₹17,400 = ₹7,600"
        />

        <StatCard
          title="Money To Pay"
          amount={5000}
          icon={ArrowUpRight}
          colorScheme="amber"
          subtitle="2 active borrowings"
          badge="Due Soon"
        />

        <StatCard
          title="Money To Receive"
          amount={2500}
          icon={ArrowDownLeft}
          colorScheme="indigo"
          subtitle="From 1 person"
        />
      </div>

      {/* Dashboard Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expenses Bar Chart */}
        <ChartCard
          title="Income vs Expenses"
          subtitle="Monthly cashflow comparison for 2026"
          className="lg:col-span-2"
        >
          <IncomeExpenseBarChart data={mockHomeMonthlyComparisons} />
        </ChartCard>

        {/* Expense Categories Donut Chart */}
        <ChartCard
          title="Expense Breakdown"
          subtitle="Distribution by category this month"
        >
          <ExpenseCategoryDonutChart data={mockExpenseCategoryDistributions} />
        </ChartCard>
      </div>

      {/* Spending Trend & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Trend Line Chart */}
        <ChartCard
          title="Monthly Spending Trend"
          subtitle="Daily spending pattern across September"
          className="lg:col-span-1"
        >
          <MonthlySpendingTrendChart data={mockHomeSpendingTrend} />
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
                {recentTransactions.map((tx) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddTransaction}
      />
    </div>
  );
}
