"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { StockAdjustment } from "@/types/shop";
import { toISODateString } from "@/lib/date";
import { toast } from "sonner";

const adjustStockSchema = z.object({
  type: z.enum(["addition", "deduction", "damage"]),
  quantity: z.number().positive("Quantity must be greater than 0"),
  reason: z.string().min(2, "Reason is required"),
});

type AdjustStockFormValues = z.infer<typeof adjustStockSchema>;

export interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  currentStock: number;
  unit: string;
  onSuccess: (adjustment: StockAdjustment, newStock: number) => void;
}

export function AdjustStockModal({
  isOpen,
  onClose,
  productId,
  productName,
  currentStock,
  unit,
  onSuccess,
}: AdjustStockModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustStockFormValues>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: {
      type: "addition",
      quantity: 10,
      reason: "",
    },
  });

  const onSubmit = (data: AdjustStockFormValues) => {
    const qty = Number(data.quantity);
    let newStock = currentStock;

    if (data.type === "addition") {
      newStock += qty;
    } else {
      newStock = Math.max(0, currentStock - qty);
    }

    const adj: StockAdjustment = {
      id: `adj-${Date.now()}`,
      productId,
      productName,
      date: toISODateString(),
      type: data.type,
      quantity: qty,
      reason: data.reason,
    };

    onSuccess(adj, newStock);
    toast.success(`Stock for "${productName}" adjusted to ${newStock} ${unit}`);
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Inventory Stock"
      description={`Update physical stock count for "${productName}". Current stock: ${currentStock} ${unit}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Adjustment Action *
          </label>
          <select
            {...register("type")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="addition">+ Restock / Stock In (Addition)</option>
            <option value="deduction">- Manual Stock Out (Correction)</option>
            <option value="damage">⚠️ Damaged / Expired Goods</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Quantity ({unit}) *
          </label>
          <input
            type="number"
            placeholder="10"
            {...register("quantity", { valueAsNumber: true })}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
          />
          {errors.quantity && (
            <p className="mt-1 text-xs text-rose-500">{errors.quantity.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reason / Remark *
          </label>
          <input
            type="text"
            placeholder="e.g. New delivery, Defective bottles, Counter sale"
            {...register("reason")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
          {errors.reason && <p className="mt-1 text-xs text-rose-500">{errors.reason.message}</p>}
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
            Confirm Adjustment
          </button>
        </div>
      </form>
    </Modal>
  );
}
