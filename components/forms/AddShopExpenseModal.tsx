"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { ShopExpense, ShopExpenseCategory } from "@/types/shop";
import { PaymentMethod } from "@/types/common";
import { toISODateString } from "@/lib/date";
import { toast } from "sonner";

const shopExpenseSchema = z.object({
  title: z.string().min(2, "Expense title is required"),
  category: z.enum([
    "Rent",
    "Electricity",
    "Transport",
    "Maintenance",
    "Employee",
    "Packaging",
    "Equipment",
    "Internet",
    "Other",
  ]),
  amount: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["Cash", "UPI", "Bank", "Credit Card", "Debit Card", "Other"]),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type ShopExpenseFormValues = z.infer<typeof shopExpenseSchema>;

export interface AddShopExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (expense: ShopExpense) => void;
}

export function AddShopExpenseModal({ isOpen, onClose, onSuccess }: AddShopExpenseModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShopExpenseFormValues>({
    resolver: zodResolver(shopExpenseSchema),
    defaultValues: {
      title: "",
      category: "Electricity",
      amount: 0,
      paymentMethod: "UPI",
      date: toISODateString(),
      notes: "",
    },
  });

  const onSubmit = (data: ShopExpenseFormValues) => {
    const newExpense: ShopExpense = {
      id: `sexp-${Date.now()}`,
      title: data.title,
      category: data.category as ShopExpenseCategory,
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod as PaymentMethod,
      date: data.date,
      notes: data.notes,
    };

    if (onSuccess) {
      onSuccess(newExpense);
    }

    toast.success(`Shop expense of ₹${data.amount} for "${data.title}" saved!`);
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Shop Operating Expense"
      description="Record rent, helper wages, packaging, commercial power, or repair costs."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Expense Name / Purpose *
          </label>
          <input
            type="text"
            placeholder="e.g. Inverter battery servicing, Paper carry bags, Shop Rent"
            {...register("title")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
          {errors.title && <p className="mt-1 text-xs text-rose-500">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Amount (₹ INR) *
            </label>
            <input
              type="number"
              placeholder="500"
              {...register("amount", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
            />
            {errors.amount && <p className="mt-1 text-xs text-rose-500">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category *
            </label>
            <select
              {...register("category")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Rent">Rent</option>
              <option value="Electricity">Electricity</option>
              <option value="Transport">Transport</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Employee">Employee / Helper</option>
              <option value="Packaging">Packaging</option>
              <option value="Equipment">Equipment</option>
              <option value="Internet">Internet / SIM</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Method *
            </label>
            <select
              {...register("paymentMethod")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Date *
            </label>
            <input
              type="date"
              {...register("date")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Remarks (Optional)
          </label>
          <input
            type="text"
            placeholder="Additional notes..."
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
            className="rounded-lg bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer"
          >
            Save Shop Expense
          </button>
        </div>
      </form>
    </Modal>
  );
}
