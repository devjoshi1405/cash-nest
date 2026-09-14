"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { HomeExpenseItem, HomeExpenseCategory } from "@/types/home";
import { PaymentMethod } from "@/types/common";
import { toISODateString } from "@/lib/date";
import { createHomeTransaction } from "@/lib/data/home/transactions";
import { getAuthenticatedHomeWorkspace } from "@/lib/data/home/workspace";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const expenseSchema = z.object({
  title: z.string().min(2, "Expense title is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["Cash", "UPI", "Bank", "Credit Card", "Debit Card", "Other"]),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  onSuccess?: (expense: HomeExpenseItem) => void;
}

const expenseCategories: HomeExpenseCategory[] = [
  "Kitchen",
  "Grocery",
  "Electricity",
  "Gas",
  "Wi-Fi",
  "Mobile Recharge",
  "Petrol",
  "Vehicle",
  "EMI",
  "Loan",
  "Medical",
  "Shopping",
  "Entertainment",
  "Education",
  "Travel",
  "Bills",
  "Other",
];

export function AddExpenseModal({ isOpen, onClose, workspaceId: propWsId, onSuccess }: AddExpenseModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: "",
      category: "Kitchen",
      amount: 0,
      paymentMethod: "UPI",
      date: toISODateString(),
      notes: "",
    },
  });

  const onSubmit = async (data: ExpenseFormValues) => {
    setIsSubmitting(true);
    try {
      let wsId = propWsId;
      if (!wsId) {
        const authWs = await getAuthenticatedHomeWorkspace();
        if (authWs) wsId = authWs.workspaceId;
      }

      if (!wsId) {
        toast.error("Home workspace could not be identified.");
        setIsSubmitting(false);
        return;
      }

      const res = await createHomeTransaction(wsId, {
        name: data.title,
        type: "expense",
        category: data.category,
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod,
        date: data.date,
        notes: data.notes,
      });

      if (!res.success || !res.transaction) {
        toast.error(res.error || "Failed to record expense.");
        setIsSubmitting(false);
        return;
      }

      const newExpense: HomeExpenseItem = {
        id: res.transaction.id,
        title: res.transaction.name,
        category: data.category as HomeExpenseCategory,
        amount: res.transaction.amount,
        paymentMethod: res.transaction.paymentMethod,
        date: res.transaction.date,
        notes: res.transaction.notes,
      };

      toast.success(`Expense of ₹${data.amount} for "${data.title}" saved!`);
      if (onSuccess) {
        onSuccess(newExpense);
      }
      reset();
      onClose();
    } catch (err: any) {
      console.error("Error creating expense:", err);
      toast.error(err?.message || "Failed to record expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Expense Entry"
      description="Record a household, utility, EMI, or personal spending."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Expense Description *
          </label>
          <input
            type="text"
            placeholder="e.g. Vegetables, Petrol commute, Milk bill"
            {...register("title")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
          {errors.title && <p className="mt-1 text-xs text-rose-500">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Amount (₹ INR) *
            </label>
            <input
              type="number"
              placeholder="1200"
              {...register("amount", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-semibold focus:outline-none"
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
              {expenseCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Method *
            </label>
            <select
              {...register("paymentMethod")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="UPI">UPI (GPay / PhonePe)</option>
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Bank">Bank Account</option>
              <option value="Debit Card">Debit Card</option>
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
            Notes (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Remarks or bill details..."
            {...register("notes")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

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
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Expense
          </button>
        </div>
      </form>
    </Modal>
  );
}

