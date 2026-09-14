"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { Drawer } from "@/components/shared/Drawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddBorrowLendModal } from "@/components/forms/AddBorrowLendModal";
import { RecordLoanPaymentModal } from "@/components/forms/RecordLoanPaymentModal";
import { formatINR } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { mockBorrowRecords, mockLendRecords } from "@/data/home/borrow-lend";
import { BorrowRecord, LendRecord, LoanPaymentHistory, BorrowLendStatus } from "@/types/home";
import {
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  Plus,
  CreditCard,
  History,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function HomeBorrowLendPage() {
  const [activeTab, setActiveTab] = useState<"borrow" | "lend">("borrow");
  const [borrows, setBorrows] = useState<BorrowRecord[]>(mockBorrowRecords);
  const [lends, setLends] = useState<LendRecord[]>(mockLendRecords);

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalType, setAddModalType] = useState<"borrow" | "lend">("borrow");
  const [paymentModalRecord, setPaymentModalRecord] = useState<{
    id: string;
    personName: string;
    remainingAmount: number;
    isBorrow: boolean;
  } | null>(null);
  const [historyDrawerRecord, setHistoryDrawerRecord] = useState<{
    personName: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    payments: LoanPaymentHistory[];
    isBorrow: boolean;
  } | null>(null);

  // Totals
  const totalMoneyToPay = borrows.reduce((acc, curr) => acc + curr.remainingAmount, 0);
  const totalMoneyToReceive = lends.reduce((acc, curr) => acc + curr.remainingAmount, 0);

  const handleAddBorrow = (record: BorrowRecord) => {
    setBorrows((prev) => [record, ...prev]);
  };

  const handleAddLend = (record: LendRecord) => {
    setLends((prev) => [record, ...prev]);
  };

  const handleRecordPayment = (payment: LoanPaymentHistory) => {
    if (!paymentModalRecord) return;

    if (paymentModalRecord.isBorrow) {
      setBorrows((prev) =>
        prev.map((item) => {
          if (item.id === paymentModalRecord.id) {
            const newPaid = item.paidAmount + payment.amount;
            const newRemaining = Math.max(0, item.borrowedAmount - newPaid);
            const newStatus: BorrowLendStatus =
              newRemaining === 0 ? "Paid" : newPaid > 0 ? "Partially Paid" : "Unpaid";
            return {
              ...item,
              paidAmount: newPaid,
              remainingAmount: newRemaining,
              status: newStatus,
              payments: [payment, ...item.payments],
            };
          }
          return item;
        })
      );
    } else {
      setLends((prev) =>
        prev.map((item) => {
          if (item.id === paymentModalRecord.id) {
            const newReceived = item.receivedAmount + payment.amount;
            const newRemaining = Math.max(0, item.lentAmount - newReceived);
            const newStatus: BorrowLendStatus =
              newRemaining === 0 ? "Paid" : newReceived > 0 ? "Partially Paid" : "Unpaid";
            return {
              ...item,
              receivedAmount: newReceived,
              remainingAmount: newRemaining,
              status: newStatus,
              payments: [payment, ...item.payments],
            };
          }
          return item;
        })
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Borrow & Lend Ledger"
        description="Track money borrowed from individuals and loans given to friends, family, or contacts."
        badge="🏠 Home Workspace"
      >
        <div className="flex items-center gap-2">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Money To Pay (I Owe)"
          amount={totalMoneyToPay}
          icon={ArrowUpRight}
          colorScheme="amber"
          subtitle={`${borrows.filter((b) => b.remainingAmount > 0).length} active borrowings`}
          badge="Liabilities"
        />

        <StatCard
          title="Total Money To Receive (They Owe)"
          amount={totalMoneyToReceive}
          icon={ArrowDownLeft}
          colorScheme="emerald"
          subtitle={`${lends.filter((l) => l.remainingAmount > 0).length} active lendings`}
          badge="Receivables"
        />
      </div>

      {/* Main Tabs Segment */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
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

      {/* Tab Content: Borrow Records */}
      {activeTab === "borrow" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {borrows.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="No borrow records"
                description="You have no outstanding money owed to others."
                icon={HandCoins}
                actionLabel="Add Borrow Record"
                onAction={() => {
                  setAddModalType("borrow");
                  setIsAddModalOpen(true);
                }}
              />
            </div>
          ) : (
            borrows.map((b) => {
              const progressPct =
                b.borrowedAmount > 0
                  ? Math.min(100, Math.round((b.paidAmount / b.borrowedAmount) * 100))
                  : 0;

              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 card-hover flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {b.personName}
                        </h4>
                        {b.phone && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <Phone className="h-3 w-3" /> {b.phone}
                          </div>
                        )}
                      </div>
                      <StatusBadge status={b.status} />
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
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" /> Due Date:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatDate(b.dueDate)}
                      </span>
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
                        <History className="h-3.5 w-3.5" /> History
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab Content: Lend Records */}
      {activeTab === "lend" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {lends.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="No lending records"
                description="You have not lent money to anyone currently."
                icon={HandCoins}
                actionLabel="Add Lend Record"
                onAction={() => {
                  setAddModalType("lend");
                  setIsAddModalOpen(true);
                }}
              />
            </div>
          ) : (
            lends.map((l) => {
              const progressPct =
                l.lentAmount > 0
                  ? Math.min(100, Math.round((l.receivedAmount / l.lentAmount) * 100))
                  : 0;

              return (
                <div
                  key={l.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 card-hover flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {l.personName}
                        </h4>
                        {l.phone && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <Phone className="h-3 w-3" /> {l.phone}
                          </div>
                        )}
                      </div>
                      <StatusBadge status={l.status} />
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
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" /> Expected Due:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatDate(l.dueDate)}
                      </span>
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
                        <History className="h-3.5 w-3.5" /> History
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
        defaultType={addModalType}
        onSuccessBorrow={handleAddBorrow}
        onSuccessLend={handleAddLend}
      />

      {/* Record Payment Modal */}
      {paymentModalRecord && (
        <RecordLoanPaymentModal
          isOpen={!!paymentModalRecord}
          onClose={() => setPaymentModalRecord(null)}
          personName={paymentModalRecord.personName}
          remainingAmount={paymentModalRecord.remainingAmount}
          isBorrow={paymentModalRecord.isBorrow}
          onSuccess={handleRecordPayment}
        />
      )}

      {/* Transaction & Payment History Drawer */}
      {historyDrawerRecord && (
        <Drawer
          isOpen={!!historyDrawerRecord}
          onClose={() => setHistoryDrawerRecord(null)}
          title={`Payment Log: ${historyDrawerRecord.personName}`}
          description={
            historyDrawerRecord.isBorrow
              ? "History of repayments made against this borrowed amount."
              : "History of repayments collected against money lent."
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

            <h4 className="font-bold uppercase tracking-wider text-slate-400 pt-2">
              Payment Entries ({historyDrawerRecord.payments.length})
            </h4>

            {historyDrawerRecord.payments.length === 0 ? (
              <p className="text-center py-6 text-slate-400">No installments logged yet.</p>
            ) : (
              <div className="space-y-2">
                {historyDrawerRecord.payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Paid via {p.paymentMethod}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(p.date)} {p.notes ? `• ${p.notes}` : ""}
                      </span>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatINR(p.amount)}
                    </span>
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
