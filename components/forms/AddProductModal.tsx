"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { InventoryProduct, StockStatus } from "@/types/shop";
import { toISODateString } from "@/lib/date";
import { toast } from "sonner";

const productSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  currentStock: z.number().min(0, "Stock cannot be negative"),
  unit: z.enum(["Pcs", "Box", "Pack", "Bottle", "Kg", "Ltr"]),
  purchasePrice: z.number().positive("Purchase price must be greater than 0"),
  sellingPrice: z.number().positive("Selling price must be greater than 0"),
  minThreshold: z.number().min(0, "Minimum threshold must be 0 or more"),
});

type ProductFormValues = z.infer<typeof productSchema>;

export interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (product: InventoryProduct) => void;
  initialData?: InventoryProduct | null;
}

export function AddProductModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: AddProductModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "Cold Drinks",
      currentStock: 10,
      unit: "Bottle",
      purchasePrice: 30,
      sellingPrice: 40,
      minThreshold: 5,
    },
  });

  React.useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        category: initialData.category,
        currentStock: initialData.currentStock,
        unit: initialData.unit,
        purchasePrice: initialData.purchasePrice,
        sellingPrice: initialData.sellingPrice,
        minThreshold: initialData.minThreshold,
      });
    } else {
      reset({
        name: "",
        category: "Cold Drinks",
        currentStock: 20,
        unit: "Bottle",
        purchasePrice: 30,
        sellingPrice: 40,
        minThreshold: 10,
      });
    }
  }, [initialData, isOpen, reset]);

  const onSubmit = (data: ProductFormValues) => {
    const stock = Number(data.currentStock);
    const minThresh = Number(data.minThreshold);
    const purchase = Number(data.purchasePrice);
    const selling = Number(data.sellingPrice);

    let status: StockStatus = "In Stock";
    if (stock <= 0) {
      status = "Out of Stock";
    } else if (stock <= minThresh) {
      status = "Low Stock";
    }

    const product: InventoryProduct = {
      id: initialData ? initialData.id : `inv-${Date.now()}`,
      name: data.name,
      category: data.category,
      currentStock: stock,
      unit: data.unit,
      purchasePrice: purchase,
      sellingPrice: selling,
      stockValue: stock * purchase,
      status,
      minThreshold: minThresh,
      lastRestocked: toISODateString(),
    };

    if (onSuccess) {
      onSuccess(product);
    }

    toast.success(
      initialData
        ? `Product "${data.name}" updated successfully!`
        : `Product "${data.name}" added to inventory!`
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Product" : "Add Inventory Product"}
      description="Define retail item, unit, purchase price, and selling MRP."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Product Title & Packaging *
          </label>
          <input
            type="text"
            placeholder="e.g. Thums Up (750ml Pet Bottle)"
            {...register("name")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
          {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category *
            </label>
            <select
              {...register("category")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Cold Drinks">Cold Drinks</option>
              <option value="Chips & Snacks">Chips & Snacks</option>
              <option value="Water Bottle">Water Bottle</option>
              <option value="Chocolates">Chocolates</option>
              <option value="Mouth Freshener">Mouth Freshener</option>
              <option value="Pan & Fresh Items">Pan & Fresh Items</option>
              <option value="Energy Drinks">Energy Drinks</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Unit Type *
            </label>
            <select
              {...register("unit")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Bottle">Bottle</option>
              <option value="Pack">Pack</option>
              <option value="Pcs">Pcs</option>
              <option value="Box">Box</option>
              <option value="Kg">Kg</option>
              <option value="Ltr">Ltr</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Purchase Cost (₹) *
            </label>
            <input
              type="number"
              step="any"
              placeholder="32"
              {...register("purchasePrice", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
            />
            {errors.purchasePrice && (
              <p className="mt-1 text-xs text-rose-500">{errors.purchasePrice.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Selling MRP (₹) *
            </label>
            <input
              type="number"
              step="any"
              placeholder="40"
              {...register("sellingPrice", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none"
            />
            {errors.sellingPrice && (
              <p className="mt-1 text-xs text-rose-500">{errors.sellingPrice.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Current Stock Qty *
            </label>
            <input
              type="number"
              placeholder="24"
              {...register("currentStock", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-semibold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Low Stock Alert Limit
            </label>
            <input
              type="number"
              placeholder="10"
              {...register("minThreshold", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
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
            className="rounded-lg bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer"
          >
            {initialData ? "Save Changes" : "Save Product"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
