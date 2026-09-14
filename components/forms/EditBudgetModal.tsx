"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { BudgetRecord } from "@/types/home";
import { updateBudget } from "@/lib/data/home/budgets";
import { formatINR } from "@/lib/currency";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const editBudgetSchema = z.object({
  allocatedAmount: z.number().positive("Budget cap must be greater than 0"),
});

type EditBudgetFormValues = z.infer<typeof editBudgetSchema>;

export interface EditBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: BudgetRecord | null;
  onSuccess?: (updated: BudgetRecord) => void;
}

export function EditBudgetModal({
  isOpen,
  onClose,
  budget,
  onSuccess,
}: EditBudgetModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditBudgetFormValues>({
    resolver: zodResolver(editBudgetSchema),
    defaultValues: {
      allocatedAmount: budget?.allocatedAmount || 0,
    },
  });

  useEffect(() => {
    if (budget) {
      reset({
        allocatedAmount: budget.allocatedAmount,
      });
    }
  }, [budget, reset, isOpen]);

  if (!budget) return null;

  const onSubmit = async (data: EditBudgetFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await updateBudget(budget.id, {
        amount: Number(data.allocatedAmount),
      });

      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to update budget.");
        setIsSubmitting(false);
        return;
      }

      if (onSuccess) {
        onSuccess({
          ...budget,
          allocatedAmount: Number(data.allocatedAmount),
          remainingAmount: Number(data.allocatedAmount) - budget.spentAmount,
          percentage:
            Number(data.allocatedAmount) > 0
              ? Math.round((budget.spentAmount / Number(data.allocatedAmount)) * 1000) / 10
              : 0,
        });
      }

      toast.success(
        `Budget cap for ${budget.category} updated to ${formatINR(data.allocatedAmount)}!`
      );
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update budget.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Budget: ${budget.category}`}
      description={`Modify spending cap for ${budget.month}. Current spent: ${formatINR(
        budget.spentAmount
      )}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Category
          </label>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white">
            <span>{budget.categoryIcon || "🏷️"}</span>
            <span>{budget.category}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            New Budget Cap (₹ INR) *
          </label>
          <input
            type="number"
            step="any"
            {...register("allocatedAmount", { valueAsNumber: true })}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {errors.allocatedAmount && (
            <p className="mt-1 text-xs text-rose-500">{errors.allocatedAmount.message}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
