"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { BorrowRecord, LendRecord } from "@/types/home";
import { toISODateString } from "@/lib/date";
import { toast } from "sonner";

const borrowLendSchema = z.object({
  type: z.enum(["borrow", "lend"]),
  personName: z.string().min(2, "Person name is required"),
  phone: z.string().optional(),
  amount: z.number().positive("Amount must be greater than 0"),
  dueDate: z.string().min(1, "Due date is required"),
  purpose: z.string().optional(),
});

type BorrowLendFormValues = z.infer<typeof borrowLendSchema>;

export interface AddBorrowLendModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: "borrow" | "lend";
  onSuccessBorrow?: (borrow: BorrowRecord) => void;
  onSuccessLend?: (lend: LendRecord) => void;
}

export function AddBorrowLendModal({
  isOpen,
  onClose,
  defaultType = "borrow",
  onSuccessBorrow,
  onSuccessLend,
}: AddBorrowLendModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BorrowLendFormValues>({
    resolver: zodResolver(borrowLendSchema),
    defaultValues: {
      type: defaultType,
      personName: "",
      phone: "",
      amount: 0,
      dueDate: toISODateString(),
      purpose: "",
    },
  });

  const selectedType = watch("type");

  React.useEffect(() => {
    setValue("type", defaultType);
  }, [defaultType, setValue, isOpen]);

  const onSubmit = (data: BorrowLendFormValues) => {
    const today = toISODateString();
    if (data.type === "borrow") {
      const newBorrow: BorrowRecord = {
        id: `bor-${Date.now()}`,
        personName: data.personName,
        phone: data.phone,
        borrowedAmount: Number(data.amount),
        paidAmount: 0,
        remainingAmount: Number(data.amount),
        borrowDate: today,
        dueDate: data.dueDate,
        status: "Unpaid",
        purpose: data.purpose,
        payments: [],
      };
      if (onSuccessBorrow) onSuccessBorrow(newBorrow);
      toast.success(`Borrowed record of ₹${data.amount} from "${data.personName}" added!`);
    } else {
      const newLend: LendRecord = {
        id: `len-${Date.now()}`,
        personName: data.personName,
        phone: data.phone,
        lentAmount: Number(data.amount),
        receivedAmount: 0,
        remainingAmount: Number(data.amount),
        lendDate: today,
        dueDate: data.dueDate,
        status: "Unpaid",
        purpose: data.purpose,
        payments: [],
      };
      if (onSuccessLend) onSuccessLend(newLend);
      toast.success(`Lent record of ₹${data.amount} to "${data.personName}" added!`);
    }

    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedType === "borrow" ? "Record Money Borrowed" : "Record Money Lent"}
      description={
        selectedType === "borrow"
          ? "Money you took from someone and need to repay (I Have To Pay)."
          : "Money you gave to someone that they must return (People Have To Pay Me)."
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setValue("type", "borrow")}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              selectedType === "borrow"
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            I Borrowed (I have to pay)
          </button>
          <button
            type="button"
            onClick={() => setValue("type", "lend")}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              selectedType === "lend"
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            I Lent (They have to pay me)
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Person / Entity Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Ramesh Sharma, Dr. Verma"
            {...register("personName")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
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
              placeholder="5000"
              {...register("amount", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-semibold focus:outline-none"
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-rose-500">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone (Optional)
            </label>
            <input
              type="text"
              placeholder="+91 98765 43210"
              {...register("phone")}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Agreed Due Date *
          </label>
          <input
            type="date"
            {...register("dueDate")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
          {errors.dueDate && (
            <p className="mt-1 text-xs text-rose-500">{errors.dueDate.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Purpose / Reason (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Emergency bike repair, short loan"
            {...register("purpose")}
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
            className="rounded-lg bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer"
          >
            Save Record
          </button>
        </div>
      </form>
    </Modal>
  );
}
