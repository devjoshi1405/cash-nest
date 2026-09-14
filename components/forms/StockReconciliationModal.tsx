"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { Product } from "@/types/inventory";
import { recordStockReconciliation } from "@/lib/data/shop/inventory";
import { toISODateString } from "@/lib/date";
import { toast } from "sonner";
import { Scale, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const reconciliationSchema = z.object({
  physicalStock: z.number().min(0, "Physical stock count cannot be negative"),
  reason: z.string().optional(),
  movementDate: z.string().min(1, "Date is required"),
});

type ReconciliationFormValues = z.infer<typeof reconciliationSchema>;

export interface StockReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  product: Product | null;
  onSuccess?: (updatedProduct: Product) => void;
}

export function StockReconciliationModal({
  isOpen,
  onClose,
  workspaceId,
  product,
  onSuccess,
}: StockReconciliationModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReconciliationFormValues>({
    resolver: zodResolver(reconciliationSchema),
    defaultValues: {
      physicalStock: 0,
      reason: "Physical inventory audit count",
      movementDate: toISODateString(new Date()),
    },
  });

  const enteredPhysical = watch("physicalStock") ?? 0;

  React.useEffect(() => {
    if (product && isOpen) {
      reset({
        physicalStock: product.currentStock,
        reason: "Physical stock audit count correction",
        movementDate: toISODateString(new Date()),
      });
    }
  }, [product, isOpen, reset]);

  if (!product) return null;

  const systemStock = product.currentStock;
  const difference = Math.round((Number(enteredPhysical) - systemStock) * 1000) / 1000;

  const onSubmit = async (data: ReconciliationFormValues) => {
    if (!workspaceId) {
      toast.error("Shop workspace context is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await recordStockReconciliation(workspaceId, {
        productId: product.id,
        physicalStock: Number(data.physicalStock),
        reason: data.reason?.trim() || "Physical inventory audit count correction",
        movementDate: data.movementDate ? `${data.movementDate}T12:00:00.000Z` : undefined,
      });

      if (!res.success || !res.product) {
        toast.error(res.error || "Failed to reconcile stock count.");
        return;
      }

      if (difference === 0) {
        toast.info(`Stock count for "${product.name}" verified with no difference.`);
      } else {
        toast.success(
          `Stock count reconciled for "${product.name}": ${systemStock} → ${res.product.currentStock} ${product.unit} (${difference > 0 ? `+${difference}` : difference}).`
        );
      }

      if (onSuccess) {
        onSuccess(res.product);
      }
      onClose();
    } catch (err) {
      toast.error("An error occurred while reconciling stock.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Count Reconciliation"
      description={`Perform physical stock audit and reconcile system counts for "${product.name}".`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Product Overview Header */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-sm block">
              {product.name}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {product.category} • {product.unit}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block uppercase font-semibold">
              System Stock
            </span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {systemStock} {product.unit}
            </span>
          </div>
        </div>

        {/* Physical Stock Input & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Actual Physical Stock Count *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 18"
              {...register("physicalStock", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-black focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {errors.physicalStock && (
              <p className="mt-1 text-xs text-rose-500">{errors.physicalStock.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Count Audit Date *
            </label>
            <input
              type="date"
              {...register("movementDate")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Difference Calculation Widget */}
        <div
          className={cn(
            "p-3.5 rounded-xl border flex items-center justify-between text-xs transition-colors",
            difference === 0
              ? "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
              : difference > 0
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
          )}
        >
          <div className="flex items-center gap-2.5">
            <Scale
              className={cn(
                "h-5 w-5 shrink-0",
                difference === 0
                  ? "text-slate-400"
                  : difference > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                {difference === 0
                  ? "Exact Match"
                  : difference > 0
                  ? `Stock Surplus (+${difference} ${product.unit})`
                  : `Stock Shortage (${difference} ${product.unit})`}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {difference === 0
                  ? "System count matches physical shelf count perfectly."
                  : difference > 0
                  ? `System will log an automatic Adjustment IN of ${difference} ${product.unit}.`
                  : `System will log an automatic Adjustment OUT of ${Math.abs(difference)} ${product.unit}.`}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span
              className={cn(
                "text-lg font-black block",
                difference === 0
                  ? "text-slate-500"
                  : difference > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {difference > 0 ? `+${difference}` : difference}
            </span>
            <span className="text-[10px] text-slate-400 uppercase">Adjustment Delta</span>
          </div>
        </div>

        {/* Reason / Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reason / Audit Remarks
          </label>
          <input
            type="text"
            placeholder="e.g. End of week physical stock count audit"
            {...register("reason")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
          >
            {submitting ? "Reconciling..." : "Save Physical Count"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
