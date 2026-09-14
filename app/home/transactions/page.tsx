"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterDropdown } from "@/components/shared/FilterDropdown";
import { DateFilter } from "@/components/shared/DateFilter";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AddTransactionModal } from "@/components/forms/AddTransactionModal";
import { Modal } from "@/components/shared/Modal";
import { SkeletonCard, SkeletonTable } from "@/components/shared/SkeletonCard";
import { formatDate, getDateRangeFromPreset } from "@/lib/date";
import { formatINR } from "@/lib/currency";
import { HomeTransaction } from "@/types/home";
import { DateRangeFilter } from "@/types/common";
import { Category } from "@/lib/supabase/types";
import {
  getHomeTransactions,
  deleteHomeTransaction,
  HomeTransactionsSummary,
} from "@/lib/data/home/transactions";
import { getHomeCategories } from "@/lib/data/home/categories";
import { getAuthenticatedHomeWorkspace } from "@/lib/data/home/workspace";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  ArrowLeftRight,
  RefreshCw,
  Wallet,
  TrendingDown,
  PiggyBank,
  Receipt,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function HomeTransactionsPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Transactions data & pagination
  const [transactions, setTransactions] = useState<HomeTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Aggregate summary
  const [summary, setSummary] = useState<HomeTransactionsSummary>({
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
    totalCount: 0,
  });

  // Categories list for filter dropdown
  const [categories, setCategories] = useState<Category[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("this-month");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<HomeTransaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<HomeTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<HomeTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load Categories
  const loadCategories = useCallback(async (wsId: string) => {
    try {
      const cats = await getHomeCategories(wsId);
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }, []);

  // Fetch transactions from Supabase
  const loadTransactions = useCallback(async () => {
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
        loadCategories(targetWsId);
      }

      const dateRange = getDateRangeFromPreset(dateFilter);

      const res = await getHomeTransactions({
        workspaceId: targetWsId,
        page: currentPage,
        pageSize,
        search: searchQuery,
        type: typeFilter === "all" ? undefined : (typeFilter as "income" | "expense"),
        categoryId: categoryFilter === "all" ? undefined : categoryFilter,
        paymentMethod: methodFilter === "all" ? undefined : methodFilter,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      setTransactions(res.transactions);
      setTotalCount(res.totalCount);
      setSummary(res.summary);
    } catch (err) {
      console.error("Error loading home transactions:", err);
      toast.error("Failed to load transactions from database.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    workspaceId,
    currentPage,
    pageSize,
    searchQuery,
    typeFilter,
    categoryFilter,
    methodFilter,
    dateFilter,
    loadCategories,
  ]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const handleAddOrEditSuccess = () => {
    setIsAddModalOpen(false);
    setEditingTransaction(null);
    loadTransactions();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTransaction) return;
    setIsDeleting(true);
    try {
      const result = await deleteHomeTransaction(deletingTransaction.id);
      if (!result.success) {
        toast.error(result.error || "Failed to delete transaction.");
        setIsDeleting(false);
        return;
      }

      toast.success(`Transaction "${deletingTransaction.name}" deleted.`);
      setDeletingTransaction(null);
      loadTransactions();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete transaction.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setMethodFilter("all");
    setDateFilter("this-month");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    typeFilter !== "all" ||
    categoryFilter !== "all" ||
    methodFilter !== "all" ||
    dateFilter !== "this-month";

  // Category filter dropdown options
  const categoryOptions = useMemo(() => {
    return categories.map((cat) => ({
      label: cat.icon ? `${cat.icon} ${cat.name}` : cat.name,
      value: cat.id,
    }));
  }, [categories]);

  const paymentMethodOptions = [
    { label: "UPI", value: "UPI" },
    { label: "Cash", value: "Cash" },
    { label: "Bank Account", value: "Bank" },
    { label: "Credit Card", value: "Credit Card" },
    { label: "Debit Card", value: "Debit Card" },
    { label: "Other", value: "Other" },
  ];

  const typeOptions = [
    { label: "Income (+)", value: "income" },
    { label: "Expense (-)", value: "expense" },
  ];

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Transactions Management"
        description="View, search, filter, and manage your complete household income and expense history."
        badge="🏠 Home Workspace"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Transactions"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingTransaction(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Transaction
          </button>
        </div>
      </PageHeader>

      {/* Summary KPI Cards */}
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
            title="Total Inflow (Income)"
            amount={summary.totalIncome}
            icon={Wallet}
            colorScheme="emerald"
            subtitle="Total earnings in selected period"
          />

          <StatCard
            title="Total Outflow (Expenses)"
            amount={summary.totalExpense}
            icon={TrendingDown}
            colorScheme="rose"
            subtitle="Total spending in selected period"
          />

          <StatCard
            title="Net Period Balance"
            amount={summary.netSavings}
            icon={PiggyBank}
            colorScheme={summary.netSavings >= 0 ? "blue" : "rose"}
            formula={`${formatINR(summary.totalIncome)} - ${formatINR(summary.totalExpense)}`}
          />

          <StatCard
            title="Total Entries"
            amount={String(summary.totalCount)}
            isRawString
            icon={Receipt}
            colorScheme="indigo"
            subtitle={`${transactions.length} shown on this page`}
          />
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Bar */}
          <SearchInput
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
            placeholder="Search by transaction name, category, or notes..."
            className="flex-1"
          />

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <DateFilter
              value={dateFilter}
              onChange={(val) => {
                setDateFilter(val);
                setCurrentPage(1);
              }}
            />

            <FilterDropdown
              label="Types"
              value={typeFilter}
              onChange={(val) => {
                setTypeFilter(val);
                setCurrentPage(1);
              }}
              options={typeOptions}
            />

            {categoryOptions.length > 0 && (
              <FilterDropdown
                label="Categories"
                value={categoryFilter}
                onChange={(val) => {
                  setCategoryFilter(val);
                  setCurrentPage(1);
                }}
                options={categoryOptions}
              />
            )}

            <FilterDropdown
              label="Methods"
              value={methodFilter}
              onChange={(val) => {
                setMethodFilter(val);
                setCurrentPage(1);
              }}
              options={paymentMethodOptions}
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <X className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Transaction Register
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live household entries recorded in Supabase
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            {totalCount} {totalCount === 1 ? "Record" : "Records"}
          </span>
        </div>

        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={8} cols={7} />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description={
              hasActiveFilters
                ? "Try adjusting your search criteria or resetting filters."
                : "Record your first personal or household income/expense entry to get started."
            }
            icon={ArrowLeftRight}
            actionLabel="Add Transaction"
            onAction={() => {
              setEditingTransaction(null);
              setIsAddModalOpen(true);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Transaction Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {tx.name}
                      </span>
                      {tx.notes && (
                        <span className="text-[11px] text-slate-400 truncate max-w-xs block mt-0.5">
                          {tx.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={tx.type} />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-slate-600 dark:text-slate-300">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <CurrencyDisplay
                        amount={tx.amount}
                        type={tx.type}
                        colored
                        showSign
                        className="text-sm font-bold"
                      />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingTransaction(tx)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTransaction(tx);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTransaction(tx)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {transactions.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Add / Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        workspaceId={workspaceId}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTransaction(null);
        }}
        initialData={editingTransaction}
        onSuccess={handleAddOrEditSuccess}
      />

      {/* View Transaction Details Modal */}
      {viewingTransaction && (
        <Modal
          isOpen={!!viewingTransaction}
          onClose={() => setViewingTransaction(null)}
          title="Transaction Details"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Transaction ID</span>
              <span className="font-mono text-slate-600 dark:text-slate-300 text-[11px] truncate max-w-[180px]">
                {viewingTransaction.id}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Title / Purpose</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {viewingTransaction.name}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Type</span>
              <StatusBadge status={viewingTransaction.type} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Category</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {viewingTransaction.category}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Payment Mode</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {viewingTransaction.paymentMethod}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Date</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {formatDate(viewingTransaction.date)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 font-semibold">Total Amount</span>
              <CurrencyDisplay
                amount={viewingTransaction.amount}
                type={viewingTransaction.type}
                colored
                showSign
                className="text-base font-black"
              />
            </div>

            {viewingTransaction.notes && (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Notes
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  {viewingTransaction.notes}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-3">
              <button
                type="button"
                onClick={() => {
                  const tx = viewingTransaction;
                  setViewingTransaction(null);
                  setEditingTransaction(tx);
                  setIsAddModalOpen(true);
                }}
                className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setViewingTransaction(null)}
                className="rounded-lg bg-slate-100 dark:bg-slate-800 py-2 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Transaction"
        message={`Are you sure you want to delete "${deletingTransaction?.name}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        isDestructive
      />
    </div>
  );
}

