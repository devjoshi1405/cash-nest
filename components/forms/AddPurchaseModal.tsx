"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { PurchaseRecord, PurchasePaymentStatus } from "@/types/shop";
import { PaymentMethod } from "@/types/common";
import { toISODateString } from "@/lib/date";
import { toast } from "sonner";

const purchaseSchema = z.object({
  supplierName: z.string().min(2, "Supplier name is required"),
  billNumber: z.string().min(1, "Bill/Invoice number is required"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  totalAmount: z.number().positive("Total bill amount must be greater than 0"),
  paidAmount: z.number().min(0, "Paid amount cannot be negative"),
  paymentMethod: z.enum(["Cash", "UPI", "Bank", "Credit Card", "Debit Card", "Other"]),
  notes: z.string().optional(),
});

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

export interface AddPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (purchase: PurchaseRecord) => void;
}

export function AddPurchaseModal({ isOpen, onClose, onSuccess }: AddPurchaseModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplierName: "",
      billNumber: "",
      purchaseDate: toISODateString(),
      totalAmount: 0,
      paidAmount: 0,
      paymentMethod: "UPI",
      notes: "",
    },
  });

  const total = watch("totalAmount") || 0;
  const paid = watch("paidAmount") || 0;
  const remaining = Math.max(0, Number(total) - Number(paid));

  let status: PurchasePaymentStatus = "Pending";
  if (Number(paid) >= Number(total) && Number(total) > 0) {
    status = "Paid";
  } else if (Number(paid) > 0) {
    status = "Partially Paid";
  }

  const onSubmit = (data: PurchaseFormValues) => {
    const totalAmt = Number(data.totalAmount);
    const paidAmt = Number(data.paidAmount);
    const remAmt = Math.max(0, totalAmt - paidAmt);

    let paymentStatus: PurchasePaymentStatus = "Pending";
    if (paidAmt >= totalAmt) {
      paymentStatus = "Paid";
    } else if (paidAmt > 0) {
      paymentStatus = "Partially Paid";
    }

    const newPurchase: PurchaseRecord = {
      id: `pur-${Date.now()}`,
      supplierName: data.supplierName,
      billNumber: data.billNumber,
      purchaseDate: data.purchaseDate,
      totalAmount: totalAmt,
      paidAmount: paidAmt,
      remainingAmount: remAmt,
      paymentStatus,
      paymentMethod: data.paymentMethod as PaymentMethod,
      notes: data.notes,
    };

    if (onSuccess) {
      onSuccess(newPurchase);
    }

    toast.success(`Purchase bill ${data.billNumber} from "${data.supplierName}" recorded!`);
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Stock Purchase"
      description="Enter supplier delivery invoice and payment details."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Supplier / Agency Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Raj Cold Drinks & Beverages, Balaji Wafers"
            {...register("supplierName")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
          {errors.supplierName && (
            <p className="mt-1 text-xs text-rose-500">{errors.supplierName.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Bill / Invoice Number *
            </label>
            <input
              type="text"
              placeholder="e.g. RC-8921"
              {...register("billNumber")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none"
            />
            {errors.billNumber && (
              <p className="mt-1 text-xs text-rose-500">{errors.billNumber.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Purchase Date *
            </label>
            <input
              type="date"
              {...register("purchaseDate")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Total Bill Amount (₹) *
            </label>
            <input
              type="number"
              placeholder="12000"
              {...register("totalAmount", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
            />
            {errors.totalAmount && (
              <p className="mt-1 text-xs text-rose-500">{errors.totalAmount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Amount Paid Now (₹)
            </label>
            <input
              type="number"
              placeholder="8000"
              {...register("paidAmount", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
            />
          </div>
        </div>

        {/* Calculated Status & Remaining */}
        <div className="flex items-center justify-between rounded-lg bg-slate-100 dark:bg-slate-800 p-3 text-xs">
          <div>
            <span className="text-slate-500">Remaining Balance: </span>
            <span className="font-bold text-slate-900 dark:text-white">
              ₹{remaining.toLocaleString("en-IN")}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Status: </span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-full ${
                status === "Paid"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : status === "Partially Paid"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
              }`}
            >
              {status}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Method
          </label>
          <select
            {...register("paymentMethod")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank Transfer</option>
            <option value="Other">Credit / Pay Later</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Items / Remarks (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. 20 crates Thums Up, Sprite bottles"
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
            className="rounded-lg bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer"
          >
            Save Purchase
          </button>
        </div>
      </form>
    </Modal>
  );
}
