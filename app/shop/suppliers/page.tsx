"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddSupplierModal } from "@/components/forms/AddSupplierModal";
import { AddPurchaseModal } from "@/components/forms/AddPurchaseModal";
import { RecordSupplierPaymentModal } from "@/components/forms/RecordSupplierPaymentModal";
import { SupplierDetailDrawer } from "@/components/forms/SupplierDetailDrawer";
import { formatDate } from "@/lib/date";
import { mockShopSuppliers } from "@/data/shop/suppliers";
import { mockShopPurchases } from "@/data/shop/purchases";
import { Supplier, PurchaseRecord, SupplierPayment } from "@/types/shop";
import { Users, CheckCircle2, Clock, Plus, Phone, CreditCard, Eye, Edit2 } from "lucide-react";

export default function ShopSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockShopSuppliers);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(mockShopPurchases);

  // Modals & Drawers
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [purchaseModalSupplier, setPurchaseModalSupplier] = useState<Supplier | null>(null);
  const [paymentModalSupplier, setPaymentModalSupplier] = useState<Supplier | null>(null);

  const totalPurchases = suppliers.reduce((acc, curr) => acc + curr.totalPurchases, 0);
  const totalPaid = suppliers.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const totalPending = suppliers.reduce((acc, curr) => acc + curr.pendingAmount, 0);

  const handleAddOrEditSupplier = (savedSupplier: Supplier) => {
    if (editingSupplier) {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === savedSupplier.id ? savedSupplier : s))
      );
      setEditingSupplier(null);
    } else {
      setSuppliers((prev) => [savedSupplier, ...prev]);
    }
  };

  const handleAddPurchaseForSupplier = (newPur: PurchaseRecord) => {
    setPurchases((prev) => [newPur, ...prev]);
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.name.toLowerCase() === newPur.supplierName.toLowerCase()) {
          return {
            ...s,
            totalPurchases: s.totalPurchases + newPur.totalAmount,
            totalPaid: s.totalPaid + newPur.paidAmount,
            pendingAmount: s.pendingAmount + newPur.remainingAmount,
            purchasesCount: s.purchasesCount + 1,
            lastPurchaseDate: newPur.purchaseDate,
          };
        }
        return s;
      })
    );
  };

  const handleRecordSupplierPayment = (payment: SupplierPayment) => {
    if (!paymentModalSupplier) return;

    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === paymentModalSupplier.id) {
          const newPaid = s.totalPaid + payment.amount;
          const newPending = Math.max(0, s.pendingAmount - payment.amount);
          return {
            ...s,
            totalPaid: newPaid,
            pendingAmount: newPending,
            paymentHistory: [payment, ...(s.paymentHistory || [])],
          };
        }
        return s;
      })
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distributors & Suppliers"
        description="Directory of wholesale vendors for cold drinks, chips, confectionery, and paan ingredients."
        badge="🏪 Pan Shop Workspace"
      >
        <button
          type="button"
          onClick={() => {
            setEditingSupplier(null);
            setIsAddSupplierOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Supplier
        </button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Lifetime Procurement"
          amount={totalPurchases}
          icon={Users}
          colorScheme="amber"
          subtitle={`${suppliers.length} active wholesale vendors`}
        />

        <StatCard
          title="Total Settled Payments"
          amount={totalPaid}
          icon={CheckCircle2}
          colorScheme="emerald"
          subtitle="Direct bank & UPI settlements"
        />

        <StatCard
          title="Total Outstanding Dues"
          amount={totalPending}
          icon={Clock}
          colorScheme="rose"
          badge="Payable"
          subtitle="Pending vendor balances"
        />
      </div>

      {/* Supplier Cards Directory */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {suppliers.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              title="No suppliers added"
              description="Save your wholesale stock suppliers and distributor contacts."
              icon={Users}
              actionLabel="Add Supplier"
              onAction={() => setIsAddSupplierOpen(true)}
            />
          </div>
        ) : (
          suppliers.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 card-hover flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {s.name}
                    </h4>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {s.category}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSupplier(s);
                      setIsAddSupplierOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{s.phone}</span>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">
                      Total Orders
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {s.purchasesCount} Bills
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block uppercase">
                      Paid
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CurrencyDisplay amount={s.totalPaid} compact />
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 block uppercase">
                      Pending
                    </span>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      <CurrencyDisplay amount={s.pendingAmount} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Last Order: {formatDate(s.lastPurchaseDate)}</span>
                  {s.pendingAmount > 0 ? (
                    <span className="text-rose-500 font-semibold">Payment Due</span>
                  ) : (
                    <span className="text-emerald-500 font-semibold">All Cleared</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewingSupplier(s)}
                    className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 py-1.5 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" /> View
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurchaseModalSupplier(s)}
                    className="flex items-center justify-center gap-1 rounded-lg bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-1.5 px-2 text-xs font-semibold hover:bg-slate-800 cursor-pointer shadow-xs"
                  >
                    + Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentModalSupplier(s)}
                    disabled={s.pendingAmount <= 0}
                    className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 text-white py-1.5 px-2 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                  >
                    <CreditCard className="h-3.5 w-3.5" /> Pay
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      <AddSupplierModal
        isOpen={isAddSupplierOpen}
        onClose={() => {
          setIsAddSupplierOpen(false);
          setEditingSupplier(null);
        }}
        initialData={editingSupplier}
        onSuccess={handleAddOrEditSupplier}
      />

      {/* Supplier Detail Drawer */}
      <SupplierDetailDrawer
        isOpen={!!viewingSupplier}
        onClose={() => setViewingSupplier(null)}
        supplier={viewingSupplier}
        purchases={purchases}
        onAddPurchase={(sup) => setPurchaseModalSupplier(sup)}
        onRecordPayment={(sup) => setPaymentModalSupplier(sup)}
      />

      {/* Add Purchase for Supplier Modal */}
      {purchaseModalSupplier && (
        <AddPurchaseModal
          isOpen={!!purchaseModalSupplier}
          onClose={() => setPurchaseModalSupplier(null)}
          onSuccess={handleAddPurchaseForSupplier}
        />
      )}

      {/* Record Supplier Payment Modal */}
      {paymentModalSupplier && (
        <RecordSupplierPaymentModal
          isOpen={!!paymentModalSupplier}
          onClose={() => setPaymentModalSupplier(null)}
          supplierId={paymentModalSupplier.id}
          supplierName={paymentModalSupplier.name}
          pendingAmount={paymentModalSupplier.pendingAmount}
          onSuccess={handleRecordSupplierPayment}
        />
      )}
    </div>
  );
}
