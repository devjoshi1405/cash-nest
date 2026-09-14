"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { LoanPaymentHistory } from "@/types/home";
import { PaymentMethod } from "@/types/common";
import { formatINR } from "@/lib/currency";
import { toISODateString } from "@/lib/date";
import { createDebtPayment } from "@/lib/data/home/debts";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";

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
  debtId?: string;
  personName: string;
  remainingAmount: number;
  isBorrow?: boolean; // true = paying back borrow; false = receiving repayment on lend
  onSuccess: (payment: LoanPaymentHistory) => void;
}

export function RecordLoanPaymentModal({
  isOpen,
  onClose,
  debtId,
  personName,
  remainingAmount,
  isBorrow = true,
  onSuccess,
}: RecordLoanPaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: remainingAmount > 0 ? remainingAmount : 0,
      paymentMethod: "UPI",
      date: toISODateString(new Date()),
      notes: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        amount: remainingAmount > 0 ? remainingAmount : 0,
        paymentMethod: "UPI",
        date: toISODateString(new Date()),
        notes: "",
      });
    }
  }, [remainingAmount, isOpen, reset]);

  const handlePayFullRemaining = () => {
    setValue("amount", remainingAmount, { shouldValidate: true });
  };

  const onSubmit = async (data: PaymentFormValues) => {
    if (Number(data.amount) > remainingAmount) {
      toast.error(
        `Payment cannot exceed the remaining balance of ${formatINR(remainingAmount)}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (debtId) {
        const result = await createDebtPayment(debtId, {
          amount: Number(data.amount),
          paymentDate: data.date,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
        });

        if (!result.success || !result.payment) {
          toast.error(result.error || "Failed to record payment.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(result.payment);
      } else {
        const simulatedPayment: LoanPaymentHistory = {
          id: `pay-${Date.now()}`,
          amount: Number(data.amount),
          paymentMethod: data.paymentMethod as PaymentMethod,
          date: data.date,
          notes: data.notes,
        };
        onSuccess(simulatedPayment);
      }

      toast.success(
        isBorrow
          ? `Payment of ${formatINR(data.amount)} to ${personName} recorded!`
          : `Received repayment of ${formatINR(data.amount)} from ${personName}!`
      );
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Unable to record payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBorrow ? "Record Payment Given (I Paid)" : "Record Payment Received (Collected)"}
      description={`Record installment or full settlement for ${personName}. Remaining balance: ${formatINR(
        remainingAmount
      )}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Settlement Shortcut Button */}
        {remainingAmount > 0 && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
            <div>
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium block">
                Full Settlement Shortcut
              </span>
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-100">
                {formatINR(remainingAmount)}
              </span>
            </div>
            <button
              type="button"
              onClick={handlePayFullRemaining}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors shadow-xs"
            >
              <Zap className="h-3 w-3" />
              {isBorrow ? "Pay Full" : "Received Full"}
            </button>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Amount (₹ INR) *
          </label>
          <input
            type="number"
            step="any"
            max={remainingAmount}
            placeholder={String(remainingAmount)}
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
            placeholder="e.g. Part payment via GPay, final installment"
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
            Record Payment
          </button>
        </div>
      </form>
    </Modal>
  );
}
