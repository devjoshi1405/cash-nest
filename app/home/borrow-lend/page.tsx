"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Drawer } from "@/components/shared/Drawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AddBorrowLendModal } from "@/components/forms/AddBorrowLendModal";
import { EditBorrowLendModal } from "@/components/forms/EditBorrowLendModal";
import { RecordLoanPaymentModal } from "@/components/forms/RecordLoanPaymentModal";
import { EditLoanPaymentModal } from "@/components/forms/EditLoanPaymentModal";
import { formatINR } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import {
  BorrowRecord,
  LendRecord,
  LoanPaymentHistory,
  BorrowLendStatus,
  DebtSummary,
} from "@/types/home";
import {
  getDebts,
  deleteDebt,
  deleteDebtPayment,
  getDueStatusInfo,
} from "@/lib/data/home/debts";
import { getAuthenticatedHomeWorkspace } from "@/lib/data/home/workspace";
import {
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Plus,
  CreditCard,
  History,
  Phone,
  Search,
  Filter,
  ArrowUpDown,
  AlertTriangle,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function HomeBorrowLendPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [lends, setLends] = useState<LendRecord[]>([]);

  // Active Tab & Filters
  const [activeTab, setActiveTab] = useState<"borrow" | "lend">("borrow");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalType, setAddModalType] = useState<"borrow" | "lend">("borrow");

  const [editingDebt, setEditingDebt] = useState<BorrowRecord | LendRecord | null>(null);
  const [deletingDebt, setDeletingDebt] = useState<BorrowRecord | LendRecord | null>(null);

  // Payment Recording Modal
  const [paymentModalRecord, setPaymentModalRecord] = useState<{
    id: string;
    personName: string;
    remainingAmount: number;
    isBorrow: boolean;
  } | null>(null);

  // Payment History Drawer
  const [historyDrawerRecord, setHistoryDrawerRecord] = useState<{
    id: string;
    personName: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    payments: LoanPaymentHistory[];
    isBorrow: boolean;
  } | null>(null);

  // Payment Editing / Deleting in Drawer
  const [editingPayment, setEditingPayment] = useState<LoanPaymentHistory | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<LoanPaymentHistory | null>(null);

  // Fetch data
  const loadData = useCallback(async () => {
    try {
      const authWs = await getAuthenticatedHomeWorkspace();
      if (!authWs) {
        setLoading(false);
        return;
      }
      setWorkspaceId(authWs.workspaceId);

      const { borrows: bList, lends: lList } = await getDebts({
        workspaceId: authWs.workspaceId,
      });

      setBorrows(bList);
      setLends(lList);
    } catch (err) {
      console.error("Error loading borrow/lend data:", err);
      toast.error("Failed to load records from Supabase.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Real Totals & Summary Metrics
  const summary: DebtSummary = useMemo(() => {
    let totalMoneyToPay = 0;
    let totalMoneyToReceive = 0;
    let overdueAmount = 0;
    let activeBorrowingsCount = 0;
    let activeLendingsCount = 0;

    for (const b of borrows) {
      if (b.remainingAmount > 0) {
        totalMoneyToPay += b.remainingAmount;
        activeBorrowingsCount++;
        if (b.status === "Overdue") {
          overdueAmount += b.remainingAmount;
        }
      }
    }

    for (const l of lends) {
      if (l.remainingAmount > 0) {
        totalMoneyToReceive += l.remainingAmount;
        activeLendingsCount++;
        if (l.status === "Overdue") {
          overdueAmount += l.remainingAmount;
        }
      }
    }

    return {
      totalMoneyToPay: Math.round(totalMoneyToPay),
      totalMoneyToReceive: Math.round(totalMoneyToReceive),
      overdueAmount: Math.round(overdueAmount),
      activeBorrowingsCount,
      activeLendingsCount,
      totalActiveCount: activeBorrowingsCount + activeLendingsCount,
    };
  }, [borrows, lends]);

  // Filtered & Sorted Borrows
  const filteredBorrows = useMemo(() => {
    let list = [...borrows];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.personName.toLowerCase().includes(q) ||
          (b.phone && b.phone.toLowerCase().includes(q)) ||
          (b.purpose && b.purpose.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((b) => b.status.toLowerCase().replace(" ", "") === statusFilter.toLowerCase().replace(" ", ""));
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (a.debtDate || a.borrowDate || "").localeCompare(b.debtDate || b.borrowDate || "");
        case "highest-amount":
          return b.borrowedAmount - a.borrowedAmount;
        case "lowest-amount":
          return a.borrowedAmount - b.borrowedAmount;
        case "most-remaining":
          return b.remainingAmount - a.remainingAmount;
        case "due-soon": {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        case "newest":
        default:
          return (b.debtDate || b.borrowDate || "").localeCompare(a.debtDate || a.borrowDate || "");
      }
    });
    return list;
  }, [borrows, searchQuery, statusFilter, sortBy]);

  // Filtered & Sorted Lends
  const filteredLends = useMemo(() => {
    let list = [...lends];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.personName.toLowerCase().includes(q) ||
          (l.phone && l.phone.toLowerCase().includes(q)) ||
          (l.purpose && l.purpose.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((l) => l.status.toLowerCase().replace(" ", "") === statusFilter.toLowerCase().replace(" ", ""));
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (a.debtDate || a.lendDate || "").localeCompare(b.debtDate || b.lendDate || "");
        case "highest-amount":
          return b.lentAmount - a.lentAmount;
        case "lowest-amount":
          return a.lentAmount - b.lentAmount;
        case "most-remaining":
          return b.remainingAmount - a.remainingAmount;
        case "due-soon": {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        case "newest":
        default:
          return (b.debtDate || b.lendDate || "").localeCompare(a.debtDate || a.lendDate || "");
      }
    });
    return list;
  }, [lends, searchQuery, statusFilter, sortBy]);

  // Handle Add Success
  const handleAddBorrowSuccess = (record: BorrowRecord) => {
    setBorrows((prev) => [record, ...prev]);
  };

  const handleAddLendSuccess = (record: LendRecord) => {
    setLends((prev) => [record, ...prev]);
  };

  // Handle Edit Success
  const handleEditSuccess = (updated: BorrowRecord | LendRecord) => {
    if ("borrowedAmount" in updated) {
      setBorrows((prev) => prev.map((item) => (item.id === updated.id ? (updated as BorrowRecord) : item)));
    } else {
      setLends((prev) => prev.map((item) => (item.id === updated.id ? (updated as LendRecord) : item)));
    }
    setEditingDebt(null);
  };

  // Handle Delete Debt Confirm
  const handleDeleteDebtConfirm = async () => {
    if (!deletingDebt) return;
    try {
      const result = await deleteDebt(deletingDebt.id);
      if (!result.success) {
        toast.error(result.error || "Failed to delete record.");
        return;
      }

      if ("borrowedAmount" in deletingDebt) {
        setBorrows((prev) => prev.filter((b) => b.id !== deletingDebt.id));
      } else {
        setLends((prev) => prev.filter((l) => l.id !== deletingDebt.id));
      }

      toast.success(`Record for "${deletingDebt.personName}" deleted.`);
      setDeletingDebt(null);
      if (historyDrawerRecord?.id === deletingDebt.id) {
        setHistoryDrawerRecord(null);
      }
    } catch {
      toast.error("Failed to delete record.");
    }
  };

  // Handle Payment Recorded
  const handleRecordPaymentSuccess = (payment: LoanPaymentHistory) => {
    if (!paymentModalRecord) return;
    loadData(); // Re-sync accurately with trigger
    if (historyDrawerRecord && historyDrawerRecord.id === paymentModalRecord.id) {
      setHistoryDrawerRecord((prev) =>
        prev
          ? {
              ...prev,
              paidAmount: prev.paidAmount + payment.amount,
              remainingAmount: Math.max(0, prev.totalAmount - (prev.paidAmount + payment.amount)),
              payments: [payment, ...prev.payments],
            }
          : null
      );
    }
  };

  // Handle Delete Payment Confirm
  const handleDeletePaymentConfirm = async () => {
    if (!deletingPayment || !historyDrawerRecord) return;
    try {
      const result = await deleteDebtPayment(deletingPayment.id, historyDrawerRecord.id);
      if (!result.success) {
        toast.error(result.error || "Failed to delete payment.");
        return;
      }

      toast.success("Payment entry deleted. Remaining balance recalculated.");
      setDeletingPayment(null);
      loadData(); // Re-sync

      // Update drawer state locally
      const updatedPayments = historyDrawerRecord.payments.filter((p) => p.id !== deletingPayment.id);
      const newPaid = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
      setHistoryDrawerRecord({
        ...historyDrawerRecord,
        paidAmount: newPaid,
        remainingAmount: Math.max(0, historyDrawerRecord.totalAmount - newPaid),
        payments: updatedPayments,
      });
    } catch {
      toast.error("Failed to delete payment entry.");
    }
  };

  // Handle Edit Payment Success
  const handleEditPaymentSuccess = (updatedPayment: LoanPaymentHistory) => {
    if (!historyDrawerRecord) return;
    loadData();
    const updatedPayments = historyDrawerRecord.payments.map((p) =>
      p.id === updatedPayment.id ? updatedPayment : p
    );
    const newPaid = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
    setHistoryDrawerRecord({
      ...historyDrawerRecord,
      paidAmount: newPaid,
      remainingAmount: Math.max(0, historyDrawerRecord.totalAmount - newPaid),
      payments: updatedPayments,
    });
    setEditingPayment(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Borrow & Lend Ledger"
        description="Track money borrowed from individuals and loans given to friends, family, or contacts."
        badge="🏠 Home Workspace"
      >
        <div className="flex flex-wrap items-center gap-2">
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
            onClick={() => {
              setAddModalType("borrow");
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Borrow (I Owe)
          </button>
          <button
            type="button"
            onClick={() => {
              setAddModalType("lend");
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Lend (They Owe)
          </button>
        </div>
      </PageHeader>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total I Have To Pay"
          amount={summary.totalMoneyToPay}
          icon={ArrowUpRight}
          colorScheme="amber"
          subtitle={`${summary.activeBorrowingsCount} active borrowings`}
          badge="Liabilities"
        />

        <StatCard
          title="Total I Have To Receive"
          amount={summary.totalMoneyToReceive}
          icon={ArrowDownLeft}
          colorScheme="emerald"
          subtitle={`${summary.activeLendingsCount} active lendings`}
          badge="Receivables"
        />

        <StatCard
          title="Overdue Amount"
          amount={summary.overdueAmount}
          icon={AlertTriangle}
          colorScheme={summary.overdueAmount > 0 ? "rose" : "slate"}
          subtitle={
            summary.overdueAmount > 0
              ? "Past scheduled due date"
              : "All repayments on track"
          }
        />

        <StatCard
          title="Active Records"
          amount={String(summary.totalActiveCount)}
          isRawString
          icon={HandCoins}
          colorScheme="indigo"
          subtitle="Open ledger entries"
        />
      </div>

      {/* Main Tabs Segment */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveTab("borrow")}
            className={cn(
              "flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all cursor-pointer",
              activeTab === "borrow"
                ? "border-amber-600 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>I Have To Pay ({borrows.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("lend")}
            className={cn(
              "flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all cursor-pointer",
              activeTab === "lend"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <ArrowDownLeft className="h-4 w-4" />
            <span>People Have To Pay Me ({lends.length})</span>
          </button>
        </div>
      </div>

      {/* Search, Filter & Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by person name, phone, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partially Paid</option>
              <option value="paid">Paid (Settled)</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest-amount">Highest Amount</option>
              <option value="lowest-amount">Lowest Amount</option>
              <option value="most-remaining">Most Remaining</option>
              <option value="due-soon">Due Soon</option>
            </select>
          </div>
        </div>
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
      ) : activeTab === "borrow" ? (
        /* Tab Content: Borrow Records */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBorrows.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title={searchQuery || statusFilter !== "all" ? "No matching borrow records" : "You don't owe anyone money"}
                description={
                  searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search query or status filter."
                    : "You currently have no outstanding money owed to others."
                }
                icon={HandCoins}
                actionLabel="Add Borrow Record"
                onAction={() => {
                  setAddModalType("borrow");
                  setIsAddModalOpen(true);
                }}
              />
            </div>
          ) : (
            filteredBorrows.map((b) => {
              const progressPct =
                b.borrowedAmount > 0
                  ? Math.min(100, Math.round((b.paidAmount / b.borrowedAmount) * 100))
                  : 0;

              const dueInfo = getDueStatusInfo(b.dueDate, b.remainingAmount);

              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 card-hover flex flex-col justify-between"
                >
                  <div>
                    {/* Header with Title, Actions & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {b.personName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {b.phone && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                              <Phone className="h-3 w-3" /> {b.phone}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            • {formatDate(b.debtDate || b.borrowDate)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={b.status} />
                        <button
                          type="button"
                          onClick={() => setEditingDebt(b)}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                          title="Edit Borrow"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingDebt(b)}
                          className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                          title="Delete Borrow"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {b.purpose && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        Purpose: {b.purpose}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Repayment Progress</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {progressPct}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Financial Matrix */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">
                          Borrowed
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {formatINR(b.borrowedAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block uppercase">
                          Paid
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {formatINR(b.paidAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 block uppercase">
                          Remaining
                        </span>
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                          {formatINR(b.remainingAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Due Date & Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="h-3.5 w-3.5" /> Due Date:
                      </span>
                      <div className="text-right">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {b.dueDate ? formatDate(b.dueDate) : "No due date"}
                        </span>
                        <span className={cn("text-[10px] font-medium", dueInfo.color)}>
                          {dueInfo.text}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPaymentModalRecord({
                            id: b.id,
                            personName: b.personName,
                            remainingAmount: b.remainingAmount,
                            isBorrow: true,
                          })
                        }
                        disabled={b.remainingAmount <= 0}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white p-2 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Pay
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setHistoryDrawerRecord({
                            id: b.id,
                            personName: b.personName,
                            totalAmount: b.borrowedAmount,
                            paidAmount: b.paidAmount,
                            remainingAmount: b.remainingAmount,
                            payments: b.payments,
                            isBorrow: true,
                          })
                        }
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 p-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <History className="h-3.5 w-3.5" /> History ({b.payments.length})
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Tab Content: Lend Records */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLends.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title={searchQuery || statusFilter !== "all" ? "No matching lend records" : "No money is currently owed to you"}
                description={
                  searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search query or status filter."
                    : "You have not lent money to anyone currently."
                }
                icon={HandCoins}
                actionLabel="Add Lend Record"
                onAction={() => {
                  setAddModalType("lend");
                  setIsAddModalOpen(true);
                }}
              />
            </div>
          ) : (
            filteredLends.map((l) => {
              const progressPct =
                l.lentAmount > 0
                  ? Math.min(100, Math.round((l.receivedAmount / l.lentAmount) * 100))
                  : 0;

              const dueInfo = getDueStatusInfo(l.dueDate, l.remainingAmount);

              return (
                <div
                  key={l.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 card-hover flex flex-col justify-between"
                >
                  <div>
                    {/* Header with Title, Actions & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {l.personName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {l.phone && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                              <Phone className="h-3 w-3" /> {l.phone}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            • {formatDate(l.debtDate || l.lendDate)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={l.status} />
                        <button
                          type="button"
                          onClick={() => setEditingDebt(l)}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                          title="Edit Lend"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingDebt(l)}
                          className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                          title="Delete Lend"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {l.purpose && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        Reason: {l.purpose}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Recovery Progress</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {progressPct}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Financial Matrix */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">
                          Lent Given
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {formatINR(l.lentAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block uppercase">
                          Received
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {formatINR(l.receivedAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 block uppercase">
                          Remaining
                        </span>
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                          {formatINR(l.remainingAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Due Date & Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="h-3.5 w-3.5" /> Expected Due:
                      </span>
                      <div className="text-right">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {l.dueDate ? formatDate(l.dueDate) : "No due date"}
                        </span>
                        <span className={cn("text-[10px] font-medium", dueInfo.color)}>
                          {dueInfo.text}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPaymentModalRecord({
                            id: l.id,
                            personName: l.personName,
                            remainingAmount: l.remainingAmount,
                            isBorrow: false,
                          })
                        }
                        disabled={l.remainingAmount <= 0}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white p-2 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Collect
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setHistoryDrawerRecord({
                            id: l.id,
                            personName: l.personName,
                            totalAmount: l.lentAmount,
                            paidAmount: l.receivedAmount,
                            remainingAmount: l.remainingAmount,
                            payments: l.payments,
                            isBorrow: false,
                          })
                        }
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 p-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <History className="h-3.5 w-3.5" /> History ({l.payments.length})
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Borrow / Lend Modal */}
      <AddBorrowLendModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        workspaceId={workspaceId}
        defaultType={addModalType}
        lockType={true}
        onSuccessBorrow={handleAddBorrowSuccess}
        onSuccessLend={handleAddLendSuccess}
      />

      {/* Edit Borrow / Lend Modal */}
      {editingDebt && (
        <EditBorrowLendModal
          isOpen={!!editingDebt}
          onClose={() => setEditingDebt(null)}
          record={editingDebt}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Record Payment Modal */}
      {paymentModalRecord && (
        <RecordLoanPaymentModal
          isOpen={!!paymentModalRecord}
          onClose={() => setPaymentModalRecord(null)}
          debtId={paymentModalRecord.id}
          personName={paymentModalRecord.personName}
          remainingAmount={paymentModalRecord.remainingAmount}
          isBorrow={paymentModalRecord.isBorrow}
          onSuccess={handleRecordPaymentSuccess}
        />
      )}

      {/* Edit Payment Modal (Inside Drawer) */}
      {editingPayment && historyDrawerRecord && (
        <EditLoanPaymentModal
          isOpen={!!editingPayment}
          onClose={() => setEditingPayment(null)}
          payment={editingPayment}
          debtId={historyDrawerRecord.id}
          onSuccess={handleEditPaymentSuccess}
        />
      )}

      {/* Delete Debt Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingDebt}
        onClose={() => setDeletingDebt(null)}
        onConfirm={handleDeleteDebtConfirm}
        title="Delete Record"
        message={
          deletingDebt && (("borrowedAmount" in deletingDebt && deletingDebt.payments.length > 0) || ("lentAmount" in deletingDebt && deletingDebt.payments.length > 0))
            ? `This record contains ${
                "borrowedAmount" in deletingDebt ? deletingDebt.payments.length : deletingDebt.payments.length
              } payment entries. Deleting it will permanently remove all associated payment logs.`
            : `Are you sure you want to delete the record for "${deletingDebt?.personName}"?`
        }
        confirmLabel="Delete Record"
        isDestructive={true}
      />

      {/* Delete Payment Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingPayment}
        onClose={() => setDeletingPayment(null)}
        onConfirm={handleDeletePaymentConfirm}
        title="Delete Payment Installment"
        message={`Delete this payment of ${deletingPayment ? formatINR(deletingPayment.amount) : ""}? The remaining balance on this ledger will be recalculated.`}
        confirmLabel="Delete Payment"
        isDestructive={true}
      />

      {/* Payment History Drawer */}
      {historyDrawerRecord && (
        <Drawer
          isOpen={!!historyDrawerRecord}
          onClose={() => setHistoryDrawerRecord(null)}
          title={`Payment Log: ${historyDrawerRecord.personName}`}
          description={
            historyDrawerRecord.isBorrow
              ? "Installments and repayments made against this borrowed amount."
              : "Installments collected against money lent."
          }
          width="md"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-[10px] text-slate-400">Total</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatINR(historyDrawerRecord.totalAmount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Paid/Received</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatINR(historyDrawerRecord.paidAmount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-rose-600 dark:text-rose-400">Remaining</p>
                <p className="font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  {formatINR(historyDrawerRecord.remainingAmount)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <h4 className="font-bold uppercase tracking-wider text-slate-400">
                Payment Entries ({historyDrawerRecord.payments.length})
              </h4>
              {historyDrawerRecord.remainingAmount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setPaymentModalRecord({
                      id: historyDrawerRecord.id,
                      personName: historyDrawerRecord.personName,
                      remainingAmount: historyDrawerRecord.remainingAmount,
                      isBorrow: historyDrawerRecord.isBorrow,
                    })
                  }
                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Record Installment
                </button>
              )}
            </div>

            {historyDrawerRecord.payments.length === 0 ? (
              <p className="text-center py-6 text-slate-400">No installments recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {historyDrawerRecord.payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Paid via {p.paymentMethod}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(p.date)} {p.notes ? `• ${p.notes}` : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatINR(p.amount)}
                      </span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setEditingPayment(p)}
                          className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          title="Edit Payment"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingPayment(p)}
                          className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Delete Payment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Drawer>
      )}
    </div>
  );
}
