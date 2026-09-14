"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { SupplierPayment } from "@/types/shop";
import { PaymentMethod } from "@/types/common";
import { formatINR } from "@/lib/currency";
import { toISODateString } from "@/lib/date";
import { recordSupplierPayment } from "@/lib/data/shop/supplier-payments";
import { toast } from "sonner";

const supplierPaymentSchema = z.object({
  amount: z.number().positive("Payment amount must be greater than 0"),
  paymentMethod: z.enum(["Cash", "UPI", "Bank", "Credit Card", "Debit Card", "Other"]),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type SupplierPaymentFormValues = z.infer<typeof supplierPaymentSchema>;

export interface RecordSupplierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  supplierId: string;
  supplierName: string;
  pendingAmount: number;
  purchaseId?: string | null;
  billNumber?: string;
  onSuccess?: (payment: SupplierPayment) => void;
}

export function RecordSupplierPaymentModal({
  isOpen,
  onClose,
  workspaceId,
  supplierId,
  supplierName,
  pendingAmount,
  purchaseId,
  billNumber,
  onSuccess,
}: RecordSupplierPaymentModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierPaymentFormValues>({
    resolver: zodResolver(supplierPaymentSchema),
    defaultValues: {
      amount: pendingAmount > 0 ? pendingAmount : 0,
      paymentMethod: "UPI",
      date: toISODateString(),
      notes: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        amount: pendingAmount > 0 ? pendingAmount : 0,
        paymentMethod: "UPI",
        date: toISODateString(),
        notes: billNumber ? `Payment towards Bill #${billNumber}` : "",
      });
    }
  }, [isOpen, pendingAmount, billNumber, reset]);

  const handlePayFullShortcut = () => {
    if (pendingAmount > 0) {
      setValue("amount", pendingAmount);
    }
  };

  const onSubmit = async (data: SupplierPaymentFormValues) => {
    const amt = Number(data.amount);

    if (pendingAmount > 0 && amt > pendingAmount) {
      toast.error(`Payment cannot exceed the remaining balance of ₹${pendingAmount.toLocaleString("en-IN")}.`);
      return;
    }

    try {
      const res = await recordSupplierPayment(workspaceId, {
        supplierId,
        purchaseId: purchaseId || null,
        amount: amt,
        paymentDate: data.date,
        paymentMethod: data.paymentMethod as PaymentMethod,
        notes: data.notes?.trim(),
      });

      if (!res.success) {
        toast.error(res.error || "Failed to record payment.");
        return;
      }

      toast.success(
        `Payment of ${formatINR(amt)} to "${supplierName}" recorded successfully!`
      );

      if (res.payment && onSuccess) {
        onSuccess(res.payment);
      }

      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Unexpected error recording payment.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Supplier Payment"
      description={`Settlement to ${supplierName}.${billNumber ? ` (Bill #${billNumber})` : ""}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Pending Balance Indicator */}
        <div className="flex items-center justify-between rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 p-3 text-xs">
          <div>
            <span className="text-rose-700 dark:text-rose-300 font-medium">Pending Dues:</span>
            <span className="font-bold text-rose-800 dark:text-rose-200 ml-1.5 text-sm">
              {formatINR(pendingAmount)}
            </span>
          </div>

          {pendingAmount > 0 && (
            <button
              type="button"
              onClick={handlePayFullShortcut}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-xs cursor-pointer transition-colors"
            >
              Pay Full {formatINR(pendingAmount, { compact: true })}
            </button>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Amount (₹ INR) *
          </label>
          <input
            type="number"
            step="any"
            placeholder={String(pendingAmount || 1000)}
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
            <option value="UPI">UPI (QR / PhonePe / GPay / Paytm)</option>
            <option value="Cash">Cash Drawer</option>
            <option value="Bank">Bank Transfer / IMPS / NEFT</option>
            <option value="Debit Card">Debit Card</option>
            <option value="Credit Card">Credit Card</option>
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
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
          {errors.date && <p className="mt-1 text-xs text-rose-500">{errors.date.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Notes / Remarks (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Cleared 2 crates balance via PhonePe"
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
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? "Confirming..." : "Confirm Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
