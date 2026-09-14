"use client";

import React from "react";
import { Drawer } from "@/components/shared/Drawer";
import { Supplier, PurchaseRecord } from "@/types/shop";
import { formatINR } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Phone, Mail, MapPin, Plus, CreditCard, Receipt, Clock, Edit2, Trash2 } from "lucide-react";

export interface SupplierDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  purchases: PurchaseRecord[];
  onAddPurchase: (supplier: Supplier) => void;
  onRecordPayment: (supplier: Supplier) => void;
  onEditSupplier?: (supplier: Supplier) => void;
  onDeleteSupplier?: (supplier: Supplier) => void;
}

export function SupplierDetailDrawer({
  isOpen,
  onClose,
  supplier,
  purchases,
  onAddPurchase,
  onRecordPayment,
  onEditSupplier,
  onDeleteSupplier,
}: SupplierDetailDrawerProps) {
  if (!supplier) return null;

  const supplierPurchases = purchases.filter(
    (p) => p.supplierId === supplier.id || p.supplierName.toLowerCase() === supplier.name.toLowerCase()
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={supplier.name}
      description={supplier.isActive ? "Active Wholesale Supplier" : "Archived Supplier"}
      width="lg"
    >
      <div className="space-y-6">
        {/* Contact info */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
          {supplier.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-white">{supplier.phone}</span>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              <span>{supplier.email}</span>
            </div>
          )}
          {supplier.address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
              <span>{supplier.address}</span>
            </div>
          )}
          {supplier.notes && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Notes: </span>
              {supplier.notes}
            </div>
          )}
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <p className="text-[11px] text-slate-400">Total Purchases</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              {formatINR(supplier.totalPurchases)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/30 p-3">
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Total Paid</p>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
              {formatINR(supplier.totalPaid)}
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/30 p-3">
            <p className="text-[11px] text-rose-600 dark:text-rose-400">Pending Balance</p>
            <p className="text-sm font-bold text-rose-700 dark:text-rose-300 mt-0.5">
              {formatINR(supplier.pendingAmount)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onAddPurchase(supplier);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-2.5 text-xs font-semibold hover:bg-slate-800 cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add New Bill
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onRecordPayment(supplier);
            }}
            disabled={supplier.pendingAmount <= 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white p-2.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          >
            <CreditCard className="h-3.5 w-3.5" /> Pay Outstanding
          </button>
        </div>

        {/* Edit / Archive Row */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          {onEditSupplier && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditSupplier(supplier);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              <Edit2 className="h-3.5 w-3.5" /> Edit Details
            </button>
          )}

          {onDeleteSupplier && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDeleteSupplier(supplier);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5" /> {supplier.isActive ? "Archive / Delete" : "Delete"}
            </button>
          )}
        </div>

        {/* Purchase History */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Purchase Bills ({supplierPurchases.length})
          </h4>
          {supplierPurchases.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">No bills recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {supplierPurchases.map((bill) => (
                <div
                  key={bill.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {bill.billNumber}
                      </span>
                      <StatusBadge status={bill.paymentStatus} />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      {formatDate(bill.purchaseDate)} {bill.notes ? `• ${bill.notes}` : ""}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {formatINR(bill.totalAmount)}
                    </span>
                    {bill.remainingAmount > 0 ? (
                      <span className="text-[10px] text-rose-500 font-semibold">
                        Rem: {formatINR(bill.remainingAmount)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-500 font-semibold">
                        Paid in Full
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Payment Records (
            {supplier.paymentHistory ? supplier.paymentHistory.length : 0})
          </h4>
          {!supplier.paymentHistory || supplier.paymentHistory.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">No payments logged yet.</p>
          ) : (
            <div className="space-y-2">
              {supplier.paymentHistory.map((pay) => (
                <div
                  key={pay.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      Paid via {pay.paymentMethod}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(pay.date)} {pay.notes ? `• ${pay.notes}` : ""}
                    </span>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatINR(pay.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
