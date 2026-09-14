"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { CustomerCredit } from "@/types/shop";
import { updateCustomerCredit } from "@/lib/data/shop/customer-credit";
import { formatINR } from "@/lib/currency";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export interface EditCustomerCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  credit: CustomerCredit | null;
  onSuccess?: (updatedCredit: CustomerCredit) => void;
}

export function EditCustomerCreditModal({
  isOpen,
  onClose,
  credit,
  onSuccess,
}: EditCustomerCreditModalProps) {
  const amountReceived = credit ? credit.amountReceived : 0;

  const editCreditSchema = z
    .object({
      customerName: z.string().min(1, "Customer name is required"),
      phone: z.string().optional(),
      creditAmount: z.number().positive("Credit amount must be greater than 0"),
      creditDate: z.string().min(1, "Credit date is required"),
      dueDate: z.string().optional(),
      notes: z.string().optional(),
    })
    .refine((data) => data.creditAmount >= amountReceived, {
      message: `Credit amount cannot be less than the ${formatINR(
        amountReceived
      )} already collected.`,
      path: ["creditAmount"],
    });

  type EditCreditFormValues = z.infer<typeof editCreditSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditCreditFormValues>({
    resolver: zodResolver(editCreditSchema),
    defaultValues: {
      customerName: credit?.customerName || "",
      phone: credit?.phone || "",
      creditAmount: credit?.creditAmount || 0,
      creditDate: credit?.creditDate || "",
      dueDate: credit?.dueDate || "",
      notes: credit?.notes || "",
    },
  });

  useEffect(() => {
    if (credit && isOpen) {
      reset({
        customerName: credit.customerName,
        phone: credit.phone || "",
        creditAmount: credit.creditAmount,
        creditDate: credit.creditDate || "",
        dueDate: credit.dueDate || "",
        notes: credit.notes || "",
      });
    }
  }, [credit, isOpen, reset]);

  if (!credit) return null;

  const onSubmit = async (data: EditCreditFormValues) => {
    try {
      const updated = await updateCustomerCredit({
        id: credit.id,
        customerName: data.customerName,
        phone: data.phone,
        creditAmount: Number(data.creditAmount),
        creditDate: data.creditDate,
        dueDate: data.dueDate || undefined,
        notes: data.notes,
      });

      if (onSuccess) {
        onSuccess(updated);
      }

      toast.success(`Customer credit for "${data.customerName}" updated successfully.`);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to update customer credit:", err);
      const message = err instanceof Error ? err.message : "Unable to update customer credit.";
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Customer Credit Entry"
      description={`Update customer details or credit terms. Collected so far: ${formatINR(
        amountReceived
      )}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Customer Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Customer Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Rahul Patil"
            {...register("customerName")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          {errors.customerName && (
            <p className="mt-1 text-xs text-rose-500">{errors.customerName.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            placeholder="e.g. 9876543210"
            {...register("phone")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Amount & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Credit Amount (₹) *
            </label>
            <input
              type="number"
              step="any"
              {...register("creditAmount", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {errors.creditAmount && (
              <p className="mt-1 text-xs text-rose-500">{errors.creditAmount.message}</p>
            )}
            {amountReceived > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">
                Min allowed: {formatINR(amountReceived)} (already paid)
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Credit Date *
            </label>
            <input
              type="date"
              {...register("creditDate")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {errors.creditDate && (
              <p className="mt-1 text-xs text-rose-500">{errors.creditDate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Due Date (Optional)
            </label>
            <input
              type="date"
              {...register("dueDate")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Reason or items purchased on credit"
            {...register("notes")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
