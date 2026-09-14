"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { CustomerCredit, CustomerCreditPayment } from "@/types/shop";
import { PaymentMethod } from "@/types/common";
import { toISODateString } from "@/lib/date";
import { createCustomerCredit, getDistinctCustomerSuggestions } from "@/lib/data/shop/customer-credit";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const customerCreditSchema = z
  .object({
    customerName: z.string().min(1, "Customer name is required"),
    phone: z.string().optional(),
    creditAmount: z.number().positive("Credit amount must be greater than 0"),
    creditDate: z.string().min(1, "Credit date is required"),
    dueDate: z.string().optional(),
    initialPayment: z.number().min(0, "Initial payment cannot be negative"),
    paymentMethod: z.enum(["Cash", "UPI", "Bank", "Credit Card", "Debit Card", "Card", "Other"]),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      const initial = Number(data.initialPayment || 0);
      const original = Number(data.creditAmount || 0);
      return initial <= original;
    },
    {
      message: "Initial payment cannot exceed the credit amount.",
      path: ["initialPayment"],
    }
  );

type CustomerCreditFormValues = z.infer<typeof customerCreditSchema>;

export interface AddCustomerCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSuccess?: (credit: CustomerCredit, payment: CustomerCreditPayment | null) => void;
}

export function AddCustomerCreditModal({
  isOpen,
  onClose,
  workspaceId,
  onSuccess,
}: AddCustomerCreditModalProps) {
  const [suggestions, setSuggestions] = useState<Array<{ name: string; phone?: string }>>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerCreditFormValues>({
    resolver: zodResolver(customerCreditSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      creditAmount: "" as unknown as number,
      creditDate: toISODateString(new Date()),
      dueDate: "",
      initialPayment: 0,
      paymentMethod: "Cash",
      notes: "",
    },
  });

  const watchedInitialPayment = watch("initialPayment");
  const hasInitialPayment = Number(watchedInitialPayment || 0) > 0;

  useEffect(() => {
    if (isOpen && workspaceId) {
      getDistinctCustomerSuggestions(workspaceId).then((res) => {
        setSuggestions(res);
      });
      reset({
        customerName: "",
        phone: "",
        creditAmount: "" as unknown as number,
        creditDate: toISODateString(new Date()),
        dueDate: "",
        initialPayment: 0,
        paymentMethod: "Cash",
        notes: "",
      });
    }
  }, [isOpen, workspaceId, reset]);

  const handleCustomerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue("customerName", val);
    const match = suggestions.find((s) => s.name.toLowerCase() === val.trim().toLowerCase());
    if (match && match.phone) {
      setValue("phone", match.phone);
    }
  };

  const onSubmit = async (data: CustomerCreditFormValues) => {
    try {
      const originalAmount = Number(data.creditAmount);
      const initialPayment = Number(data.initialPayment || 0);

      const result = await createCustomerCredit({
        workspaceId,
        customerName: data.customerName,
        phone: data.phone,
        creditAmount: originalAmount,
        creditDate: data.creditDate,
        dueDate: data.dueDate || undefined,
        notes: data.notes,
        initialPayment: initialPayment > 0 ? initialPayment : undefined,
        paymentMethod: initialPayment > 0 ? (data.paymentMethod as PaymentMethod) : undefined,
      });

      if (onSuccess) {
        onSuccess(result.credit, result.payment);
      }

      toast.success(
        initialPayment > 0
          ? `Customer credit of ₹${originalAmount} (₹${initialPayment} paid) recorded for "${data.customerName}"!`
          : `Customer credit of ₹${originalAmount} recorded for "${data.customerName}" in Khata!`
      );
      reset();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to add customer credit:", err);
      const message = err instanceof Error ? err.message : "Unable to add customer credit.";
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Customer Credit (Khata)"
      description="Record credit given to a customer for items purchased on tab."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Customer Name with suggestions */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Customer Name *
          </label>
          <input
            type="text"
            list="customer-name-suggestions"
            placeholder="e.g. Rahul Patil, Suresh (Auto Stand)"
            {...register("customerName")}
            onChange={handleCustomerNameChange}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <datalist id="customer-name-suggestions">
            {suggestions.map((s, idx) => (
              <option key={idx} value={s.name}>
                {s.phone ? `Phone: ${s.phone}` : ""}
              </option>
            ))}
          </datalist>
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

        {/* Credit Amount & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Credit Amount (₹) *
            </label>
            <input
              type="number"
              step="any"
              placeholder="1000"
              {...register("creditAmount", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {errors.creditAmount && (
              <p className="mt-1 text-xs text-rose-500">{errors.creditAmount.message}</p>
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

        {/* Initial Payment & Method */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
          <span className="text-xs font-bold text-slate-900 dark:text-white block">
            Counter Payment Upon Issuance (Optional)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Initial Payment Received (₹)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0"
                {...register("initialPayment", { valueAsNumber: true })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {errors.initialPayment && (
                <p className="mt-1 text-xs text-rose-500">{errors.initialPayment.message}</p>
              )}
            </div>

            {hasInitialPayment && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Payment Method *
                </label>
                <select
                  {...register("paymentMethod")}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Cash">Cash at Counter</option>
                  <option value="UPI">UPI (PhonePe / GPay / QR)</option>
                  <option value="Bank">Bank Transfer / IMPS</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes / Items on Tab (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. 2 packs cigarettes + cold drinks, promised to pay Friday"
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
            Save to Khata
          </button>
        </div>
      </form>
    </Modal>
  );
}
