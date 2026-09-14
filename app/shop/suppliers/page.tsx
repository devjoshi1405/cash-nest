"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { AddSupplierModal } from "@/components/forms/AddSupplierModal";
import { AddPurchaseModal } from "@/components/forms/AddPurchaseModal";
import { RecordSupplierPaymentModal } from "@/components/forms/RecordSupplierPaymentModal";
import { SupplierDetailDrawer } from "@/components/forms/SupplierDetailDrawer";
import { formatDate } from "@/lib/date";
import { Supplier, PurchaseRecord } from "@/types/shop";
import {
  getShopSuppliers,
  getShopSupplierById,
  deleteShopSupplier,
} from "@/lib/data/shop/suppliers";
import { getShopPurchases } from "@/lib/data/shop/purchases";
import { getAuthenticatedShopWorkspace } from "@/lib/data/shop/workspace";
import {
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Phone,
  CreditCard,
  Eye,
  Edit2,
  Search,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ShopSuppliersPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "pending" | "purchases" | "recent">("pending");

  // Modals & Drawers
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [purchaseModalSupplier, setPurchaseModalSupplier] = useState<Supplier | null>(null);
  const [paymentModalSupplier, setPaymentModalSupplier] = useState<Supplier | null>(null);

  const loadData = useCallback(async () => {
    try {
      let targetWsId = workspaceId;
      if (!targetWsId) {
        const authWs = await getAuthenticatedShopWorkspace();
        if (!authWs) {
          setLoading(false);
          return;
        }
        targetWsId = authWs.workspaceId;
        setWorkspaceId(targetWsId);
      }

      const [suppliersList, purchasesRes] = await Promise.all([
        getShopSuppliers(targetWsId, {
          search: searchTerm,
          sortBy,
          includeArchived: false,
        }),
        getShopPurchases(targetWsId, { pageSize: 50 }),
      ]);

      setSuppliers(suppliersList);
      setPurchases(purchasesRes.purchases);
    } catch (err) {
      console.error("Failed to load shop suppliers:", err);
      toast.error("Unable to load suppliers.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId, searchTerm, sortBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const totalPurchases = suppliers.reduce((acc, curr) => acc + curr.totalPurchases, 0);
  const totalPaid = suppliers.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const totalPending = suppliers.reduce((acc, curr) => acc + curr.pendingAmount, 0);

  const handleViewSupplier = async (s: Supplier) => {
    if (!workspaceId) return;
    const res = await getShopSupplierById(s.id, workspaceId);
    if (res.supplier) {
      setViewingSupplier(res.supplier);
      setPurchases(res.purchases);
    } else {
      setViewingSupplier(s);
    }
  };

  const handleDeleteOrArchiveSupplier = async (s: Supplier) => {
    if (!workspaceId) return;
    const confirmMsg = s.purchasesCount > 0
      ? `Supplier "${s.name}" has purchase history. Archiving will hide them from new bills while preserving past records. Continue?`
      : `Are you sure you want to delete supplier "${s.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await deleteShopSupplier(s.id, workspaceId);
      if (!res.success) {
        toast.error(res.error || "Failed to remove supplier.");
        return;
      }

      toast.success(
        res.archived
          ? `Supplier "${s.name}" archived.`
          : `Supplier "${s.name}" deleted.`
      );
      if (viewingSupplier?.id === s.id) {
        setViewingSupplier(null);
      }
      loadData();
    } catch (err) {
      toast.error("Error deleting supplier.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distributors & Wholesale Suppliers"
        description="Directory of wholesale vendors for cold drinks, snacks, confectionery, dairy and paan raw materials."
        badge="🏪 Pan Shop Workspace"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Suppliers"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

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
        </div>
      </PageHeader>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
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
            subtitle="Direct bank, cash & UPI settlements"
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
      )}

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers by name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-slate-500 whitespace-nowrap">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="pending">Largest Outstanding Dues</option>
            <option value="purchases">Highest Total Procurement</option>
            <option value="recent">Recently Active</option>
            <option value="name">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Supplier Cards Directory */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState
          title="No suppliers found"
          description={
            searchTerm
              ? `No suppliers matching "${searchTerm}".`
              : "Save your wholesale stock suppliers and distributor contacts."
          }
          icon={Users}
          actionLabel="Add First Supplier"
          onAction={() => {
            setEditingSupplier(null);
            setIsAddSupplierOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {suppliers.map((s) => (
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSupplier(s);
                        setIsAddSupplierOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Supplier"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOrArchiveSupplier(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Archive or Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {s.phone ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{s.phone}</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 mt-2 italic">No phone saved</div>
                )}

                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                      Total Orders
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {s.purchasesCount} {s.purchasesCount === 1 ? "Bill" : "Bills"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block uppercase font-semibold">
                      Settled
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CurrencyDisplay amount={s.totalPaid} compact />
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 block uppercase font-semibold">
                      Pending
                    </span>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      <CurrencyDisplay amount={s.pendingAmount} compact />
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {s.purchasesCount > 0
                      ? `Last Order: ${formatDate(s.lastPurchaseDate)}`
                      : "No orders yet"}
                  </span>
                  {s.pendingAmount > 0 ? (
                    <span className="text-rose-500 font-semibold">Dues Payable</span>
                  ) : (
                    <span className="text-emerald-500 font-semibold">All Cleared</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleViewSupplier(s)}
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
          ))}
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      <AddSupplierModal
        isOpen={isAddSupplierOpen}
        onClose={() => {
          setIsAddSupplierOpen(false);
          setEditingSupplier(null);
        }}
        workspaceId={workspaceId}
        initialData={editingSupplier}
        onSuccess={() => loadData()}
      />

      {/* Supplier Detail Drawer */}
      <SupplierDetailDrawer
        isOpen={!!viewingSupplier}
        onClose={() => setViewingSupplier(null)}
        supplier={viewingSupplier}
        purchases={purchases}
        onAddPurchase={(sup) => setPurchaseModalSupplier(sup)}
        onRecordPayment={(sup) => setPaymentModalSupplier(sup)}
        onEditSupplier={(sup) => {
          setEditingSupplier(sup);
          setIsAddSupplierOpen(true);
        }}
        onDeleteSupplier={(sup) => handleDeleteOrArchiveSupplier(sup)}
      />

      {/* Add Purchase for Supplier Modal */}
      {purchaseModalSupplier && (
        <AddPurchaseModal
          isOpen={!!purchaseModalSupplier}
          onClose={() => setPurchaseModalSupplier(null)}
          workspaceId={workspaceId}
          initialSupplierId={purchaseModalSupplier.id}
          suppliersList={suppliers}
          onSuccess={() => loadData()}
        />
      )}

      {/* Record Supplier Payment Modal */}
      {paymentModalSupplier && (
        <RecordSupplierPaymentModal
          isOpen={!!paymentModalSupplier}
          onClose={() => setPaymentModalSupplier(null)}
          workspaceId={workspaceId}
          supplierId={paymentModalSupplier.id}
          supplierName={paymentModalSupplier.name}
          pendingAmount={paymentModalSupplier.pendingAmount}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
}
