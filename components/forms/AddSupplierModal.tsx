"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { Supplier } from "@/types/shop";
import { toISODateString } from "@/lib/date";
import { toast } from "sonner";

const supplierSchema = z.object({
  name: z.string().min(2, "Supplier name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  category: z.string().min(1, "Category is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  address: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

export interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (supplier: Supplier) => void;
  initialData?: Supplier | null;
}

export function AddSupplierModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: AddSupplierModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      phone: "",
      category: "Beverages & Soft Drinks",
      email: "",
      address: "",
    },
  });

  React.useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        phone: initialData.phone,
        category: initialData.category,
        email: initialData.email || "",
        address: initialData.address || "",
      });
    } else {
      reset({
        name: "",
        phone: "",
        category: "Beverages & Soft Drinks",
        email: "",
        address: "",
      });
    }
  }, [initialData, isOpen, reset]);

  const onSubmit = (data: SupplierFormValues) => {
    const supplier: Supplier = {
      id: initialData ? initialData.id : `sup-${Date.now()}`,
      name: data.name,
      phone: data.phone,
      category: data.category,
      email: data.email || undefined,
      address: data.address || undefined,
      totalPurchases: initialData ? initialData.totalPurchases : 0,
      totalPaid: initialData ? initialData.totalPaid : 0,
      pendingAmount: initialData ? initialData.pendingAmount : 0,
      lastPurchaseDate: initialData ? initialData.lastPurchaseDate : toISODateString(),
      purchasesCount: initialData ? initialData.purchasesCount : 0,
      paymentHistory: initialData ? initialData.paymentHistory : [],
    };

    if (onSuccess) {
      onSuccess(supplier);
    }

    toast.success(
      initialData
        ? `Supplier "${data.name}" updated successfully!`
        : `Supplier "${data.name}" added successfully!`
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Supplier" : "Add Vendor / Supplier"}
      description="Save distributor contact details and product category."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Supplier / Distributor Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Raj Cold Drinks & Beverages"
            {...register("name")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
          {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone Number *
            </label>
            <input
              type="text"
              placeholder="+91 98765 43210"
              {...register("phone")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            />
            {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Supply Category *
            </label>
            <select
              {...register("category")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Beverages & Soft Drinks">Beverages & Soft Drinks</option>
              <option value="Chips & Farsan">Chips & Farsan</option>
              <option value="Dairy & Ice Creams">Dairy & Ice Creams</option>
              <option value="Pan Ingredients & Spices">Pan Ingredients & Spices</option>
              <option value="Chocolates & Candies">Chocolates & Candies</option>
              <option value="Water Bottles">Water Bottles</option>
              <option value="Packaging & Misc">Packaging & Misc</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Email Address (Optional)
          </label>
          <input
            type="email"
            placeholder="distributor.sales@gmail.com"
            {...register("email")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Shop / Godown Address (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Market Yard Gate 2, Pune"
            {...register("address")}
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
            {initialData ? "Update Supplier" : "Save Supplier"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
