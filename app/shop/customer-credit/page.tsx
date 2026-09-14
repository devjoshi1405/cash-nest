"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { AddCustomerCreditModal } from "@/components/forms/AddCustomerCreditModal";
import { RecordCustomerPaymentModal } from "@/components/forms/RecordCustomerPaymentModal";
import { EditCustomerCreditModal } from "@/components/forms/EditCustomerCreditModal";
import { CustomerCreditDetailDrawer } from "@/components/customer-credit/CustomerCreditDetailDrawer";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/currency";
import {
  getCustomerCredits,
  getCustomerCreditSummary,
  getCustomerOutstandingSummary,
  deleteCustomerCredit,
} from "@/lib/data/shop/customer-credit";
import { getAuthenticatedShopWorkspace } from "@/lib/data/shop/workspace";
import {
  CustomerCredit,
  CustomerCreditSummary,
  CustomerOutstandingSummary,
  CustomerCreditFilterStatus,
  CustomerCreditDueFilter,
  CustomerCreditSortOption,
} from "@/types/shop";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Phone,
  History,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Filter,
  ArrowUpDown,
  Users,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: Array<{ label: string; value: CustomerCreditFilterStatus }> = [
  { label: "All Credits", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Partial", value: "partial" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
];

const SORT_OPTIONS: Array<{ label: string; value: CustomerCreditSortOption }> = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
  { label: "Highest Credit", value: "highest-credit" },
  { label: "Lowest Credit", value: "lowest-credit" },
  { label: "Highest Remaining", value: "highest-remaining" },
  { label: "Due Soonest", value: "due-soon" },
  { label: "Most Overdue", value: "most-overdue" },
  { label: "Customer A-Z", value: "customer-az" },
];

