"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { DailySale } from "@/types/shop";
import { formatINR } from "@/lib/currency";
import { updateDailySale, calculateDailySalesTotal } from "@/lib/data/shop/sales";
import { toast } from "sonner";
import { Calculator, Loader2 } from "lucide-react";

const editDailySaleSchema = z.object({
  date: z.string().min(1, "Date is required"),
  cashSales: z.number().min(0, "Amount cannot be negative"),
  upiSales: z.number().min(0, "Amount cannot be negative"),
  cardSales: z.number().min(0, "Amount cannot be negative"),
  otherSales: z.number().min(0, "Amount cannot be negative"),
  notes: z.string().optional(),
});

type EditDailySaleFormValues = z.infer<typeof editDailySaleSchema>;

export interface EditDailySaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: DailySale | null;
  onSuccess?: (sale: DailySale) => void;
}

export function EditDailySaleModal({
  isOpen,
  onClose,
  sale,
  onSuccess,
}: EditDailySaleModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditDailySaleFormValues>({
    resolver: zodResolver(editDailySaleSchema),
    defaultValues: {
      date: "",
      cashSales: 0,
      upiSales: 0,
      cardSales: 0,
      otherSales: 0,
      notes: "",
    },
  });

  useEffect(() => {
    if (sale && isOpen) {
      reset({
        date: sale.date,
        cashSales: sale.cashSales,
        upiSales: sale.upiSales,
        cardSales: sale.cardSales,
        otherSales: sale.otherSales,
        notes: sale.notes || "",
      });
    }
  }, [sale, isOpen, reset]);

  const cash = watch("cashSales") || 0;
  const upi = watch("upiSales") || 0;
  const card = watch("cardSales") || 0;
  const other = watch("otherSales") || 0;

  const totalCalculated = calculateDailySalesTotal(
    Number(cash),
    Number(upi),
    Number(card),
    Number(other)
  );

  const onSubmit = async (data: EditDailySaleFormValues) => {
    if (!sale) return;

    const cashVal = Number(data.cashSales) || 0;
    const upiVal = Number(data.upiSales) || 0;
    const cardVal = Number(data.cardSales) || 0;
    const otherVal = Number(data.otherSales) || 0;

    const total = calculateDailySalesTotal(cashVal, upiVal, cardVal, otherVal);

    if (total <= 0) {
      toast.error("Enter at least one sales amount.");
      setError("cashSales", { message: "Enter at least one amount greater than 0" });
      return;
    }

    const res = await updateDailySale(sale.id, {
      date: data.date,
      cashSales: cashVal,
      upiSales: upiVal,
      cardSales: cardVal,
      otherSales: otherVal,
      notes: data.notes,
    });

    if (res.error) {
      toast.error(res.error);
      return;
    }

    if (res.data) {
      toast.success(`Sales for ${res.data.date} updated successfully.`);
      if (onSuccess) {
        onSuccess(res.data);
      }
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Daily Sales"
      description="Update counter sales amounts or date for this daily closing entry."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Sales Date *
          </label>
          <input
            type="date"
            {...register("date")}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
          />
          {errors.date && (
            <p className="text-[11px] text-rose-500 font-medium mt-1">
              {errors.date.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
              Cash Sales (₹) *
            </label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="0"
              {...register("cashSales", { valueAsNumber: true })}
              className="w-full rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
            />
            {errors.cashSales && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">
                {errors.cashSales.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
              UPI / QR Sales (₹) *
            </label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="0"
              {...register("upiSales", { valueAsNumber: true })}
              className="w-full rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/20 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
            {errors.upiSales && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">
                {errors.upiSales.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">
              Card POS Sales (₹)
            </label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="0"
              {...register("cardSales", { valueAsNumber: true })}
              className="w-full rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-950/20 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
            />
            {errors.cardSales && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">
                {errors.cardSales.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Other / Credit Sales (₹)
            </label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="0"
              {...register("otherSales", { valueAsNumber: true })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-slate-500 focus:outline-none transition-all"
            />
            {errors.otherSales && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">
                {errors.otherSales.message}
              </p>
            )}
          </div>
        </div>

        {/* Live Automatic Calculation Card */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/30 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Calculator className="h-4 w-4" /> Live Computed Total Sales
            </span>
            <span className="font-mono text-[11px] opacity-80">
              Cash + UPI + Card + Other
            </span>
          </div>
          <div className="text-2xl font-black text-amber-800 dark:text-amber-300">
            {formatINR(totalCalculated)}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes / Observations (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Festival rush, rainy morning slow footfall"
            {...register("notes")}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isSubmitting ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
