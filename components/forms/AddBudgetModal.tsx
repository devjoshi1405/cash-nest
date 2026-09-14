"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { BudgetRecord, HomeExpenseCategory } from "@/types/home";
import { toast } from "sonner";

const budgetSchema = z.object({
  category: z.string().min(1, "Category is required"),
  allocatedAmount: z.number().positive("Budget amount must be greater than 0"),
  month: z.string().min(1, "Month is required"),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

export interface AddBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (budget: BudgetRecord) => void;
}

const budgetCategories: HomeExpenseCategory[] = [
  "Kitchen",
  "Petrol",
  "Shopping",
  "Entertainment",
  "Bills",
  "Medical",
  "Grocery",
  "Electricity",
  "Travel",
  "Education",
  "Other",
];

export function AddBudgetModal({ isOpen, onClose, onSuccess }: AddBudgetModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category: "Kitchen",
      allocatedAmount: 0,
      month: "2026-09",
    },
  });

  const onSubmit = (data: BudgetFormValues) => {
    const newBudget: BudgetRecord = {
      id: `bud-${Date.now()}`,
      category: data.category as HomeExpenseCategory,
      allocatedAmount: Number(data.allocatedAmount),
      spentAmount: 0,
      remainingAmount: Number(data.allocatedAmount),
      month: data.month,
      status: "Safe",
    };

    if (onSuccess) {
      onSuccess(newBudget);
    }

    toast.success(`Monthly budget of ₹${data.allocatedAmount} set for ${data.category}!`);
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Category Budget"
      description="Define a monthly spending cap for a home category."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Category *
          </label>
          <select
            {...register("category")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          >
            {budgetCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Budget Cap (₹ INR) *
          </label>
          <input
            type="number"
            placeholder="6000"
            {...register("allocatedAmount", { valueAsNumber: true })}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
          />
          {errors.allocatedAmount && (
            <p className="mt-1 text-xs text-rose-500">{errors.allocatedAmount.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Target Month *
          </label>
          <input
            type="month"
            {...register("month")}
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
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer"
          >
            Create Budget
          </button>
        </div>
      </form>
    </Modal>
  );
}
