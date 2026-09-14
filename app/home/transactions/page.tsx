"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterDropdown } from "@/components/shared/FilterDropdown";
import { DateFilter } from "@/components/shared/DateFilter";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AddTransactionModal } from "@/components/forms/AddTransactionModal";
import { formatDate } from "@/lib/date";
import { mockHomeTransactions } from "@/data/home/transactions";
import { HomeTransaction } from "@/types/home";
import { DateRangeFilter } from "@/types/common";
import { Plus, Edit2, Trash2, Eye, ArrowLeftRight, Filter } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";

export default function HomeTransactionsPage() {
  const [transactions, setTransactions] = useState<HomeTransaction[]>(mockHomeTransactions);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("this-month");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<HomeTransaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<HomeTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<HomeTransaction | null>(null);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search
      const matchesSearch =
        tx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.notes && tx.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tx.category.toLowerCase().includes(searchQuery.toLowerCase());

      // Type
      const matchesType = typeFilter === "all" || tx.type.toLowerCase() === typeFilter.toLowerCase();

      // Category
      const matchesCategory =
        categoryFilter === "all" || tx.category.toLowerCase() === categoryFilter.toLowerCase();

      // Payment Method
      const matchesMethod =
        methodFilter === "all" || tx.paymentMethod.toLowerCase() === methodFilter.toLowerCase();

      return matchesSearch && matchesType && matchesCategory && matchesMethod;
    });
  }, [transactions, searchQuery, typeFilter, categoryFilter, methodFilter]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleAddOrEditSuccess = (savedTx: HomeTransaction) => {
    if (editingTransaction) {
      setTransactions((prev) =>
        prev.map((item) => (item.id === savedTx.id ? savedTx : item))
      );
      setEditingTransaction(null);
    } else {
      setTransactions((prev) => [savedTx, ...prev]);
    }
  };

  const handleDeleteConfirm = () => {
    if (deletingTransaction) {
      setTransactions((prev) => prev.filter((item) => item.id !== deletingTransaction.id));
      toast.success(`Transaction "${deletingTransaction.name}" deleted.`);
      setDeletingTransaction(null);
    }
  };

  // Categories list
  const categoryOptions = [
    { label: "Kitchen", value: "kitchen" },
    { label: "Petrol", value: "petrol" },
    { label: "Wi-Fi", value: "wi-fi" },
    { label: "Salary", value: "salary" },
    { label: "Medical", value: "medical" },
    { label: "Electricity", value: "electricity" },
    { label: "Entertainment", value: "entertainment" },
    { label: "Gas", value: "gas" },
    { label: "Mobile Recharge", value: "mobile recharge" },
    { label: "EMI", value: "emi" },
    { label: "Shopping", value: "shopping" },
    { label: "Freelance", value: "freelance" },
    { label: "Interest", value: "interest" },
  ];

  const paymentMethodOptions = [
    { label: "UPI", value: "upi" },
    { label: "Cash", value: "cash" },
    { label: "Bank", value: "bank" },
    { label: "Credit Card", value: "credit card" },
  ];

  const typeOptions = [
    { label: "Income (+)", value: "income" },
    { label: "Expense (-)", value: "expense" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions Management"
        description="View, search, filter, and manage your complete household income and expense history."
        badge="🏠 Home Workspace"
      >
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
      </PageHeader>

      {/* Top Filter Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
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
              onChange={(val) => setDateFilter(val)}
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

            <FilterDropdown
              label="Categories"
              value={categoryFilter}
              onChange={(val) => {
                setCategoryFilter(val);
                setCurrentPage(1);
              }}
              options={categoryOptions}
            />

            <FilterDropdown
              label="Methods"
              value={methodFilter}
              onChange={(val) => {
                setMethodFilter(val);
                setCurrentPage(1);
              }}
              options={paymentMethodOptions}
            />
          </div>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {paginatedTransactions.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description={
              searchQuery || typeFilter !== "all" || categoryFilter !== "all"
                ? "Try adjusting your search criteria or resetting filters."
                : "Record your first personal or household income/expense entry to get started."
            }
            icon={ArrowLeftRight}
            actionLabel="Add Transaction"
            onAction={() => setIsAddModalOpen(true)}
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
                {paginatedTransactions.map((tx) => (
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
        {filteredTransactions.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTransactions.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Add / Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
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
              <span className="font-mono text-slate-600 dark:text-slate-300">
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

            <div className="pt-3">
              <button
                type="button"
                onClick={() => setViewingTransaction(null)}
                className="w-full rounded-lg bg-slate-100 dark:bg-slate-800 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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
        confirmLabel="Delete"
        isDestructive
      />
    </div>
  );
}
