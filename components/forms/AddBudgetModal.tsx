"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { BudgetRecord } from "@/types/home";
import { Category } from "@/lib/supabase/types";
import { getHomeCategories } from "@/lib/data/home/categories";
import { createBudget } from "@/lib/data/home/budgets";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const budgetSchema = z.object({
  categoryId: z.string().min(1, "Please select a category"),
  allocatedAmount: z.number().positive("Budget amount must be greater than 0"),
  month: z.string().min(1, "Target month is required"),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

export interface AddBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  defaultMonth?: string;
  onSuccess?: (budget: BudgetRecord) => void;
}

export function AddBudgetModal({
  isOpen,
  onClose,
  workspaceId,
  defaultMonth = "2026-09",
  onSuccess,
}: AddBudgetModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      categoryId: "",
      allocatedAmount: 0,
      month: defaultMonth,
    },
  });

  useEffect(() => {
    if (isOpen && workspaceId) {
      setLoadingCategories(true);
      getHomeCategories(workspaceId, "expense")
        .then((cats) => {
          setCategories(cats);
          if (cats.length > 0) {
            setValue("categoryId", cats[0].id);
          }
        })
        .finally(() => setLoadingCategories(false));

      setValue("month", defaultMonth);
    }
  }, [isOpen, workspaceId, defaultMonth, setValue]);

  const onSubmit = async (data: BudgetFormValues) => {
    setIsSubmitting(true);
    try {
      if (workspaceId) {
        const result = await createBudget(workspaceId, {
          categoryId: data.categoryId,
          amount: Number(data.allocatedAmount),
          month: data.month,
        });

        if (!result.success || !result.data) {
          toast.error(result.error || "Unable to create budget.");
          setIsSubmitting(false);
          return;
        }

        if (onSuccess) {
          onSuccess(result.data);
        }
      }

      const selectedCat = categories.find((c) => c.id === data.categoryId);
      toast.success(
        `Monthly budget of ₹${Number(data.allocatedAmount).toLocaleString("en-IN")} set for ${
          selectedCat?.name || "Category"
        }!`
      );
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create budget.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Category Budget"
      description="Define a monthly spending cap for a household expense category."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Expense Category *
          </label>
          {loadingCategories ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading categories...
            </div>
          ) : (
            <select
              {...register("categoryId")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {errors.categoryId && (
            <p className="mt-1 text-xs text-rose-500">{errors.categoryId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Budget Cap (₹ INR) *
          </label>
          <input
            type="number"
            step="any"
            placeholder="6000"
            {...register("allocatedAmount", { valueAsNumber: true })}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
          {errors.month && (
            <p className="mt-1 text-xs text-rose-500">{errors.month.message}</p>
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
            disabled={isSubmitting || loadingCategories}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create Budget
          </button>
        </div>
      </form>
    </Modal>
  );
}
