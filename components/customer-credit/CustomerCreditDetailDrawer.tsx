"use client";

import React, { useState } from "react";
import { Drawer } from "@/components/shared/Drawer";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CustomerCredit, CustomerCreditPayment } from "@/types/shop";
import { formatINR } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { deleteCustomerCreditPayment, deleteCustomerCredit } from "@/lib/data/shop/customer-credit";
import { EditCustomerCreditModal } from "@/components/forms/EditCustomerCreditModal";
import { EditCustomerPaymentModal } from "@/components/forms/EditCustomerPaymentModal";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Phone,
  Calendar,
  AlertTriangle,
  Edit2,
  Trash2,
  Plus,
  ArrowRight,
  Receipt,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface CustomerCreditDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  credit: CustomerCredit | null;
  onCreditUpdated?: () => void;
  onCreditDeleted?: () => void;
  onRecordPaymentClick?: (credit: CustomerCredit) => void;
}

export function CustomerCreditDetailDrawer({
  isOpen,
  onClose,
  credit,
  onCreditUpdated,
  onCreditDeleted,
  onRecordPaymentClick,
}: CustomerCreditDetailDrawerProps) {
  const [isEditCreditOpen, setIsEditCreditOpen] = useState(false);
  const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState<CustomerCreditPayment | null>(
    null
  );
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [deletingCredit, setDeletingCredit] = useState(false);

  if (!credit) return null;

  const payments = credit.payments || [];

  const handleDeletePayment = async (paymentId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this payment record? The customer's remaining balance will increase accordingly."
      )
    ) {
      return;
    }

    try {
      setDeletingPaymentId(paymentId);
      await deleteCustomerCreditPayment(paymentId);
      toast.success("Payment record deleted and remaining balance updated.");
      if (onCreditUpdated) {
        onCreditUpdated();
      }
    } catch (err: unknown) {
      console.error("Failed to delete payment:", err);
      const message = err instanceof Error ? err.message : "Unable to delete payment.";
      toast.error(message);
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const handleDeleteCredit = async () => {
    const hasPayments = payments.length > 0;
    const confirmMessage = hasPayments
      ? `This credit record has ${payments.length} payment(s) recorded. Are you sure you want to delete/archive it?`
      : "Are you sure you want to delete this customer credit record?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingCredit(true);
      await deleteCustomerCredit(credit.id, true);
      toast.success("Customer credit record archived successfully.");
      onClose();
      if (onCreditDeleted) {
        onCreditDeleted();
      }
    } catch (err: unknown) {
      console.error("Failed to delete credit:", err);
      const message = err instanceof Error ? err.message : "Unable to delete credit.";
      toast.error(message);
    } finally {
      setDeletingCredit(false);
    }
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={`Khata Account: ${credit.customerName}`}
        description="Detailed credit ledger, due date status, and installment collection receipts."
        width="lg"
      >
        <div className="space-y-6 text-xs">
          {/* Top Status & Customer Profile Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {credit.customerName}
                </h3>
                {credit.phone ? (
                  <a
                    href={`tel:${credit.phone}`}
                    className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 mt-0.5"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>{credit.phone}</span>
                  </a>
                ) : (
                  <span className="text-slate-400">No phone number recorded</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={credit.status} />
                <button
                  type="button"
                  onClick={() => setIsEditCreditOpen(true)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  title="Edit Credit Details"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCredit}
                  disabled={deletingCredit}
                  className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors disabled:opacity-50"
                  title="Archive / Delete Credit"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Dates & Due Status */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Credit Date</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatDate(credit.creditDate || credit.createdAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Due Date</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {credit.dueDate ? formatDate(credit.dueDate) : "None"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                <div className="w-full">
                  <span className="text-[10px] text-slate-400 block">Timeline Status</span>
                  <span
                    className={cn(
                      "font-semibold",
                      credit.isOverdue
                        ? "text-rose-600 dark:text-rose-400"
                        : credit.remainingAmount === 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-700 dark:text-slate-300"
                    )}
                  >
                    {credit.dueDateStatus || (credit.isOverdue ? "Overdue" : "On schedule")}
                  </span>
                </div>
              </div>
            </div>

            {credit.notes && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-start gap-1.5 text-slate-500 dark:text-slate-400">
                <FileText className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                <p className="italic">{credit.notes}</p>
              </div>
            )}
          </div>

          {/* Financial Breakdown Cards */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-300">
                Original Credit
              </span>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {formatINR(credit.creditAmount)}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
                Total Collected
              </span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatINR(credit.amountReceived)}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 dark:text-rose-300">
                Remaining Balance
              </span>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
                {formatINR(credit.remainingAmount)}
              </p>
            </div>
          </div>

          {/* Collect Payment Action Banner */}
          {credit.remainingAmount > 0 ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-emerald-900 dark:text-emerald-200">
                  Collect Outstanding Balance
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Pending: {formatINR(credit.remainingAmount)} from customer
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRecordPaymentClick && onRecordPaymentClick(credit)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Receive Payment
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 font-semibold">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>This credit account has been fully settled. No pending dues.</span>
            </div>
          )}

          {/* Payment History Log */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-amber-500" />
                Collection Receipts ({payments.length})
              </h4>
              <span className="text-[11px] text-slate-400">Sorted newest first</span>
            </div>

            {payments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No installment payments collected yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Received via {p.paymentMethod}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          {formatDate(p.date)}
                        </span>
                      </div>
                      {p.notes && (
                        <p className="text-[11px] text-slate-400 leading-snug">{p.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatINR(p.amount)}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedPaymentForEdit(p)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Edit Payment"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p.id)}
                          disabled={deletingPaymentId === p.id}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer disabled:opacity-50"
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
        </div>
      </Drawer>

      {/* Edit Customer Credit Modal */}
      {isEditCreditOpen && (
        <EditCustomerCreditModal
          isOpen={isEditCreditOpen}
          credit={credit}
          onClose={() => setIsEditCreditOpen(false)}
          onSuccess={() => {
            if (onCreditUpdated) onCreditUpdated();
          }}
        />
      )}

      {/* Edit Customer Payment Modal */}
      {selectedPaymentForEdit && (
        <EditCustomerPaymentModal
          isOpen={!!selectedPaymentForEdit}
          payment={selectedPaymentForEdit}
          credit={credit}
          onClose={() => setSelectedPaymentForEdit(null)}
          onSuccess={() => {
            if (onCreditUpdated) onCreditUpdated();
          }}
        />
      )}
    </>
  );
}
