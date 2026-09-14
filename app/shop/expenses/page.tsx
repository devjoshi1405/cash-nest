"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { AddShopExpenseModal } from "@/components/forms/AddShopExpenseModal";
import { EditShopExpenseModal } from "@/components/forms/EditShopExpenseModal";
import { ExpenseCategoryDonutChart } from "@/components/charts/ExpenseCategoryDonutChart";
import { formatDate } from "@/lib/date";
import { ShopExpense } from "@/types/shop";
import { Category } from "@/lib/supabase/types";
import {
  getShopExpenses,
  getShopExpenseSummary,
  deleteShopExpense,
  ShopExpenseSummaryData,
} from "@/lib/data/shop/expenses";
import { getShopExpenseCategories } from "@/lib/data/shop/categories";
import { getAuthenticatedShopWorkspace } from "@/lib/data/shop/workspace";
import {
  TrendingDown,
  Calendar,
  Building2,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ShopExpensesPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [expenses, setExpenses] = useState<ShopExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedMethod, setSelectedMethod] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<string>("this-month");
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const [summaryData, setSummaryData] = useState<ShopExpenseSummaryData>({
    totalExpensesThisMonth: 0,
    prevMonthExpenses: 0,
    monthGrowthPct: 0,
    monthTrendPositive: true,
    dailyAverage: 0,
    mostExpensiveCategory: "—",
    categoryBreakdown: [],
  });

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ShopExpense | null>(null);

  const loadData = useCallback(async () => {
    try {
      let targetWsId = workspaceId;
      if (!targetWsId) {
        const authWs = await getAuthenticatedShopWorkspace();
        if (!authWs) {
          setLoading(false);
          return;
        }
        targetWsId = authWs.workspaceId;
        setWorkspaceId(targetWsId);
      }

      const [expListRes, summaryRes, cats] = await Promise.all([
        getShopExpenses(targetWsId, {
          categoryId: selectedCategory,
          paymentMethod: selectedMethod,
          datePreset: datePreset !== "all" ? datePreset : undefined,
          search: searchTerm,
          page: currentPage,
          pageSize,
        }),
        getShopExpenseSummary(targetWsId),
        getShopExpenseCategories(targetWsId),
      ]);

      setExpenses(expListRes.expenses);
      setTotalPages(expListRes.totalPages);
      setTotalCount(expListRes.totalCount);
      setSummaryData(summaryRes);
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load shop expenses:", err);
      toast.error("Unable to load shop expenses.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId, selectedCategory, selectedMethod, datePreset, searchTerm, currentPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDeleteExpense = async (exp: ShopExpense) => {
    if (!workspaceId) return;
    if (!window.confirm(`Are you sure you want to delete expense "${exp.title}" of ₹${exp.amount}?`)) {
      return;
    }

    try {
      const res = await deleteShopExpense(exp.id, workspaceId);
      if (!res.success) {
        toast.error(res.error || "Failed to delete expense.");
        return;
      }

      toast.success(`Expense "${exp.title}" deleted.`);
      loadData();
    } catch (err) {
      toast.error("Error deleting expense.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shop Operating Expenses"
        description="Monitor premise rent, helper wages, commercial electricity, freezer maintenance, and packaging costs."
        badge="🏪 Pan Shop Workspace"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Expenses"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Shop Expense
          </button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Expenses This Month"
            amount={summaryData.totalExpensesThisMonth}
            icon={TrendingDown}
            colorScheme="rose"
            subtitle={
              summaryData.prevMonthExpenses > 0
                ? `${summaryData.monthTrendPositive ? "▼" : "▲"} ${summaryData.monthGrowthPct}% vs last month`
                : "Fixed & variable shop overheads"
            }
          />

          <StatCard
            title="Most Expensive Category"
            amount={summaryData.mostExpensiveCategory}
            isRawString
            icon={Building2}
            colorScheme="violet"
            subtitle="Top cost center this month"
          />

          <StatCard
            title="Daily Average Expense"
            amount={summaryData.dailyAverage}
            icon={Calendar}
            colorScheme="amber"
            subtitle="Current monthly burn rate"
          />
        </div>
      )}

      {/* Expense Category Donut Chart */}
      {!loading && summaryData.categoryBreakdown.length > 0 && (
        <ChartCard
          title="Shop Overhead Distribution"
          subtitle="Itemized breakdown of rent, electricity, helper wages, packaging and maintenance"
        >
          <ExpenseCategoryDonutChart data={summaryData.categoryBreakdown} />
        </ChartCard>
      )}

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search expense description, notes..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Date range filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Period:</span>
            <select
              value={datePreset}
              onChange={(e) => {
                setDatePreset(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="this-month">This Month</option>
              <option value="today">Today</option>
              <option value="last-month">Last Month</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Method:</span>
            <select
              value={selectedMethod}
              onChange={(e) => {
                setSelectedMethod(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="all">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Credit Card">Credit Card</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expense History Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Operating Expense Log
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Itemized operating costs, power bills and maintenance expenses
            </p>
          </div>
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
            {totalCount} {totalCount === 1 ? "Record" : "Records"}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Loading expense records...
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            title="No shop expenses logged"
            description={
              searchTerm || selectedCategory !== "all" || selectedMethod !== "all"
                ? "No expense records match your filter criteria."
                : "Record your shop rent, helper wages, packaging or electricity bills."
            }
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
                  <th className="py-3 px-4 text-center">Actions</th>
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
                        {exp.categoryIcon ? `${exp.categoryIcon} ` : ""}{exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {exp.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs truncate max-w-xs">
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
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingExpense(exp)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Expense"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalCount > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Add Shop Expense Modal */}
      <AddShopExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        workspaceId={workspaceId}
        onSuccess={() => loadData()}
      />

      {/* Edit Shop Expense Modal */}
      {editingExpense && (
        <EditShopExpenseModal
          isOpen={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          workspaceId={workspaceId}
          expense={editingExpense}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
}
