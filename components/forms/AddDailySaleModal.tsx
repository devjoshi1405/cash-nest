"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/shared/Modal";
import { DailySale } from "@/types/shop";
import { formatINR } from "@/lib/currency";
import { toISODateString } from "@/lib/date";
import { toast } from "sonner";
import { Calculator } from "lucide-react";

const dailySaleSchema = z.object({
  date: z.string().min(1, "Date is required"),
  cashSales: z.number().min(0, "Cannot be negative"),
  upiSales: z.number().min(0, "Cannot be negative"),
  cardSales: z.number().min(0, "Cannot be negative"),
  otherSales: z.number().min(0, "Cannot be negative"),
  notes: z.string().optional(),
});

type DailySaleFormValues = z.infer<typeof dailySaleSchema>;

export interface AddDailySaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (sale: DailySale) => void;
}

export function AddDailySaleModal({ isOpen, onClose, onSuccess }: AddDailySaleModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DailySaleFormValues>({
    resolver: zodResolver(dailySaleSchema),
    defaultValues: {
      date: toISODateString(),
      cashSales: 0,
      upiSales: 0,
      cardSales: 0,
      otherSales: 0,
      notes: "",
    },
  });

  const cash = watch("cashSales") || 0;
  const upi = watch("upiSales") || 0;
  const card = watch("cardSales") || 0;
  const other = watch("otherSales") || 0;

  const totalCalculated = Number(cash) + Number(upi) + Number(card) + Number(other);

  const onSubmit = (data: DailySaleFormValues) => {
    const total =
      Number(data.cashSales) +
      Number(data.upiSales) +
      Number(data.cardSales) +
      Number(data.otherSales);

    if (total <= 0) {
      toast.error("Total daily sales must be greater than 0");
      return;
    }

    const newSale: DailySale = {
      id: `sale-${Date.now()}`,
      date: data.date,
      cashSales: Number(data.cashSales),
      upiSales: Number(data.upiSales),
      cardSales: Number(data.cardSales),
      otherSales: Number(data.otherSales),
      totalSales: total,
      notes: data.notes,
    };

    if (onSuccess) {
      onSuccess(newSale);
    }

    toast.success(`Daily sales of ${formatINR(total)} recorded successfully!`);
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Daily Sales Entry"
      description="Record counter cash, UPI QR payments, and card collections for the day."
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
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
              Cash Sales (₹) *
            </label>
            <input
              type="number"
              placeholder="3800"
              {...register("cashSales", { valueAsNumber: true })}
              className="w-full rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
              UPI / QR Sales (₹) *
            </label>
            <input
              type="number"
              placeholder="2400"
              {...register("upiSales", { valueAsNumber: true })}
              className="w-full rounded-lg border border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/20 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">
              Card POS Sales (₹)
            </label>
            <input
              type="number"
              placeholder="300"
              {...register("cardSales", { valueAsNumber: true })}
              className="w-full rounded-lg border border-purple-200 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-950/20 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Other / Credit Sales (₹)
            </label>
            <input
              type="number"
              placeholder="0"
              {...register("otherSales", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
            />
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
            className="rounded-lg bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer"
          >
            Save Daily Sales
          </button>
        </div>
      </form>
    </Modal>
  );
}
