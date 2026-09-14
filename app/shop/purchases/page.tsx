"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { AddPurchaseModal } from "@/components/forms/AddPurchaseModal";
import { RecordSupplierPaymentModal } from "@/components/forms/RecordSupplierPaymentModal";
import { ManagePurchaseItemsModal } from "@/components/forms/ManagePurchaseItemsModal";
import { formatDate } from "@/lib/date";
import { PurchaseRecord, Supplier } from "@/types/shop";
import { getShopPurchases, deleteShopPurchase } from "@/lib/data/shop/purchases";
import { getShopSuppliers } from "@/lib/data/shop/suppliers";
import { getAuthenticatedShopWorkspace } from "@/lib/data/shop/workspace";
import {
  Receipt,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  CreditCard,
  Search,
  RefreshCw,
  Trash2,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ShopPurchasesPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"All" | "Pending" | "Partially Paid" | "Paid">("All");
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const [summary, setSummary] = useState({
    totalPurchases: 0,
    totalPaid: 0,
    totalPending: 0,
    totalBills: 0,
  });

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [paymentModalBill, setPaymentModalBill] = useState<PurchaseRecord | null>(null);
  const [itemsModalBill, setItemsModalBill] = useState<PurchaseRecord | null>(null);

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

      const [pRes, supList] = await Promise.all([
        getShopPurchases(targetWsId, {
          supplierId: selectedSupplierId,
          status: selectedStatus,
          search: searchTerm,
          page: currentPage,
          pageSize,
        }),
        getShopSuppliers(targetWsId, { includeArchived: false }),
      ]);

      setPurchases(pRes.purchases);
      setTotalPages(pRes.totalPages);
      setTotalCount(pRes.totalCount);
      setSummary(pRes.summary);
      setSuppliers(supList);
    } catch (err) {
      console.error("Failed to load shop purchases:", err);
      toast.error("Unable to load purchases.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId, selectedSupplierId, selectedStatus, searchTerm, currentPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDeletePurchase = async (pur: PurchaseRecord) => {
    if (!workspaceId) return;
    const confirmMsg = pur.paidAmount > 0
      ? `This purchase bill (#${pur.billNumber}) has recorded payments totaling ₹${pur.paidAmount.toLocaleString("en-IN")}. Deleting it will also remove linked payment history. Continue?`
      : `Are you sure you want to delete purchase bill #${pur.billNumber}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await deleteShopPurchase(pur.id, workspaceId);
      if (!res.success) {
        toast.error(res.error || "Failed to delete purchase bill.");
        return;
      }

      toast.success(`Purchase bill #${pur.billNumber} deleted.`);
      loadData();
    } catch (err) {
      toast.error("Error deleting purchase bill.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Purchases & Invoices"
        description="Record wholesale stock invoices from cold drink, snack, confectionery and dairy distributors."
        badge="🏪 Pan Shop Workspace"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Invoices"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Purchase Bill
          </button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Procurement"
            amount={summary.totalPurchases}
            icon={Receipt}
            colorScheme="amber"
            subtitle={`${summary.totalBills} recorded invoices`}
          />

          <StatCard
            title="Total Settled"
            amount={summary.totalPaid}
            icon={CheckCircle2}
            colorScheme="emerald"
            subtitle="Paid out to suppliers"
          />

          <StatCard
            title="Pending Supplier Dues"
            amount={summary.totalPending}
            icon={Clock}
            colorScheme="rose"
            badge="Payable"
            subtitle="Outstanding balance"
          />

          <StatCard
            title="Total Invoices"
            amount={totalCount}
            isRawString
            icon={FileText}
            colorScheme="blue"
            subtitle="Matching filtered register"
          />
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by bill #, supplier or remarks..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Supplier filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Supplier:</span>
            <select
              value={selectedSupplierId}
              onChange={(e) => {
                setSelectedSupplierId(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as any);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Dues</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid in Full</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Stock Invoices Register
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Wholesale procurement delivery records and clearance status
            </p>
          </div>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
            {totalCount} {totalCount === 1 ? "Bill" : "Bills"}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Loading purchases register...
          </div>
        ) : purchases.length === 0 ? (
          <EmptyState
            title="No purchases found"
            description={
              searchTerm || selectedSupplierId !== "all" || selectedStatus !== "All"
                ? "No purchase invoices match your filter criteria."
                : "Record wholesale stock invoices from cold drink, snack, or dairy distributors."
            }
            icon={Receipt}
            actionLabel="Add Purchase Bill"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Bill No</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                    Paid
                  </th>
                  <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                    Remaining
                  </th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {purchases.map((pur) => (
                  <tr
                    key={pur.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(pur.purchaseDate)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {pur.billNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {pur.supplierName}
                      </span>
                      {pur.notes && (
                        <span className="text-[11px] text-slate-400 truncate max-w-xs block">
                          {pur.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      <CurrencyDisplay amount={pur.totalAmount} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      <CurrencyDisplay amount={pur.paidAmount} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      <CurrencyDisplay amount={pur.remainingAmount} />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={pur.paymentStatus} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {pur.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setItemsModalBill(pur)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-semibold text-xs border border-amber-200 dark:border-amber-800 hover:bg-amber-100 cursor-pointer shadow-2xs"
                          title="Manage Stock Line Items"
                        >
                          <Boxes className="h-3.5 w-3.5" /> Items
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentModalBill(pur)}
                          disabled={pur.remainingAmount <= 0}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-100 cursor-pointer shadow-2xs"
                          title="Record Payment"
                        >
                          <CreditCard className="h-3.5 w-3.5" /> Pay
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePurchase(pur)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Bill"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalCount > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Add Purchase Modal */}
      <AddPurchaseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        workspaceId={workspaceId}
        suppliersList={suppliers}
        onSuccess={() => loadData()}
      />

      {/* Record Supplier Payment Modal */}
      {paymentModalBill && (
        <RecordSupplierPaymentModal
          isOpen={!!paymentModalBill}
          onClose={() => setPaymentModalBill(null)}
          workspaceId={workspaceId}
          supplierId={paymentModalBill.supplierId || ""}
          supplierName={paymentModalBill.supplierName}
          purchaseId={paymentModalBill.id}
          billNumber={paymentModalBill.billNumber}
          pendingAmount={paymentModalBill.remainingAmount}
          onSuccess={() => loadData()}
        />
      )}

      {/* Manage Purchase Items Modal */}
      {itemsModalBill && (
        <ManagePurchaseItemsModal
          isOpen={!!itemsModalBill}
          onClose={() => setItemsModalBill(null)}
          workspaceId={workspaceId}
          purchaseId={itemsModalBill.id}
          billNumber={itemsModalBill.billNumber}
          supplierName={itemsModalBill.supplierName}
          totalBillAmount={itemsModalBill.totalAmount}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
}
