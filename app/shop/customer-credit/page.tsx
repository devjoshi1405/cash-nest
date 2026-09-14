"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { Drawer } from "@/components/shared/Drawer";
import { AddCustomerCreditModal } from "@/components/forms/AddCustomerCreditModal";
import { RecordCustomerPaymentModal } from "@/components/forms/RecordCustomerPaymentModal";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/currency";
import { mockCustomerCredits, mockCustomerCreditSummary } from "@/data/shop/customer-credit";
import { CustomerCredit, CustomerCreditPayment, CustomerCreditStatus } from "@/types/shop";
import { CreditCard, CheckCircle2, Clock, AlertTriangle, Plus, Phone, History } from "lucide-react";

export default function ShopCustomerCreditPage() {
  const [credits, setCredits] = useState<CustomerCredit[]>(mockCustomerCredits);

  // Modals & Drawers
  const [isAddCreditOpen, setIsAddCreditOpen] = useState(false);
  const [paymentModalCredit, setPaymentModalCredit] = useState<CustomerCredit | null>(null);
  const [historyDrawerCredit, setHistoryDrawerCredit] = useState<CustomerCredit | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const totalCreditGiven = credits.reduce((acc, curr) => acc + curr.creditAmount, 0);
  const totalCollected = credits.reduce((acc, curr) => acc + curr.amountReceived, 0);
  const totalPending = credits.reduce((acc, curr) => acc + curr.remainingAmount, 0);
  const overdueCount = credits.filter((c) => c.status === "Overdue").length;

  const totalPages = Math.ceil(credits.length / pageSize);
  const paginatedCredits = credits.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleAddCreditSuccess = (newCredit: CustomerCredit) => {
    setCredits((prev) => [newCredit, ...prev]);
  };

  const handleRecordPaymentSuccess = (payment: CustomerCreditPayment) => {
    if (!paymentModalCredit) return;

    setCredits((prev) =>
      prev.map((c) => {
        if (c.id === paymentModalCredit.id) {
          const newReceived = c.amountReceived + payment.amount;
          const newRem = Math.max(0, c.creditAmount - newReceived);
          let newStatus: CustomerCreditStatus = "Pending";
          if (newRem === 0) {
            newStatus = "Paid";
          } else if (newReceived > 0) {
            newStatus = "Partial";
          }
          return {
            ...c,
            amountReceived: newReceived,
            remainingAmount: newRem,
            lastPaymentDate: payment.date,
            status: newStatus,
            payments: [payment, ...(c.payments || [])],
          };
        }
        return c;
      })
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Credit (Khata Book)"
        description="Maintain customer ledger accounts for cold drinks, cigarettes, snacks, and daily counter tabs."
        badge="🏪 Pan Shop Workspace"
      >
        <button
          type="button"
          onClick={() => setIsAddCreditOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add to Khata
        </button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Credit Extended"
          amount={totalCreditGiven || mockCustomerCreditSummary.totalCreditGiven}
          icon={CreditCard}
          colorScheme="amber"
          subtitle={`${credits.length} customer credit accounts`}
        />

        <StatCard
          title="Total Collected Back"
          amount={totalCollected || mockCustomerCreditSummary.totalCollected}
          icon={CheckCircle2}
          colorScheme="emerald"
          subtitle="Settled at counter"
        />

        <StatCard
          title="Total Pending Udhar"
          amount={totalPending || mockCustomerCreditSummary.totalPendingCredit}
          icon={Clock}
          colorScheme="rose"
          badge="To Collect"
          subtitle="Current outstanding balance"
        />

        <StatCard
          title="Overdue Accounts"
          amount={overdueCount}
          isRawString
          icon={AlertTriangle}
          colorScheme="violet"
          badge={overdueCount > 0 ? "Follow Up" : "Good"}
          subtitle="Past promised payment date"
        />
      </div>

      {/* Customer Credit Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Active Khata Customers
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customer balances, payment receipts, and collection due dates
            </p>
          </div>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
            {credits.length} Accounts
          </span>
        </div>

        {paginatedCredits.length === 0 ? (
          <EmptyState
            title="No customer credit records"
            description="Start recording customer tabs and credit purchases."
            icon={CreditCard}
            actionLabel="Add Customer Credit"
            onAction={() => setIsAddCreditOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4 text-right">Credit Amount</th>
                  <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                    Collected
                  </th>
                  <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                    Pending
                  </th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {paginatedCredits.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <span>{c.customerName}</span>
                      {c.notes && (
                        <span className="text-[11px] text-slate-400 truncate max-w-xs block font-normal">
                          {c.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {c.phone || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      <CurrencyDisplay amount={c.creditAmount} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      <CurrencyDisplay amount={c.amountReceived} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      <CurrencyDisplay amount={c.remainingAmount} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(c.dueDate)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPaymentModalCredit(c)}
                          disabled={c.remainingAmount <= 0}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-100 cursor-pointer"
                          title="Record Payment"
                        >
                          + Collect
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryDrawerCredit(c)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Payment History"
                        >
                          <History className="h-3.5 w-3.5" />
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
        {credits.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={credits.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Add Customer Credit Modal */}
      <AddCustomerCreditModal
        isOpen={isAddCreditOpen}
        onClose={() => setIsAddCreditOpen(false)}
        onSuccess={handleAddCreditSuccess}
      />

      {/* Record Customer Payment Modal */}
      {paymentModalCredit && (
        <RecordCustomerPaymentModal
          isOpen={!!paymentModalCredit}
          onClose={() => setPaymentModalCredit(null)}
          customerName={paymentModalCredit.customerName}
          remainingAmount={paymentModalCredit.remainingAmount}
          onSuccess={handleRecordPaymentSuccess}
        />
      )}

      {/* Customer Credit History Drawer */}
      {historyDrawerCredit && (
        <Drawer
          isOpen={!!historyDrawerCredit}
          onClose={() => setHistoryDrawerCredit(null)}
          title={`Khata Log: ${historyDrawerCredit.customerName}`}
          description="Repayment history and collection receipts for this customer."
          width="md"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-[10px] text-slate-400">Total Credit</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatINR(historyDrawerCredit.creditAmount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Collected</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatINR(historyDrawerCredit.amountReceived)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-rose-600 dark:text-rose-400">Remaining</p>
                <p className="font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  {formatINR(historyDrawerCredit.remainingAmount)}
                </p>
              </div>
            </div>

            <h4 className="font-bold uppercase tracking-wider text-slate-400 pt-2">
              Collections Recorded ({historyDrawerCredit.payments?.length || 0})
            </h4>

            {!historyDrawerCredit.payments || historyDrawerCredit.payments.length === 0 ? (
              <p className="text-center py-6 text-slate-400">No installments collected yet.</p>
            ) : (
              <div className="space-y-2">
                {historyDrawerCredit.payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Received via {p.paymentMethod}
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
