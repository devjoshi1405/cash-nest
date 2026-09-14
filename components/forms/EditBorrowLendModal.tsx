"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { BorrowRecord, LendRecord } from "@/types/home";
import { updateDebt } from "@/lib/data/home/debts";
import { formatINR } from "@/lib/currency";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const editBorrowLendSchema = z.object({
  personName: z.string().min(2, "Person name must be at least 2 characters"),
  phone: z.string().optional(),
  originalAmount: z.number().positive("Amount must be greater than 0"),
  debtDate: z.string().min(1, "Date is required"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

type EditBorrowLendFormValues = z.infer<typeof editBorrowLendSchema>;

export interface EditBorrowLendModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: BorrowRecord | LendRecord | null;
  onSuccess: (updated: BorrowRecord | LendRecord) => void;
}

export function EditBorrowLendModal({
  isOpen,
  onClose,
  record,
  onSuccess,
}: EditBorrowLendModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBorrow = record ? "borrowedAmount" in record : true;
  const originalAmount = record
    ? "borrowedAmount" in record
      ? record.borrowedAmount
      : record.lentAmount
    : 0;
  const paidAmount = record
    ? "paidAmount" in record
      ? record.paidAmount
      : record.receivedAmount
    : 0;

  const getRecordDebtDate = (r: BorrowRecord | LendRecord) => {
    return r.debtDate || ("borrowDate" in r ? r.borrowDate : r.lendDate) || "";
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditBorrowLendFormValues>({
    resolver: zodResolver(editBorrowLendSchema),
    defaultValues: {
      personName: record?.personName || "",
      phone: record?.phone || "",
      originalAmount,
      debtDate: record ? getRecordDebtDate(record) : "",
      dueDate: record?.dueDate || "",
      notes: record?.purpose || "",
    },
  });

  useEffect(() => {
    if (record) {
      reset({
        personName: record.personName || "",
        phone: record.phone || "",
        originalAmount:
          "borrowedAmount" in record ? record.borrowedAmount : record.lentAmount,
        debtDate: getRecordDebtDate(record),
        dueDate: record.dueDate || "",
        notes: record.purpose || "",
      });
    }
  }, [record, reset, isOpen]);

  if (!record) return null;

  const onSubmit = async (data: EditBorrowLendFormValues) => {
    if (data.originalAmount < paidAmount) {
      toast.error(
        `Original amount cannot be less than total payments already recorded (${formatINR(paidAmount)}).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateDebt(record.id, {
        personName: data.personName,
        phone: data.phone,
        originalAmount: Number(data.originalAmount),
        debtDate: data.debtDate,
        dueDate: data.dueDate || undefined,
        notes: data.notes,
      });

      if (!result.success || !result.data) {
        toast.error(result.error || "Unable to update record.");
        setIsSubmitting(false);
        return;
      }

      onSuccess(result.data);
      toast.success("Record updated successfully.");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBorrow ? "Edit Borrow Record" : "Edit Lend Record"}
      description={`Update details for ${record.personName}. Already settled: ${formatINR(paidAmount)}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Person / Entity Name *
          </label>
          <input
            type="text"
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
              Original Amount (₹ INR) *
            </label>
            <input
              type="number"
              step="any"
              {...register("originalAmount", { valueAsNumber: true })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {paidAmount > 0 && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                Minimum {formatINR(paidAmount)} required (already paid).
              </p>
            )}
            {errors.originalAmount && (
              <p className="mt-1 text-xs text-rose-500">{errors.originalAmount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
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
              Due Date (Optional)
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
            {...register("notes")}
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
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
