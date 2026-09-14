"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { CustomerCredit } from "@/types/shop";
import { toISODateString } from "@/lib/date";
import { toast } from "sonner";

const customerCreditSchema = z.object({
  customerName: z.string().min(2, "Customer name is required"),
  phone: z.string().optional(),
  creditAmount: z.number().positive("Credit amount must be greater than 0"),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
});

type CustomerCreditFormValues = z.infer<typeof customerCreditSchema>;

export interface AddCustomerCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (credit: CustomerCredit) => void;
}

export function AddCustomerCreditModal({
  isOpen,
  onClose,
  onSuccess,
}: AddCustomerCreditModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerCreditFormValues>({
    resolver: zodResolver(customerCreditSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      creditAmount: 0,
      dueDate: toISODateString(),
      notes: "",
    },
  });

  const onSubmit = (data: CustomerCreditFormValues) => {
    const amount = Number(data.creditAmount);
    const newCredit: CustomerCredit = {
      id: `cred-${Date.now()}`,
      customerName: data.customerName,
      phone: data.phone,
      creditAmount: amount,
      amountReceived: 0,
      remainingAmount: amount,
      dueDate: data.dueDate,
      lastPaymentDate: toISODateString(),
      status: "Pending",
      notes: data.notes,
      payments: [],
    };

    if (onSuccess) {
      onSuccess(newCredit);
    }

    toast.success(`Customer credit of ₹${amount} for "${data.customerName}" recorded in Khata!`);
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Customer Credit (Khata)"
      description="Record credit given to customer for items purchased on tab."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Customer Name & Tag *
          </label>
          <input
            type="text"
            placeholder="e.g. Suresh Patil (Auto Stand), Mahesh"
            {...register("customerName")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
          {errors.customerName && (
            <p className="mt-1 text-xs text-rose-500">{errors.customerName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Phone Number (Optional)
          </label>
          <input
            type="text"
            placeholder="+91 98765 00000"
            {...register("phone")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Credit Amount (₹) *
            </label>
            <input
              type="number"
              placeholder="500"
              {...register("creditAmount", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
            />
            {errors.creditAmount && (
              <p className="mt-1 text-xs text-rose-500">{errors.creditAmount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expected Pay Date *
            </label>
            <input
              type="date"
              {...register("dueDate")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Items / Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. 5 Cold drinks + 2 packs wafers"
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
            className="rounded-lg bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer"
          >
            Add to Khata
          </button>
        </div>
      </form>
    </Modal>
  );
}
