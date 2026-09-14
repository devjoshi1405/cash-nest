"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { CustomerCreditPayment } from "@/types/shop";
import { PaymentMethod } from "@/types/common";
import { formatINR } from "@/lib/currency";
import { toISODateString } from "@/lib/date";
import { toast } from "sonner";

const custPaymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["Cash", "UPI", "Bank", "Credit Card", "Debit Card", "Other"]),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type CustPaymentFormValues = z.infer<typeof custPaymentSchema>;

export interface RecordCustomerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  remainingAmount: number;
  onSuccess: (payment: CustomerCreditPayment) => void;
}

export function RecordCustomerPaymentModal({
  isOpen,
  onClose,
  customerName,
  remainingAmount,
  onSuccess,
}: RecordCustomerPaymentModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustPaymentFormValues>({
    resolver: zodResolver(custPaymentSchema),
    defaultValues: {
      amount: remainingAmount > 0 ? remainingAmount : 0,
      paymentMethod: "Cash",
      date: toISODateString(),
      notes: "",
    },
  });

  React.useEffect(() => {
    reset({
      amount: remainingAmount > 0 ? remainingAmount : 0,
      paymentMethod: "Cash",
      date: toISODateString(),
      notes: "",
    });
  }, [remainingAmount, isOpen, reset]);

  const onSubmit = (data: CustPaymentFormValues) => {
    const payment: CustomerCreditPayment = {
      id: `cpay-${Date.now()}`,
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod as PaymentMethod,
      date: data.date,
      notes: data.notes,
    };

    onSuccess(payment);
    toast.success(`Received ₹${data.amount} payment from ${customerName}!`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Khata Payment"
      description={`Record collection from ${customerName}. Current pending balance: ${formatINR(
        remainingAmount
      )}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Amount Received (₹ INR) *
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
            Collection Method *
          </label>
          <select
            {...register("paymentMethod")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="Cash">Cash at counter</option>
            <option value="UPI">UPI (QR scan)</option>
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
            Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Part payment after work"
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
            Confirm Collection
          </button>
        </div>
      </form>
    </Modal>
  );
}
