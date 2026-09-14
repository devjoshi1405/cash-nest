"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddIncomeModal } from "@/components/forms/AddIncomeModal";
import { formatDate } from "@/lib/date";
import { mockHomeIncomeItems, mockHomeIncomeSummary } from "@/data/home/income";
import { HomeIncomeItem } from "@/types/home";
import { Wallet, Briefcase, Sparkles, TrendingUp, Plus, ArrowUpRight } from "lucide-react";

export default function HomeIncomePage() {
  const [incomeList, setIncomeList] = useState<HomeIncomeItem[]>(mockHomeIncomeItems);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddIncome = (newIncome: HomeIncomeItem) => {
    setIncomeList((prev) => [newIncome, ...prev]);
  };

  const totalCurrentMonth = incomeList
    .filter((i) => i.date.startsWith("2026-09"))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const salaryCurrentMonth = incomeList
    .filter((i) => i.date.startsWith("2026-09") && i.category === "Salary")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const otherCurrentMonth = totalCurrentMonth - salaryCurrentMonth;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income & Earnings"
        description="Monitor monthly salary credits, freelance earnings, interest returns, and side incomes."
        badge="🏠 Home Workspace"
      >
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Income
        </button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Monthly Income"
          amount={totalCurrentMonth || mockHomeIncomeSummary.totalMonthlyIncome}
          icon={Wallet}
          colorScheme="emerald"
          trend={{
            value: mockHomeIncomeSummary.growthPercentage,
            isPositive: true,
            label: "vs last month",
          }}
        />

        <StatCard
          title="Primary Salary"
          amount={salaryCurrentMonth || mockHomeIncomeSummary.salaryIncome}
          icon={Briefcase}
          colorScheme="blue"
          subtitle="Fixed monthly paycheck"
        />

        <StatCard
          title="Other & Freelance"
          amount={otherCurrentMonth || mockHomeIncomeSummary.otherIncome}
          icon={Sparkles}
          colorScheme="violet"
          subtitle="Side gigs & interest"
        />

        <StatCard
          title="Previous Month"
          amount={mockHomeIncomeSummary.previousMonthIncome}
          icon={TrendingUp}
          colorScheme="slate"
          subtitle="August 2026 Total"
        />
      </div>

      {/* Income History Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Income History
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified income receipts and deposits
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            {incomeList.length} Entries
          </span>
        </div>

        {incomeList.length === 0 ? (
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
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddIncome}
      />
    </div>
  );
}
