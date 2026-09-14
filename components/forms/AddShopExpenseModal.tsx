"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { ShopExpense } from "@/types/shop";
import { PaymentMethod } from "@/types/common";
import { Category } from "@/lib/supabase/types";
import { toISODateString } from "@/lib/date";
import { createShopExpense } from "@/lib/data/shop/expenses";
import { getShopExpenseCategories } from "@/lib/data/shop/categories";
import { toast } from "sonner";

const shopExpenseSchema = z.object({
  title: z.string().min(2, "Expense title is required"),
  categoryId: z.string().min(1, "Please select a category"),
  amount: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["Cash", "UPI", "Bank", "Credit Card", "Debit Card", "Other"]),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type ShopExpenseFormValues = z.infer<typeof shopExpenseSchema>;

export interface AddShopExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSuccess?: (expense: ShopExpense) => void;
}

export function AddShopExpenseModal({
  isOpen,
  onClose,
  workspaceId,
  onSuccess,
}: AddShopExpenseModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShopExpenseFormValues>({
    resolver: zodResolver(shopExpenseSchema),
    defaultValues: {
      title: "",
      categoryId: "",
      amount: 0,
      paymentMethod: "UPI",
      date: toISODateString(),
      notes: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      setLoadingCategories(true);
      getShopExpenseCategories(workspaceId)
        .then((cats) => {
          setCategories(cats);
          if (cats.length > 0) {
            setValue("categoryId", cats[0].id);
          }
        })
        .finally(() => setLoadingCategories(false));
    }
  }, [isOpen, workspaceId, setValue]);

  const onSubmit = async (data: ShopExpenseFormValues) => {
    const selectedCat = categories.find((c) => c.id === data.categoryId);
    const categoryName = selectedCat?.name || "Other";

    try {
      const res = await createShopExpense(workspaceId, {
        title: data.title,
        categoryId: data.categoryId,
        category: categoryName,
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod as PaymentMethod,
        date: data.date,
        notes: data.notes?.trim(),
      });

      if (!res.success) {
        toast.error(res.error || "Failed to save expense.");
        return;
      }

      toast.success(`Shop expense of ₹${data.amount} for "${data.title}" saved!`);

      if (res.expense && onSuccess) {
        onSuccess(res.expense);
      }

      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Unexpected error saving expense.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Shop Operating Expense"
      description="Record premise rent, helper wages, commercial power, repair or packaging overheads."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Expense Name / Purpose *
          </label>
          <input
            type="text"
            placeholder="e.g. Commercial electricity bill, Carry bags, Refrigerator repair"
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
              step="any"
              placeholder="500"
              {...register("amount", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
            />
            {errors.amount && <p className="mt-1 text-xs text-rose-500">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expense Category *
            </label>
            <select
              {...register("categoryId")}
              disabled={loadingCategories}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ""}{c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="mt-1 text-xs text-rose-500">{errors.categoryId.message}</p>
            )}
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
              <option value="UPI">UPI (QR / PhonePe / GPay)</option>
              <option value="Cash">Cash Drawer</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expense Date *
            </label>
            <input
              type="date"
              {...register("date")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            />
            {errors.date && <p className="mt-1 text-xs text-rose-500">{errors.date.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes / Receipt Ref (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Paid to electricity board counter"
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
            className="rounded-lg bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Shop Expense"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
