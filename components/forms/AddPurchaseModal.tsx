"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { PurchaseRecord, PurchasePaymentStatus, Supplier } from "@/types/shop";
import { PaymentMethod } from "@/types/common";
import { toISODateString } from "@/lib/date";
import { createShopPurchase } from "@/lib/data/shop/purchases";
import { getShopSuppliers } from "@/lib/data/shop/suppliers";
import { toast } from "sonner";

const purchaseSchema = z.object({
  supplierId: z.string().min(1, "Please select a supplier"),
  billNumber: z.string().optional(),
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
  workspaceId: string;
  initialSupplierId?: string;
  suppliersList?: Supplier[];
  onSuccess?: (purchase: PurchaseRecord) => void;
}

export function AddPurchaseModal({
  isOpen,
  onClose,
  workspaceId,
  initialSupplierId,
  suppliersList: propSuppliers,
  onSuccess,
}: AddPurchaseModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(propSuppliers || []);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplierId: initialSupplierId || "",
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

  useEffect(() => {
    if (isOpen) {
      if (initialSupplierId) {
        setValue("supplierId", initialSupplierId);
      }
      if (!propSuppliers || propSuppliers.length === 0) {
        setLoadingSuppliers(true);
        getShopSuppliers(workspaceId, { includeArchived: false })
          .then((list) => {
            setSuppliers(list);
            if (!initialSupplierId && list.length > 0) {
              setValue("supplierId", list[0].id);
            }
          })
          .finally(() => setLoadingSuppliers(false));
      } else {
        setSuppliers(propSuppliers);
        if (!initialSupplierId && propSuppliers.length > 0) {
          setValue("supplierId", propSuppliers[0].id);
        }
      }
    }
  }, [isOpen, workspaceId, initialSupplierId, propSuppliers, setValue]);

  const onSubmit = async (data: PurchaseFormValues) => {
    const totalAmt = Number(data.totalAmount);
    const paidAmt = Number(data.paidAmount);

    if (paidAmt > totalAmt) {
      toast.error("Initial payment cannot exceed the purchase total.");
      return;
    }

    try {
      const res = await createShopPurchase(workspaceId, {
        supplierId: data.supplierId,
        billNumber: data.billNumber?.trim(),
        purchaseDate: data.purchaseDate,
        totalAmount: totalAmt,
        initialPaidAmount: paidAmt,
        paymentMethod: data.paymentMethod as PaymentMethod,
        notes: data.notes?.trim(),
      });

      if (!res.success) {
        toast.error(res.error || "Failed to record purchase.");
        return;
      }

      toast.success(
        `Purchase bill ${data.billNumber ? `#${data.billNumber}` : ""} recorded successfully!`
      );

      if (res.purchase && onSuccess) {
        onSuccess(res.purchase);
      }

      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Unexpected error saving purchase.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Stock Purchase"
      description="Enter wholesale distributor delivery invoice and payment details."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Supplier / Wholesale Vendor *
          </label>
          <select
            {...register("supplierId")}
            disabled={loadingSuppliers}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          >
            {suppliers.length === 0 ? (
              <option value="">
                {loadingSuppliers ? "Loading suppliers..." : "No suppliers found. Please add a supplier first."}
              </option>
            ) : (
              suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ""}
                </option>
              ))
            )}
          </select>
          {errors.supplierId && (
            <p className="mt-1 text-xs text-rose-500">{errors.supplierId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Bill / Invoice Number (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. RC-8921"
              {...register("billNumber")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none"
            />
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
              placeholder="10000"
              step="any"
              {...register("totalAmount", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
            />
            {errors.totalAmount && (
              <p className="mt-1 text-xs text-rose-500">{errors.totalAmount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Initial Paid Amount (₹)
            </label>
            <input
              type="number"
              placeholder="0"
              step="any"
              {...register("paidAmount", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
            />
            {errors.paidAmount && (
              <p className="mt-1 text-xs text-rose-500">{errors.paidAmount.message}</p>
            )}
          </div>
        </div>

        {/* Live Calculation Box */}
        <div className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-800/80 p-3.5 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Remaining Balance: </span>
            <span className="font-bold text-slate-900 dark:text-white ml-1">
              ₹{remaining.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Status: </span>
            <span
              className={`font-semibold px-2.5 py-0.5 rounded-full ${
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
            <option value="UPI">UPI (QR / PhonePe / GPay)</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank Transfer / NEFT</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Debit Card">Debit Card</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes / Goods Description (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. 15 crates Thums Up, 5 boxes Balaji Wafers"
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
            disabled={isSubmitting || suppliers.length === 0}
            className="rounded-lg bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? "Saving Purchase..." : "Save Purchase"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
