"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { HomeTransaction } from "@/types/home";
import { PaymentMethod, TransactionType } from "@/types/common";
import { toISODateString } from "@/lib/date";
import { createHomeTransaction, updateHomeTransaction } from "@/lib/data/home/transactions";
import { getHomeCategories } from "@/lib/data/home/categories";
import { getAuthenticatedHomeWorkspace } from "@/lib/data/home/workspace";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const transactionSchema = z.object({
  name: z.string().min(2, "Transaction name is required (min 2 chars)"),
  type: z.enum(["Income", "Expense"]),
  category: z.string().min(1, "Please select a category"),
  amount: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["Cash", "UPI", "Bank", "Credit Card", "Debit Card", "Other"]),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  onSuccess?: (transaction: HomeTransaction) => void;
  initialData?: HomeTransaction | null;
}

const defaultExpenseCategories = [
  "Kitchen",
  "Groceries",
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
  "Other",
];

const defaultIncomeCategories = [
  "Salary",
  "Bonus",
  "Freelance",
  "Interest",
  "Business Income",
  "Other Income",
];

export function AddTransactionModal({
  isOpen,
  onClose,
  workspaceId: propWorkspaceId,
  onSuccess,
  initialData,
}: AddTransactionModalProps) {
  const [resolvedWorkspaceId, setResolvedWorkspaceId] = useState<string>(propWorkspaceId || "");
  const [expenseCategories, setExpenseCategories] = useState<string[]>(defaultExpenseCategories);
  const [incomeCategories, setIncomeCategories] = useState<string[]>(defaultIncomeCategories);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      name: "",
      type: "Expense",
      category: "Kitchen",
      amount: 0,
      paymentMethod: "UPI",
      date: toISODateString(),
      notes: "",
    },
  });

  const selectedType = watch("type");

  // Resolve workspace and load categories
  useEffect(() => {
    let isMounted = true;
    async function initCategories() {
      try {
        let wsId = propWorkspaceId;
        if (!wsId) {
          const authWs = await getAuthenticatedHomeWorkspace();
          if (authWs) {
            wsId = authWs.workspaceId;
            if (isMounted) setResolvedWorkspaceId(authWs.workspaceId);
          }
        } else {
          if (isMounted) setResolvedWorkspaceId(wsId);
        }

        if (wsId) {
          const cats = await getHomeCategories(wsId);
          if (isMounted && cats.length > 0) {
            const exp = cats.filter((c) => c.type === "expense").map((c) => c.name);
            const inc = cats.filter((c) => c.type === "income").map((c) => c.name);
            if (exp.length > 0) setExpenseCategories(exp);
            if (inc.length > 0) setIncomeCategories(inc);
          }
        }
      } catch (err) {
        console.error("Failed to load categories in AddTransactionModal:", err);
      }
    }

    if (isOpen) {
      initCategories();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, propWorkspaceId]);

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        type: initialData.type,
        category: initialData.category,
        amount: initialData.amount,
        paymentMethod: initialData.paymentMethod as any,
        date: initialData.date,
        notes: initialData.notes || "",
      });
    } else {
      reset({
        name: "",
        type: "Expense",
        category: expenseCategories[0] || "Kitchen",
        amount: 0,
        paymentMethod: "UPI",
        date: toISODateString(),
        notes: "",
      });
    }
  }, [initialData, isOpen, reset, expenseCategories]);

  // Update default category when type changes
  const handleTypeChange = (type: TransactionType) => {
    setValue("type", type);
    setValue("category", type === "Income" ? incomeCategories[0] || "Salary" : expenseCategories[0] || "Kitchen");
  };

  const onSubmit = async (data: TransactionFormValues) => {
    setIsSubmitting(true);
    try {
      let wsId = resolvedWorkspaceId || propWorkspaceId;
      if (!wsId) {
        const authWs = await getAuthenticatedHomeWorkspace();
        if (authWs) {
          wsId = authWs.workspaceId;
          setResolvedWorkspaceId(authWs.workspaceId);
        }
      }

      if (!wsId) {
        toast.error("Home workspace could not be identified.");
        setIsSubmitting(false);
        return;
      }

      if (initialData) {
        // Edit existing transaction
        const result = await updateHomeTransaction(initialData.id, wsId, {
          name: data.name,
          type: data.type,
          category: data.category,
          amount: Number(data.amount),
          paymentMethod: data.paymentMethod,
          date: data.date,
          notes: data.notes,
        });

        if (!result.success || !result.transaction) {
          toast.error(result.error || "Failed to update transaction.");
          setIsSubmitting(false);
          return;
        }

        toast.success(`Transaction "${data.name}" updated successfully!`);
        if (onSuccess) onSuccess(result.transaction);
      } else {
        // Create new transaction
        const result = await createHomeTransaction(wsId, {
          name: data.name,
          type: data.type,
          category: data.category,
          amount: Number(data.amount),
          paymentMethod: data.paymentMethod,
          date: data.date,
          notes: data.notes,
        });

        if (!result.success || !result.transaction) {
          toast.error(result.error || "Failed to save transaction.");
          setIsSubmitting(false);
          return;
        }

        toast.success(`Transaction "${data.name}" added successfully!`);
        if (onSuccess) onSuccess(result.transaction);
      }

      reset();
      onClose();
    } catch (err: any) {
      console.error("Error submitting transaction:", err);
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Transaction" : "Add New Transaction"}
      description="Record an income or expense transaction in your Home Finance workspace."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Transaction Type Segmented Toggle */}
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
            Transaction Type
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleTypeChange("Expense")}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedType === "Expense"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Expense (-)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("Income")}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedType === "Income"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Income (+)
            </button>
          </div>
        </div>

        {/* Transaction Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Transaction Name / Description *
          </label>
          <input
            type="text"
            placeholder="e.g. Groceries, Freelance UI, Petrol refill"
            {...register("name")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-slate-400 focus:outline-none"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>
          )}
        </div>

        {/* Amount & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Amount (₹ INR) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                ₹
              </span>
              <input
                type="number"
                step="any"
                placeholder="2500"
                {...register("amount", { valueAsNumber: true })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-8 pr-3 py-2 text-sm text-slate-900 dark:text-white font-semibold focus:border-slate-400 focus:outline-none"
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-xs text-rose-500">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category *
            </label>
            <select
              {...register("category")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-slate-400 focus:outline-none"
            >
              {(selectedType === "Income" ? incomeCategories : expenseCategories).map(
                (cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                )
              )}
            </select>
            {errors.category && (
              <p className="mt-1 text-xs text-rose-500">{errors.category.message}</p>
            )}
          </div>
        </div>

        {/* Payment Method & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Method *
            </label>
            <select
              {...register("paymentMethod")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-slate-400 focus:outline-none"
            >
              <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
              <option value="Cash">Cash</option>
              <option value="Bank">Bank Transfer / NEFT</option>
              <option value="Credit Card">Credit Card</option>
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
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-slate-400 focus:outline-none"
            />
            {errors.date && (
              <p className="mt-1 text-xs text-rose-500">{errors.date.message}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes / Remarks (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Add any extra details or reference notes..."
            {...register("notes")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-slate-400 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {initialData ? "Save Changes" : "Add Transaction"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

