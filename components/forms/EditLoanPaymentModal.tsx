"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { LoanPaymentHistory } from "@/types/home";
import { updateDebtPayment } from "@/lib/data/home/debts";
import { formatINR } from "@/lib/currency";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const editPaymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["Cash", "UPI", "Bank", "Credit Card", "Debit Card", "Other"]),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type EditPaymentFormValues = z.infer<typeof editPaymentSchema>;

export interface EditLoanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: LoanPaymentHistory | null;
  debtId: string;
  maxAllowedAmount?: number;
  onSuccess: (payment: LoanPaymentHistory) => void;
}

export function EditLoanPaymentModal({
  isOpen,
  onClose,
  payment,
  debtId,
  maxAllowedAmount,
  onSuccess,
}: EditLoanPaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditPaymentFormValues>({
    resolver: zodResolver(editPaymentSchema),
    defaultValues: {
      amount: payment?.amount || 0,
      paymentMethod: (payment?.paymentMethod as any) || "UPI",
      date: payment?.date || "",
      notes: payment?.notes || "",
    },
  });

  useEffect(() => {
    if (payment) {
      reset({
        amount: payment.amount,
        paymentMethod: (payment.paymentMethod as any) || "UPI",
        date: payment.date,
        notes: payment.notes || "",
      });
    }
  }, [payment, reset, isOpen]);

  if (!payment) return null;

  const onSubmit = async (data: EditPaymentFormValues) => {
    if (maxAllowedAmount && Number(data.amount) > maxAllowedAmount) {
      toast.error(
        `Amount cannot exceed maximum balance of ${formatINR(maxAllowedAmount)}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateDebtPayment(payment.id, debtId, {
        amount: Number(data.amount),
        paymentDate: data.date,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      });

      if (!result.success || !result.payment) {
        toast.error(result.error || "Failed to update payment.");
        setIsSubmitting(false);
        return;
      }

      onSuccess(result.payment);
      toast.success("Payment entry updated.");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Payment Entry"
      description="Modify recorded installment details. Remaining debt balance will be updated."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Amount (₹ INR) *
          </label>
          <input
            type="number"
            step="any"
            {...register("amount", { valueAsNumber: true })}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {errors.amount && <p className="mt-1 text-xs text-rose-500">{errors.amount.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Method *
          </label>
          <select
            {...register("paymentMethod")}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank Transfer / NEFT / IMPS</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Debit Card">Debit Card</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Date *
          </label>
          <input
            type="date"
            {...register("date")}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes / Reference
          </label>
          <input
            type="text"
            placeholder="e.g. UPI Ref #1234"
            {...register("notes")}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Payment
          </button>
        </div>
      </form>
    </Modal>
  );
}
