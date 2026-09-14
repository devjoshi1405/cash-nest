"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { CustomerCredit, CustomerCreditPayment } from "@/types/shop";
import { PaymentMethod } from "@/types/common";
import { updateCustomerCreditPayment } from "@/lib/data/shop/customer-credit";
import { formatINR } from "@/lib/currency";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export interface EditCustomerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: CustomerCreditPayment | null;
  credit: CustomerCredit | null;
  onSuccess?: (updatedPayment: CustomerCreditPayment) => void;
}

export function EditCustomerPaymentModal({
  isOpen,
  onClose,
  payment,
  credit,
  onSuccess,
}: EditCustomerPaymentModalProps) {
  const originalCreditAmount = credit ? credit.creditAmount : 0;
  const currentPaymentAmount = payment ? payment.amount : 0;
  const otherPaymentsTotal = credit
    ? (credit.payments || []).reduce(
        (sum, p) => (p.id !== payment?.id ? sum + p.amount : sum),
        0
      )
    : 0;

  const maxAllowed = Math.max(0, originalCreditAmount - otherPaymentsTotal);

  const editPaymentSchema = z
    .object({
      amount: z.number().positive("Amount must be greater than 0"),
      paymentMethod: z.enum(["Cash", "UPI", "Bank", "Credit Card", "Debit Card", "Card", "Other"]),
      date: z.string().min(1, "Date is required"),
      notes: z.string().optional(),
    })
    .refine((data) => data.amount <= maxAllowed, {
      message: `Payment amount cannot exceed ${formatINR(
        maxAllowed
      )} (maximum remaining for this credit).`,
      path: ["amount"],
    });

  type EditPaymentFormValues = z.infer<typeof editPaymentSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditPaymentFormValues>({
    resolver: zodResolver(editPaymentSchema),
    defaultValues: {
      amount: currentPaymentAmount,
      paymentMethod: payment?.paymentMethod || "Cash",
      date: payment?.date || "",
      notes: payment?.notes || "",
    },
  });

  useEffect(() => {
    if (payment && isOpen) {
      reset({
        amount: payment.amount,
        paymentMethod: payment.paymentMethod || "Cash",
        date: payment.date || "",
        notes: payment.notes || "",
      });
    }
  }, [payment, isOpen, reset]);

  if (!payment || !credit) return null;

  const onSubmit = async (data: EditPaymentFormValues) => {
    try {
      const updated = await updateCustomerCreditPayment({
        paymentId: payment.id,
        amount: Number(data.amount),
        date: data.date,
        paymentMethod: data.paymentMethod as PaymentMethod,
        notes: data.notes,
      });

      if (onSuccess) {
        onSuccess(updated);
      }

      toast.success(`Repayment updated to ${formatINR(data.amount)}.`);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to update payment:", err);
      const message = err instanceof Error ? err.message : "Unable to update payment.";
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Khata Repayment"
      description={`Modify repayment receipt for "${credit.customerName}". Max allowed: ${formatINR(
        maxAllowed
      )}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Amount (₹ INR) *
          </label>
          <input
            type="number"
            step="any"
            {...register("amount", { valueAsNumber: true })}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {errors.amount && <p className="mt-1 text-xs text-rose-500">{errors.amount.message}</p>}
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Collection Method *
          </label>
          <select
            {...register("paymentMethod")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="Cash">Cash at Counter</option>
            <option value="UPI">UPI (QR Scan / PhonePe / GPay)</option>
            <option value="Bank">Bank Transfer / IMPS</option>
            <option value="Credit Card">Credit Card POS</option>
            <option value="Debit Card">Debit Card POS</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Date *
          </label>
          <input
            type="date"
            {...register("date")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {errors.date && <p className="mt-1 text-xs text-rose-500">{errors.date.message}</p>}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Adjusted after verification"
            {...register("notes")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Payment
          </button>
        </div>
      </form>
    </Modal>
  );
}
