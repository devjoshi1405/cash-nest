"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { LoanPaymentHistory } from "@/types/home";
import { PaymentMethod } from "@/types/common";
import { formatINR } from "@/lib/currency";
import { toISODateString } from "@/lib/date";
import { toast } from "sonner";

const paymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["Cash", "UPI", "Bank", "Credit Card", "Debit Card", "Other"]),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export interface RecordLoanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  remainingAmount: number;
  isBorrow?: boolean; // true = paying back borrow; false = receiving repayment on lend
  onSuccess: (payment: LoanPaymentHistory) => void;
}

export function RecordLoanPaymentModal({
  isOpen,
  onClose,
  personName,
  remainingAmount,
  isBorrow = true,
  onSuccess,
}: RecordLoanPaymentModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: remainingAmount > 0 ? remainingAmount : 0,
      paymentMethod: "UPI",
      date: toISODateString(),
      notes: "",
    },
  });

  React.useEffect(() => {
    reset({
      amount: remainingAmount > 0 ? remainingAmount : 0,
      paymentMethod: "UPI",
      date: toISODateString(),
      notes: "",
    });
  }, [remainingAmount, isOpen, reset]);

  const onSubmit = (data: PaymentFormValues) => {
    const payment: LoanPaymentHistory = {
      id: `pay-${Date.now()}`,
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod as PaymentMethod,
      date: data.date,
      notes: data.notes,
    };

    onSuccess(payment);
    toast.success(
      isBorrow
        ? `Payment of ₹${data.amount} to ${personName} recorded!`
        : `Received repayment of ₹${data.amount} from ${personName}!`
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBorrow ? "Record Payment Given" : "Record Payment Received"}
      description={`Record installment or final clearance for ${personName}. Current outstanding: ${formatINR(
        remainingAmount
      )}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Amount (₹ INR) *
          </label>
          <input
            type="number"
            placeholder={String(remainingAmount)}
            {...register("amount", { valueAsNumber: true })}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
          />
          {errors.amount && <p className="mt-1 text-xs text-rose-500">{errors.amount.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Method *
          </label>
          <select
            {...register("paymentMethod")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="UPI">UPI (GPay / PhonePe)</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank Transfer</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Date *
          </label>
          <input
            type="date"
            {...register("date")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes / Reference
          </label>
          <input
            type="text"
            placeholder="e.g. Part payment via UPI"
            {...register("notes")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer"
          >
            Record Payment
          </button>
        </div>
      </form>
    </Modal>
  );
}
