"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { SupplierPayment } from "@/types/shop";
import { PaymentMethod } from "@/types/common";
import { formatINR } from "@/lib/currency";
import { toISODateString } from "@/lib/date";
import { toast } from "sonner";

const supplierPaymentSchema = z.object({
  amount: z.number().positive("Payment amount must be greater than 0"),
  paymentMethod: z.enum(["Cash", "UPI", "Bank", "Credit Card", "Debit Card", "Other"]),
  date: z.string().min(1, "Date is required"),
  billNumber: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierPaymentFormValues = z.infer<typeof supplierPaymentSchema>;

export interface RecordSupplierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string;
  supplierName: string;
  pendingAmount: number;
  onSuccess: (payment: SupplierPayment) => void;
}

export function RecordSupplierPaymentModal({
  isOpen,
  onClose,
  supplierId,
  supplierName,
  pendingAmount,
  onSuccess,
}: RecordSupplierPaymentModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierPaymentFormValues>({
    resolver: zodResolver(supplierPaymentSchema),
    defaultValues: {
      amount: pendingAmount > 0 ? pendingAmount : 0,
      paymentMethod: "UPI",
      date: toISODateString(),
      billNumber: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    reset({
      amount: pendingAmount > 0 ? pendingAmount : 0,
      paymentMethod: "UPI",
      date: toISODateString(),
      billNumber: "",
      notes: "",
    });
  }, [pendingAmount, isOpen, reset]);

  const onSubmit = (data: SupplierPaymentFormValues) => {
    const payment: SupplierPayment = {
      id: `spay-${Date.now()}`,
      supplierId,
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod as PaymentMethod,
      date: data.date,
      billNumber: data.billNumber,
      notes: data.notes,
    };

    onSuccess(payment);
    toast.success(`Payment of ₹${data.amount} to "${supplierName}" recorded!`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Supplier Payment"
      description={`Pay pending dues to ${supplierName}. Current pending balance: ${formatINR(
        pendingAmount
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
            placeholder={String(pendingAmount)}
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
            <option value="UPI">UPI (QR / PhonePe / GPay)</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank Transfer / IMPS</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
              Bill Ref # (Opt)
            </label>
            <input
              type="text"
              placeholder="e.g. RC-8921"
              {...register("billNumber")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Cleared 2 crates balance"
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
            Confirm Payment
          </button>
        </div>
      </form>
    </Modal>
  );
}
