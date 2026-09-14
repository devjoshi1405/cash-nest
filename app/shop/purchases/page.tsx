"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddPurchaseModal } from "@/components/forms/AddPurchaseModal";
import { RecordSupplierPaymentModal } from "@/components/forms/RecordSupplierPaymentModal";
import { formatDate } from "@/lib/date";
import { mockShopPurchases, mockShopPurchaseSummary } from "@/data/shop/purchases";
import { PurchaseRecord, SupplierPayment } from "@/types/shop";
import { Receipt, CheckCircle2, Clock, FileText, Plus, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function ShopPurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(mockShopPurchases);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [paymentModalBill, setPaymentModalBill] = useState<PurchaseRecord | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const totalPurchases = purchases.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalPaid = purchases.reduce((acc, curr) => acc + curr.paidAmount, 0);
  const totalPending = purchases.reduce((acc, curr) => acc + curr.remainingAmount, 0);

  const totalPages = Math.ceil(purchases.length / pageSize);
  const paginatedPurchases = purchases.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleAddPurchaseSuccess = (newPurchase: PurchaseRecord) => {
    setPurchases((prev) => [newPurchase, ...prev]);
  };

  const handleRecordPayment = (payment: SupplierPayment) => {
    if (!paymentModalBill) return;

    setPurchases((prev) =>
      prev.map((item) => {
        if (item.id === paymentModalBill.id) {
          const newPaid = item.paidAmount + payment.amount;
          const newRem = Math.max(0, item.totalAmount - newPaid);
          const newStatus =
            newRem === 0 ? "Paid" : newPaid > 0 ? "Partially Paid" : "Pending";
          return {
            ...item,
            paidAmount: newPaid,
            remainingAmount: newRem,
            paymentStatus: newStatus as any,
          };
        }
        return item;
      })
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Purchases & Invoices"
        description="Record inventory orders from distributors, track bill payments and pending dues."
        badge="🏪 Pan Shop Workspace"
      >
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Purchase Bill
        </button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Purchases This Month"
          amount={totalPurchases || mockShopPurchaseSummary.totalPurchasesThisMonth}
          icon={Receipt}
          colorScheme="amber"
          subtitle="Total stock procurement"
        />

        <StatCard
          title="Total Paid Out"
          amount={totalPaid || mockShopPurchaseSummary.totalPaid}
          icon={CheckCircle2}
          colorScheme="emerald"
          subtitle="Settled to suppliers"
        />

        <StatCard
          title="Pending Supplier Dues"
          amount={totalPending || mockShopPurchaseSummary.totalPending}
          icon={Clock}
          colorScheme="rose"
          badge="Payable"
          subtitle="Outstanding invoices"
        />

        <StatCard
          title="Total Invoices"
          amount={purchases.length}
          isRawString
          icon={FileText}
          colorScheme="blue"
          subtitle="Recorded delivery bills"
        />
      </div>

      {/* Purchases Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Stock Invoices Register
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Supplier delivery slips, total invoice amounts, and payment clearance
            </p>
          </div>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
            {purchases.length} Bills
          </span>
        </div>

        {paginatedPurchases.length === 0 ? (
          <EmptyState
            title="No purchases recorded"
            description="Record wholesale stock invoices from cold drink, snack, or dairy distributors."
            icon={Receipt}
            actionLabel="Add Purchase Bill"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Bill No</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                    Paid
                  </th>
                  <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                    Remaining
                  </th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {paginatedPurchases.map((pur) => (
                  <tr
                    key={pur.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(pur.purchaseDate)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {pur.billNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {pur.supplierName}
                      </span>
                      {pur.notes && (
                        <span className="text-[11px] text-slate-400 truncate max-w-xs block">
                          {pur.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      <CurrencyDisplay amount={pur.totalAmount} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      <CurrencyDisplay amount={pur.paidAmount} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      <CurrencyDisplay amount={pur.remainingAmount} />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={pur.paymentStatus} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {pur.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setPaymentModalBill(pur)}
                        disabled={pur.remainingAmount <= 0}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-100 cursor-pointer"
                        title="Record Payment"
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Pay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {purchases.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={purchases.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Add Purchase Modal */}
      <AddPurchaseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddPurchaseSuccess}
      />

      {/* Record Supplier Payment Modal */}
      {paymentModalBill && (
        <RecordSupplierPaymentModal
          isOpen={!!paymentModalBill}
          onClose={() => setPaymentModalBill(null)}
          supplierId={paymentModalBill.supplierId || "sup-1"}
          supplierName={paymentModalBill.supplierName}
          pendingAmount={paymentModalBill.remainingAmount}
          onSuccess={handleRecordPayment}
        />
      )}
    </div>
  );
}
