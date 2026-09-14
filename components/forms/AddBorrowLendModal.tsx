"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { BorrowRecord, LendRecord } from "@/types/home";
import { toISODateString } from "@/lib/date";
import { createDebt } from "@/lib/data/home/debts";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const borrowLendSchema = z.object({
  type: z.enum(["borrow", "lend"]),
  personName: z.string().min(2, "Person name must be at least 2 characters"),
  phone: z.string().optional(),
  amount: z.number().positive("Amount must be greater than 0"),
  debtDate: z.string().min(1, "Date is required"),
  dueDate: z.string().optional(),
  purpose: z.string().optional(),
});

type BorrowLendFormValues = z.infer<typeof borrowLendSchema>;

export interface AddBorrowLendModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  defaultType?: "borrow" | "lend";
  lockType?: boolean;
  onSuccessBorrow?: (borrow: BorrowRecord) => void;
  onSuccessLend?: (lend: LendRecord) => void;
}

export function AddBorrowLendModal({
  isOpen,
  onClose,
  workspaceId,
  defaultType = "borrow",
  lockType = false,
  onSuccessBorrow,
  onSuccessLend,
}: AddBorrowLendModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BorrowLendFormValues>({
    resolver: zodResolver(borrowLendSchema),
    defaultValues: {
      type: defaultType,
      personName: "",
      phone: "",
      amount: 0,
      debtDate: toISODateString(new Date()),
      dueDate: "",
      purpose: "",
    },
  });

  const selectedType = watch("type");

  React.useEffect(() => {
    if (isOpen) {
      setValue("type", defaultType);
      setValue("debtDate", toISODateString(new Date()));
    }
  }, [defaultType, setValue, isOpen]);

  const onSubmit = async (data: BorrowLendFormValues) => {
    setIsSubmitting(true);
    try {
      const direction = data.type === "borrow" ? "borrowed" : "lent";

      if (workspaceId) {
        const result = await createDebt(workspaceId, {
          direction,
          personName: data.personName,
          phone: data.phone,
          originalAmount: Number(data.amount),
          debtDate: data.debtDate,
          dueDate: data.dueDate || undefined,
          notes: data.purpose,
        });

        if (!result.success || !result.data) {
          toast.error(result.error || "Unable to save record.");
          setIsSubmitting(false);
          return;
        }

        if (direction === "borrowed" && onSuccessBorrow) {
          onSuccessBorrow(result.data as BorrowRecord);
        } else if (direction === "lent" && onSuccessLend) {
          onSuccessLend(result.data as LendRecord);
        }
      }

      toast.success(
        data.type === "borrow"
          ? `Borrow record of ₹${Number(data.amount).toLocaleString("en-IN")} from "${data.personName}" added!`
          : `Lend record of ₹${Number(data.amount).toLocaleString("en-IN")} to "${data.personName}" added!`
      );

      reset();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to add record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedType === "borrow" ? "Add Borrow (I Have To Pay)" : "Add Lend (People Have To Pay Me)"}
      description={
        selectedType === "borrow"
          ? "Record money you took from someone and need to pay back."
          : "Record money you gave to someone that they must return to you."
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Toggle (hidden if lockType is true) */}
        {!lockType && (
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setValue("type", "borrow")}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedType === "borrow"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              I Borrowed (I Owe)
            </button>
            <button
              type="button"
              onClick={() => setValue("type", "lend")}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedType === "lend"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              I Lent (They Owe Me)
            </button>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Person / Entity Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Ramesh Sharma, Dr. Verma"
            {...register("personName")}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {errors.personName && (
            <p className="mt-1 text-xs text-rose-500">{errors.personName.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Amount (₹ INR) *
            </label>
            <input
              type="number"
              step="any"
              placeholder="5000"
              {...register("amount", { valueAsNumber: true })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-rose-500">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              {...register("phone")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Transaction Date *
            </label>
            <input
              type="date"
              {...register("debtDate")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none"
            />
            {errors.debtDate && (
              <p className="mt-1 text-xs text-rose-500">{errors.debtDate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Agreed Due Date (Optional)
            </label>
            <input
              type="date"
              {...register("dueDate")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes / Purpose (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Emergency bike repair, short friendly loan"
            {...register("purpose")}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
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
            className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50 ${
              selectedType === "borrow"
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Record
          </button>
        </div>
      </form>
    </Modal>
  );
}
