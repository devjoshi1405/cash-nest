"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { Product, InventoryMovementType } from "@/types/inventory";
import { recordInventoryMovement } from "@/lib/data/shop/inventory";
import { toISODateString } from "@/lib/date";
import { toast } from "sonner";
import { AlertTriangle, Plus, Minus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const adjustStockSchema = z.object({
  action: z.enum(["in", "out"]),
  reasonType: z.string().min(1, "Please select an adjustment reason"),
  customReason: z.string().optional(),
  quantity: z.number().positive("Quantity must be greater than 0"),
  movementDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type AdjustStockFormValues = z.infer<typeof adjustStockSchema>;

export interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  product: Product | null;
  onSuccess?: (updatedProduct: Product) => void;
}

const STOCK_IN_REASONS = [
  "Found extra stock",
  "Stock count correction",
  "Customer return received",
  "Promotional samples",
  "Manual correction",
  "Other",
];

const STOCK_OUT_REASONS = [
  "Damaged goods",
  "Expired / spoilt",
  "Lost / misplaced",
  "Personal shopkeeper use",
  "Theft / shrinkage",
  "Stock count correction",
  "Defective return to vendor",
  "Other",
];

export function AdjustStockModal({
  isOpen,
  onClose,
  workspaceId,
  product,
  onSuccess,
}: AdjustStockModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AdjustStockFormValues>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: {
      action: "in",
      reasonType: "Stock count correction",
      customReason: "",
      quantity: 5,
      movementDate: toISODateString(new Date()),
      notes: "",
    },
  });

  const selectedAction = watch("action");
  const selectedReason = watch("reasonType");
  const enteredQty = watch("quantity") ?? 0;

  React.useEffect(() => {
    if (isOpen) {
      reset({
        action: "in",
        reasonType: "Stock count correction",
        customReason: "",
        quantity: 5,
        movementDate: toISODateString(new Date()),
        notes: "",
      });
    }
  }, [isOpen, reset]);

  if (!product) return null;

  const currentStock = product.currentStock;
  const unit = product.unit;

  // Calculate new projected stock
  const isStockOut = selectedAction === "out";
  const projectedStock = isStockOut
    ? currentStock - Number(enteredQty)
    : currentStock + Number(enteredQty);

  const isExceedingStock = isStockOut && Number(enteredQty) > currentStock;

  const onSubmit = async (data: AdjustStockFormValues) => {
    if (!workspaceId) {
      toast.error("Shop workspace context is required.");
      return;
    }

    if (isStockOut && data.quantity > currentStock) {
      toast.error(`Adjustment exceeds available stock of ${currentStock} ${unit}.`);
      return;
    }

    const movementType: InventoryMovementType = data.action === "in" ? "adjustment_in" : "adjustment_out";
    const finalReason =
      data.reasonType === "Other" && data.customReason?.trim()
        ? data.customReason.trim()
        : data.reasonType;

    const notesSummary = [finalReason, data.notes?.trim()].filter(Boolean).join(" — ");

    setSubmitting(true);
    try {
      const res = await recordInventoryMovement(workspaceId, {
        productId: product.id,
        movementType,
        quantity: Number(data.quantity),
        unitCost: product.purchasePrice,
        notes: notesSummary,
        referenceType: "manual_adjustment",
        movementDate: data.movementDate ? `${data.movementDate}T12:00:00.000Z` : undefined,
      });

      if (!res.success || !res.product) {
        toast.error(res.error || "Failed to adjust stock.");
        return;
      }

      toast.success(
        `Stock for "${product.name}" updated: ${currentStock} → ${res.product.currentStock} ${unit}.`
      );
      if (onSuccess) {
        onSuccess(res.product);
      }
      onClose();
    } catch (err) {
      toast.error("An unexpected error occurred while adjusting stock.");
    } finally {
      setSubmitting(false);
    }
  };

  const reasonList = selectedAction === "in" ? STOCK_IN_REASONS : STOCK_OUT_REASONS;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Inventory Stock"
      description={`Record manual stock in/out adjustments for "${product.name}".`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Product Stock Card Header */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-sm block">
              {product.name}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {product.category} • Cost: ₹{product.purchasePrice} / {unit}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block uppercase font-semibold">
              Current Available
            </span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {currentStock} {unit}
            </span>
          </div>
        </div>

        {/* Action Toggle (Stock IN vs Stock OUT) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Adjustment Direction *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setValue("action", "in");
                setValue("reasonType", STOCK_IN_REASONS[0]);
              }}
              className={cn(
                "flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                selectedAction === "in"
                  ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              )}
            >
              <Plus className="h-4 w-4 text-emerald-600" />
              <span>+ Add Stock (In)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setValue("action", "out");
                setValue("reasonType", STOCK_OUT_REASONS[0]);
              }}
              className={cn(
                "flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                selectedAction === "out"
                  ? "bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20 shadow-xs"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              )}
            >
              <Minus className="h-4 w-4 text-rose-600" />
              <span>- Remove Stock (Out)</span>
            </button>
          </div>
        </div>

        {/* Quantity & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Quantity ({unit}) *
            </label>
            <input
              type="number"
              step="any"
              min="0.001"
              placeholder="5"
              {...register("quantity", { valueAsNumber: true })}
              className={cn(
                "w-full rounded-lg border bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-1",
                isExceedingStock
                  ? "border-rose-500 text-rose-600 focus:ring-rose-500"
                  : "border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-amber-500"
              )}
            />
            {errors.quantity && (
              <p className="mt-1 text-xs text-rose-500">{errors.quantity.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Adjustment Date *
            </label>
            <input
              type="date"
              {...register("movementDate")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Exceeding Stock Warning */}
        {isExceedingStock && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Adjustment exceeds available stock.</p>
              <p className="text-[11px] opacity-80 mt-0.5">
                Only {currentStock} {unit} are currently in stock. Stock out cannot result in negative inventory.
              </p>
            </div>
          </div>
        )}

        {/* Reason Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reason for Adjustment *
          </label>
          <select
            {...register("reasonType")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            {reasonList.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {selectedReason === "Other" && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Specify Custom Reason *
            </label>
            <input
              type="text"
              placeholder="e.g. Broken packaging during store cleaning"
              {...register("customReason")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Additional Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Reported by helper, returned batch #38"
            {...register("notes")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Stock Impact Summary */}
        <div className="p-3 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-slate-400">Projected Final Stock:</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">{currentStock}</span>
            <span className="text-slate-400">&rarr;</span>
            <span
              className={cn(
                "font-extrabold text-sm",
                projectedStock < 0
                  ? "text-rose-600"
                  : selectedAction === "in"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-900 dark:text-white"
              )}
            >
              {projectedStock} {unit}
            </span>
          </div>
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
            disabled={submitting || isExceedingStock}
            className={cn(
              "rounded-lg px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50 transition-colors",
              selectedAction === "in"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
            )}
          >
            {submitting ? "Applying Adjustment..." : "Confirm Stock Adjustment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
