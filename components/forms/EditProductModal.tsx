"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { Product, ProductInput, COMMON_PAN_SHOP_CATEGORIES, COMMON_PRODUCT_UNITS } from "@/types/inventory";
import { updateProduct } from "@/lib/data/shop/products";
import { toast } from "sonner";
import { AlertTriangle, Info, TrendingUp } from "lucide-react";
import { formatINR } from "@/lib/currency";

const editProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  category: z.string().min(1, "Category is required"),
  customCategory: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  customUnit: z.string().optional(),
  purchasePrice: z.number().min(0, "Purchase cost cannot be negative"),
  sellingPrice: z.number().min(0, "Selling MRP cannot be negative"),
  lowStockThreshold: z.number().min(0, "Low stock limit cannot be negative"),
});

type EditProductFormValues = z.infer<typeof editProductSchema>;

export interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  product: Product | null;
  onSuccess?: (product: Product) => void;
  existingCategories?: string[];
  onOpenAdjustStock?: (product: Product) => void;
}

export function EditProductModal({
  isOpen,
  onClose,
  workspaceId,
  product,
  onSuccess,
  existingCategories = [],
  onOpenAdjustStock,
}: EditProductModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomUnit, setIsCustomUnit] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditProductFormValues>({
    resolver: zodResolver(editProductSchema),
  });

  const purchasePrice = watch("purchasePrice") ?? 0;
  const sellingPrice = watch("sellingPrice") ?? 0;

  const unitMargin = Math.round((Number(sellingPrice) - Number(purchasePrice)) * 100) / 100;
  const marginPercentage =
    Number(purchasePrice) > 0
      ? Math.round(((Number(sellingPrice) - Number(purchasePrice)) / Number(purchasePrice)) * 1000) / 10
      : 0;
  const isLossWarning =
    Number(sellingPrice) > 0 &&
    Number(purchasePrice) > 0 &&
    Number(sellingPrice) < Number(purchasePrice);

  useEffect(() => {
    if (product && isOpen) {
      const isCustomCat = !COMMON_PAN_SHOP_CATEGORIES.includes(product.category as any);
      const isCustomU = !COMMON_PRODUCT_UNITS.includes(product.unit as any);

      reset({
        name: product.name,
        category: isCustomCat ? "custom_new" : product.category,
        customCategory: isCustomCat ? product.category : "",
        unit: isCustomU ? "custom_unit" : product.unit,
        customUnit: isCustomU ? product.unit : "",
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        lowStockThreshold: product.lowStockThreshold,
      });

      setIsCustomCategory(isCustomCat);
      setIsCustomUnit(isCustomU);
    }
  }, [product, isOpen, reset]);

  if (!product) return null;

  const allCategoryOptions = Array.from(
    new Set([...COMMON_PAN_SHOP_CATEGORIES, ...existingCategories])
  ).sort();

  const onSubmit = async (data: EditProductFormValues) => {
    if (!workspaceId) {
      toast.error("Shop workspace context is required.");
      return;
    }

    const finalCategory = isCustomCategory
      ? data.customCategory?.trim() || "Other"
      : data.category;
    const finalUnit = isCustomUnit
      ? data.customUnit?.trim() || "Piece"
      : data.unit;

    const payload: Partial<ProductInput> = {
      name: data.name.trim(),
      category: finalCategory,
      unit: finalUnit,
      purchasePrice: Number(data.purchasePrice),
      sellingPrice: Number(data.sellingPrice),
      lowStockThreshold: Number(data.lowStockThreshold),
    };

    setSubmitting(true);
    try {
      const res = await updateProduct(product.id, workspaceId, payload);
      if (!res.success || !res.product) {
        toast.error(res.error || "Failed to update product.");
        return;
      }

      toast.success(`Product "${res.product.name}" updated successfully.`);
      if (onSuccess) {
        onSuccess(res.product);
      }
      onClose();
    } catch (err) {
      toast.error("An unexpected error occurred while updating product.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Product Details"
      description={`Update pricing, packaging and thresholds for "${product.name}".`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Product Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Product Title & Size / Packaging *
          </label>
          <input
            type="text"
            {...register("name")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
        </div>

        {/* Category & Unit Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category *
            </label>
            {!isCustomCategory ? (
              <select
                {...register("category")}
                onChange={(e) => {
                  if (e.target.value === "custom_new") {
                    setIsCustomCategory(true);
                  }
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {allCategoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="custom_new">+ Add Custom Category...</option>
              </select>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Enter category name"
                  {...register("customCategory")}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(false)}
                  className="px-2 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Unit of Measurement *
            </label>
            {!isCustomUnit ? (
              <select
                {...register("unit")}
                onChange={(e) => {
                  if (e.target.value === "custom_unit") {
                    setIsCustomUnit(true);
                  }
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {COMMON_PRODUCT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
                <option value="custom_unit">+ Custom Unit...</option>
              </select>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. Sachet, Roll"
                  {...register("customUnit")}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomUnit(false)}
                  className="px-2 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Wholesale Purchase Cost (₹) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              {...register("purchasePrice", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {errors.purchasePrice && (
              <p className="mt-1 text-xs text-rose-500">{errors.purchasePrice.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Retail Selling MRP (₹) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              {...register("sellingPrice", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {errors.sellingPrice && (
              <p className="mt-1 text-xs text-rose-500">{errors.sellingPrice.message}</p>
            )}
          </div>
        </div>

        {/* Margin Preview */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              Estimated Unit Margin:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-bold ${
                unitMargin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatINR(unitMargin)} / unit
            </span>
            <span className="text-slate-400">({marginPercentage}%)</span>
          </div>
        </div>

        {/* Warning if loss */}
        {isLossWarning && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Selling price is lower than purchase price.</p>
              <p className="text-[11px] opacity-80 mt-0.5">
                Selling at ₹{sellingPrice} while costing ₹{purchasePrice} results in a loss of ₹{Math.abs(unitMargin)} per unit.
              </p>
            </div>
          </div>
        )}

        {/* Low Stock Limit & Stock Notice */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Low Stock Alert Limit
            </label>
            <input
              type="number"
              step="any"
              min="0"
              {...register("lowStockThreshold", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Current Stock:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {product.currentStock} {product.unit}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-400">Inventory Value:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {formatINR(product.inventoryValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Stock Mutation Rule Info Alert */}
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Stock quantity cannot be edited directly.</p>
            <p className="text-[11px] opacity-80 mt-0.5">
              To preserve complete movement history, use <strong>Adjust Stock</strong> or <strong>Stock Count Reconciliation</strong> to modify quantities.
            </p>
          </div>
          {onOpenAdjustStock && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdjustStock(product);
              }}
              className="text-xs font-bold text-blue-700 dark:text-blue-300 underline hover:opacity-80 shrink-0"
            >
              Adjust Stock Now
            </button>
          )}
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
            {submitting ? "Saving Changes..." : "Save Product Details"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
