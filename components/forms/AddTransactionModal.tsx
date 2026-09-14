"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { HomeTransaction } from "@/types/home";
import { PaymentMethod, TransactionType } from "@/types/common";
import { toISODateString } from "@/lib/date";
import { toast } from "sonner";

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
  onSuccess?: (transaction: HomeTransaction) => void;
  initialData?: HomeTransaction | null;
}

const expenseCategories = [
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

const incomeCategories = [
  "Salary",
  "Bonus",
  "Freelance",
  "Interest",
  "Business Income",
  "Other",
];

export function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: AddTransactionModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
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
        category: "Kitchen",
        amount: 0,
        paymentMethod: "UPI",
        date: toISODateString(),
        notes: "",
      });
    }
  }, [initialData, isOpen, reset]);

  // Update default category when type changes
  const handleTypeChange = (type: TransactionType) => {
    setValue("type", type);
    setValue("category", type === "Income" ? incomeCategories[0] : expenseCategories[0]);
  };

  const onSubmit = (data: TransactionFormValues) => {
    const newTx: HomeTransaction = {
      id: initialData ? initialData.id : `tx-${Date.now()}`,
      name: data.name,
      type: data.type,
      category: data.category as any,
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod as PaymentMethod,
      date: data.date,
      notes: data.notes,
    };

    if (onSuccess) {
      onSuccess(newTx);
    }

    toast.success(
      initialData
        ? `Transaction "${data.name}" updated successfully!`
        : `Transaction "${data.name}" added successfully!`
    );
    onClose();
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
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {initialData ? "Save Changes" : "Add Transaction"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
