"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { Supplier } from "@/types/shop";
import { createShopSupplier, updateShopSupplier } from "@/lib/data/shop/suppliers";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const supplierSchema = z.object({
  name: z.string().min(2, "Supplier name is required"),
  phone: z.string().optional(),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

export interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSuccess?: (supplier: Supplier) => void;
  initialData?: Supplier | null;
}

export function AddSupplierModal({
  isOpen,
  onClose,
  workspaceId,
  onSuccess,
  initialData,
}: AddSupplierModalProps) {
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

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
      email: "",
      address: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    setDuplicateWarning(null);
    if (initialData) {
      reset({
        name: initialData.name,
        phone: initialData.phone || "",
        email: initialData.email || "",
        address: initialData.address || "",
        notes: initialData.notes || "",
      });
    } else {
      reset({
        name: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
      });
    }
  }, [initialData, isOpen, reset]);

  const onSubmit = async (data: SupplierFormValues) => {
    try {
      if (initialData) {
        const res = await updateShopSupplier(initialData.id, workspaceId, {
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          notes: data.notes,
        });

        if (!res.success) {
          toast.error(res.error || "Failed to update supplier.");
          return;
        }

        if (res.warning) {
          toast.warning(res.warning);
        } else {
          toast.success(`Supplier "${data.name}" updated successfully!`);
        }

        if (res.supplier && onSuccess) {
          onSuccess(res.supplier);
        }
      } else {
        const res = await createShopSupplier(workspaceId, {
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          notes: data.notes,
        });

        if (!res.success) {
          toast.error(res.error || "Failed to create supplier.");
          return;
        }

        if (res.warning) {
          toast.warning(res.warning);
        } else {
          toast.success(`Supplier "${data.name}" added successfully!`);
        }

        if (res.supplier && onSuccess) {
          onSuccess(res.supplier);
        }
      }

      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Unexpected error saving supplier.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Supplier" : "Add Vendor / Supplier"}
      description="Save distributor contact details and shop delivery terms."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {duplicateWarning && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Supplier / Distributor Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Raj Cold Drinks & Beverages, Balaji Snacks"
            {...register("name")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
          {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone Number (Optional)
            </label>
            <input
              type="text"
              placeholder="+91 98765 43210"
              {...register("phone")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            />
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
            {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
          </div>
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

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes / Payment Terms (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Weekly payment on Saturday, 5% return discount"
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
            className="rounded-lg bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : initialData ? "Update Supplier" : "Save Supplier"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
