"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { CustomerCreditPayment } from "@/types/shop";
import { PaymentMethod } from "@/types/common";
import { formatINR } from "@/lib/currency";
import { toISODateString } from "@/lib/date";
import { recordCustomerCreditPayment } from "@/lib/data/shop/customer-credit";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";

export interface RecordCustomerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditId: string;
  customerName: string;
  remainingAmount: number;
  onSuccess?: (payment: CustomerCreditPayment) => void;
}

export function RecordCustomerPaymentModal({
  isOpen,
  onClose,
  creditId,
  customerName,
  remainingAmount,
  onSuccess,
}: RecordCustomerPaymentModalProps) {
  const custPaymentSchema = z
    .object({
      amount: z.number().positive("Amount must be greater than 0"),
      paymentMethod: z.enum(["Cash", "UPI", "Bank", "Credit Card", "Debit Card", "Card", "Other"]),
      date: z.string().min(1, "Date is required"),
      notes: z.string().optional(),
    })
    .refine((data) => data.amount <= remainingAmount, {
      message: `Payment cannot exceed the remaining balance of ${formatINR(remainingAmount)}.`,
      path: ["amount"],
    });

  type CustPaymentFormValues = z.infer<typeof custPaymentSchema>;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustPaymentFormValues>({
    resolver: zodResolver(custPaymentSchema),
    defaultValues: {
      amount: remainingAmount > 0 ? remainingAmount : ("" as unknown as number),
      paymentMethod: "Cash",
      date: toISODateString(new Date()),
      notes: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        amount: remainingAmount > 0 ? remainingAmount : ("" as unknown as number),
        paymentMethod: "Cash",
        date: toISODateString(new Date()),
        notes: "",
      });
    }
  }, [remainingAmount, isOpen, reset]);

  const handleFullPaymentShortcut = () => {
    setValue("amount", remainingAmount, { shouldValidate: true });
  };

  const onSubmit = async (data: CustPaymentFormValues) => {
    try {
      const payment = await recordCustomerCreditPayment({
        creditId,
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod as PaymentMethod,
        date: data.date,
        notes: data.notes,
      });

      if (onSuccess) {
        onSuccess(payment);
      }

      toast.success(`Received ${formatINR(data.amount)} payment from ${customerName}!`);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to record customer payment:", err);
      const message = err instanceof Error ? err.message : "Unable to record payment.";
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Khata Repayment"
      description={`Record collection from "${customerName}". Outstanding balance: ${formatINR(
        remainingAmount
      )}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Payment Shortcut */}
        {remainingAmount > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
            <span className="text-emerald-800 dark:text-emerald-300 font-medium">
              Full Outstanding: <span className="font-bold">{formatINR(remainingAmount)}</span>
            </span>
            <button
              type="button"
              onClick={handleFullPaymentShortcut}
              className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 dark:hover:bg-emerald-800 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              <Zap className="h-3 w-3" /> Receive Full {formatINR(remainingAmount)}
            </button>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Amount Received (₹ INR) *
          </label>
          <input
            type="number"
            step="any"
            placeholder={String(remainingAmount)}
            {...register("amount", { valueAsNumber: true })}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {errors.amount && <p className="mt-1 text-xs text-rose-500">{errors.amount.message}</p>}
        </div>

        {/* Collection Method */}
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
            placeholder="e.g. Paid cash after evening shift"
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
            Confirm Collection
          </button>
        </div>
      </form>
    </Modal>
  );
}