export default function ShopCustomerCreditPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View mode: 'invoices' vs 'customers'
  const [viewMode, setViewMode] = useState<"invoices" | "customers">("invoices");

  // Summary Metrics
  const [summary, setSummary] = useState<CustomerCreditSummary>({
    totalOutstanding: 0,
    totalReceivedThisMonth: 0,
    totalOverdue: 0,
    pendingCustomersCount: 0,
    totalCreditExtended: 0,
    totalCollected: 0,
    totalActiveCredits: 0,
    overdueCreditsCount: 0,
  });

  // Credit List Data
  const [credits, setCredits] = useState<CustomerCredit[]>([]);
  const [customerSummaries, setCustomerSummaries] = useState<CustomerOutstandingSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerCreditFilterStatus>("all");
  const [dueFilter, setDueFilter] = useState<CustomerCreditDueFilter>("all");
  const [sortBy, setSortBy] = useState<CustomerCreditSortOption>("newest");

  // Modals & Drawers
  const [isAddCreditOpen, setIsAddCreditOpen] = useState(false);
  const [paymentModalCredit, setPaymentModalCredit] = useState<CustomerCredit | null>(null);
  const [detailDrawerCredit, setDetailDrawerCredit] = useState<CustomerCredit | null>(null);
  const [editModalCredit, setEditModalCredit] = useState<CustomerCredit | null>(null);

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

      // Parallel fetch summary, paginated credits, and customer grouped summaries
      const [summaryRes, creditsRes, customerGroupedRes] = await Promise.all([
        getCustomerCreditSummary(targetWsId),
        getCustomerCredits(targetWsId, {
          search: searchQuery,
          status: statusFilter,
          dueFilter,
          sortBy,
          page: currentPage,
          pageSize,
        }),
        getCustomerOutstandingSummary(targetWsId),
      ]);

      setSummary(summaryRes);
      setCredits(creditsRes.credits);
      setTotalCount(creditsRes.totalCount);
      setTotalPages(creditsRes.totalPages);
      setCustomerSummaries(customerGroupedRes);

      // Keep detail drawer credit updated if active
      if (detailDrawerCredit) {
        const updatedDetail = creditsRes.credits.find((c) => c.id === detailDrawerCredit.id);
        if (updatedDetail) {
          setDetailDrawerCredit(updatedDetail);
        }
      }
    } catch (err) {
      console.error("Failed to load customer credits:", err);
      toast.error("Unable to load customer credit data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    workspaceId,
    searchQuery,
    statusFilter,
    dueFilter,
    sortBy,
    currentPage,
    pageSize,
    detailDrawerCredit?.id,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusFilterChange = (val: CustomerCreditFilterStatus) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleDeleteCredit = async (creditId: string, customerName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete/archive credit for "${customerName}"? Any repayment history will be archived.`
      )
    ) {
      return;
    }

    try {
      await deleteCustomerCredit(creditId, true);
      toast.success(`Customer credit for "${customerName}" archived.`);
      loadData();
    } catch (err: unknown) {
      console.error("Failed to delete credit:", err);
      const message = err instanceof Error ? err.message : "Unable to delete credit.";
      toast.error(message);
    }
  };

  // Filtered customer summaries if searching in customer grouped view
  const filteredCustomerSummaries = customerSummaries.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.customerName.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Credit (Khata / Udhaar)"
        description="Maintain customer tabs for pan, cold drinks, cigarettes, snacks, and track collections and due dates."
        badge="🏪 Pan Shop Workspace"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Khata Data"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddCreditOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add to Khata
          </button>
        </div>
      </PageHeader>

      {/* 4 Summary Stat Cards */}
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
            title="Total Outstanding"
            amount={summary.totalOutstanding}
            icon={CreditCard}
            colorScheme="rose"
            badge="Receivable"
            subtitle={`${summary.pendingCustomersCount} active debtor customers`}
          />

          <StatCard
            title="Received This Month"
            amount={summary.totalReceivedThisMonth}
            icon={CheckCircle2}
            colorScheme="emerald"
            subtitle="Installments collected at counter"
          />

          <StatCard
            title="Overdue Balance"
            amount={summary.totalOverdue}
            icon={AlertTriangle}
            colorScheme={summary.totalOverdue > 0 ? "rose" : "emerald"}
            badge={summary.overdueCreditsCount > 0 ? `${summary.overdueCreditsCount} Overdue` : "All Clear"}
            subtitle="Past promised settlement date"
          />

          <StatCard
            title="Pending Customers"
            amount={summary.pendingCustomersCount}
            isRawString
            icon={Users}
            colorScheme="amber"
            subtitle={`${summary.totalActiveCredits} total credit ledger entries`}
          />
        </div>
      )}

      {/* Main Ledger Container */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Top Control Bar: Search, Status Filters, View Toggle */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Customer Credit Ledgers
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time accounts receivable, payment logs, and repayment collection
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("invoices")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "invoices"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Receipt className="h-3.5 w-3.5" /> All Invoices ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setViewMode("customers")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "customers"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Users className="h-3.5 w-3.5" /> Customer Accounts ({customerSummaries.length})
              </button>
            </div>
          </div>

          {/* Search, Status Tabs, Due Date Filter & Sort */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by customer name, phone, notes..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {viewMode === "invoices" && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Due Date Filter */}
                <div className="relative inline-flex items-center">
                  <select
                    value={dueFilter}
                    onChange={(e) => {
                      setDueFilter(e.target.value as CustomerCreditDueFilter);
                      setCurrentPage(1);
                    }}
                    className="appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-3 pr-7 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Due Dates: All</option>
                    <option value="overdue">Overdue Only</option>
                    <option value="due-today">Due Today</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="no-due-date">No Due Date</option>
                  </select>
                  <span className="pointer-events-none absolute right-2 text-slate-400 text-[10px]">
                    ▼
                  </span>
                </div>

                {/* Sort Option */}
                <div className="relative inline-flex items-center">
                  <ArrowUpDown className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as CustomerCreditSortOption);
                      setCurrentPage(1);
                    }}
                    className="appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-8 pr-7 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 text-slate-400 text-[10px]">
                    ▼
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Status Tabs (Only for Invoices View) */}
          {viewMode === "invoices" && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 dark:border-slate-800/60">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => handleStatusFilterChange(f.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                    statusFilter === f.value
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View 1: All Invoices Table */}
        {viewMode === "invoices" && (
          <>
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-500" />
                Loading customer credit ledgers...
              </div>
            ) : credits.length === 0 ? (
              <div className="p-8">
                {statusFilter === "paid" ? (
                  <EmptyState
                    title="No fully paid credit records"
                    description="When customers clear their khata tabs completely, they will appear under Paid."
                    icon={CheckCircle2}
                  />
                ) : statusFilter === "overdue" ? (
                  <EmptyState
                    title="No overdue customer credit"
                    description="Awesome! All customer accounts are either settled or within their promised repayment window."
                    icon={CheckCircle2}
                  />
                ) : searchQuery ? (
                  <EmptyState
                    title="No matching customer credit found"
                    description={`No records found matching "${searchQuery}". Try adjusting your search query or filters.`}
                    icon={Search}
                  />
                ) : (
                  <EmptyState
                    title="No customer credit recorded yet"
                    description="Add an udhaar entry when a customer purchases items on tab and promises to pay later."
                    icon={CreditCard}
                    actionLabel="Add Customer Credit"
                    onAction={() => setIsAddCreditOpen(true)}
                  />
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Customer Name</th>
                        <th className="py-3 px-4">Phone</th>
                        <th className="py-3 px-4">Credit Date</th>
                        <th className="py-3 px-4 text-right">Original (₹)</th>
                        <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                          Collected (₹)
                        </th>
                        <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                          Pending (₹)
                        </th>
                        <th className="py-3 px-4">Due Date & Status</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {credits.map((c) => {
                        const isSettled = c.remainingAmount <= 0;
                        return (
                          <tr
                            key={c.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              <button
                                type="button"
                                onClick={() => setDetailDrawerCredit(c)}
                                className="hover:text-amber-600 dark:hover:text-amber-400 text-left cursor-pointer"
                              >
                                {c.customerName}
                              </button>
                              {c.notes && (
                                <span className="text-[11px] text-slate-400 truncate max-w-xs block font-normal">
                                  {c.notes}
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                              {c.phone ? (
                                <a
                                  href={`tel:${c.phone}`}
                                  className="hover:text-amber-600 hover:underline"
                                >
                                  {c.phone}
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                              {formatDate(c.creditDate || c.createdAt)}
                            </td>

                            <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              <CurrencyDisplay amount={c.creditAmount} />
                            </td>

                            <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              <CurrencyDisplay amount={c.amountReceived} />
                            </td>

                            <td className="py-3.5 px-4 text-right font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                              <CurrencyDisplay amount={c.remainingAmount} />
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div>
                                <span className="text-slate-700 dark:text-slate-300 block">
                                  {c.dueDate ? formatDate(c.dueDate) : "No due date"}
                                </span>
                                {c.dueDateStatus && (
                                  <span
                                    className={cn(
                                      "text-[10px] font-semibold block",
                                      c.isOverdue
                                        ? "text-rose-600 dark:text-rose-400 font-bold"
                                        : isSettled
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-slate-400"
                                    )}
                                  >
                                    {c.dueDateStatus}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <StatusBadge status={c.status} />
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {isSettled ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Settled
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setPaymentModalCredit(c)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                                    title="Collect Payment"
                                  >
                                    + Collect
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setDetailDrawerCredit(c)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  title="Payment Log & Details"
                                >
                                  <History className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setEditModalCredit(c)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                                  title="Edit Credit Details"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteCredit(c.id, c.customerName)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                  title="Archive Credit"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
                  {credits.map((c) => {
                    const isSettled = c.remainingAmount <= 0;
                    return (
                      <div key={c.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <button
                              type="button"
                              onClick={() => setDetailDrawerCredit(c)}
                              className="font-bold text-sm text-slate-900 dark:text-white hover:text-amber-600 text-left"
                            >
                              {c.customerName}
                            </button>
                            {c.phone && (
                              <a
                                href={`tel:${c.phone}`}
                                className="text-[11px] text-slate-500 block hover:underline"
                              >
                                {c.phone}
                              </a>
                            )}
                          </div>
                          <StatusBadge status={c.status} />
                        </div>

                        {c.notes && (
                          <p className="text-[11px] text-slate-400 italic">{c.notes}</p>
                        )}

                        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Original</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatINR(c.creditAmount)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                              Collected
                            </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatINR(c.amountReceived)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 block">
                              Pending
                            </span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              {formatINR(c.remainingAmount)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            Due: {c.dueDate ? formatDate(c.dueDate) : "No due date"}
                            {c.isOverdue && (
                              <span className="text-rose-600 font-bold ml-1">
                                ({c.dueDateStatus})
                              </span>
                            )}
                          </span>
                          <span>{c.payments?.length || 0} receipt(s)</span>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setDetailDrawerCredit(c)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            Details & History
                          </button>
                          {!isSettled && (
                            <button
                              type="button"
                              onClick={() => setPaymentModalCredit(c)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700"
                            >
                              + Collect
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {credits.length > 0 && (
                  <DataTablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalCount}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* View 2: Grouped Customer Accounts Summary */}
        {viewMode === "customers" && (
          <div className="p-0">
            {filteredCustomerSummaries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No customer accounts found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4 text-center">Credit Tabs</th>
                      <th className="py-3 px-4 text-right">Lifetime Credit</th>
                      <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                        Total Collected
                      </th>
                      <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                        Net Outstanding
                      </th>
                      <th className="py-3 px-4">Oldest Due Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredCustomerSummaries.map((c, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {c.customerName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {c.phone ? (
                            <a
                              href={`tel:${c.phone}`}
                              className="hover:text-amber-600 hover:underline"
                            >
                              {c.phone}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-400 font-semibold">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            {c.creditsCount} bills
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                          {formatINR(c.totalCredit)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatINR(c.totalReceived)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-rose-600 dark:text-rose-400">
                          {formatINR(c.outstanding)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {c.oldestDueDate ? formatDate(c.oldestDueDate) : "No due date"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge status={c.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Customer Credit Modal */}
      {isAddCreditOpen && (
        <AddCustomerCreditModal
          isOpen={isAddCreditOpen}
          workspaceId={workspaceId}
          onClose={() => setIsAddCreditOpen(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Record Customer Payment Modal */}
      {paymentModalCredit && (
        <RecordCustomerPaymentModal
          isOpen={!!paymentModalCredit}
          creditId={paymentModalCredit.id}
          customerName={paymentModalCredit.customerName}
          remainingAmount={paymentModalCredit.remainingAmount}
          onClose={() => setPaymentModalCredit(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Edit Customer Credit Modal */}
      {editModalCredit && (
        <EditCustomerCreditModal
          isOpen={!!editModalCredit}
          credit={editModalCredit}
          onClose={() => setEditModalCredit(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Customer Credit Detail Drawer */}
      {detailDrawerCredit && (
        <CustomerCreditDetailDrawer
          isOpen={!!detailDrawerCredit}
          credit={detailDrawerCredit}
          onClose={() => setDetailDrawerCredit(null)}
          onCreditUpdated={() => {
            loadData();
          }}
          onCreditDeleted={() => {
            setDetailDrawerCredit(null);
            loadData();
          }}
          onRecordPaymentClick={(cred) => {
            setPaymentModalCredit(cred);
          }}
        />
      )}
    </div>
  );
}
