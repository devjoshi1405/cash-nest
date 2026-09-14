"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddDailySaleModal } from "@/components/forms/AddDailySaleModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatDate } from "@/lib/date";
import { mockShopDailySales } from "@/data/shop/sales";
import { DailySale } from "@/types/shop";
import { ShoppingCart, Coins, QrCode, CreditCard, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";

export default function ShopDailySalesPage() {
  const [sales, setSales] = useState<DailySale[]>(mockShopDailySales);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState<DailySale | null>(null);
  const [deletingSale, setDeletingSale] = useState<DailySale | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const totalSalesAll = sales.reduce((acc, curr) => acc + curr.totalSales, 0);
  const totalCashAll = sales.reduce((acc, curr) => acc + curr.cashSales, 0);
  const totalUpiAll = sales.reduce((acc, curr) => acc + curr.upiSales, 0);
  const totalCardAll = sales.reduce((acc, curr) => acc + curr.cardSales, 0);

  const totalPages = Math.ceil(sales.length / pageSize);
  const paginatedSales = sales.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleAddSaleSuccess = (newSale: DailySale) => {
    setSales((prev) => [newSale, ...prev]);
  };

  const handleDeleteConfirm = () => {
    if (deletingSale) {
      setSales((prev) => prev.filter((s) => s.id !== deletingSale.id));
      toast.success(`Sales record for ${formatDate(deletingSale.date)} removed.`);
      setDeletingSale(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Sales Register"
        description="Daily sales records categorized into Cash, UPI QR code, and Card POS swipe collections."
        badge="🏪 Pan Shop Workspace"
      >
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Daily Sales
        </button>
      </PageHeader>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Recorded Sales"
          amount={totalSalesAll}
          icon={ShoppingCart}
          colorScheme="amber"
          subtitle={`${sales.length} active business days`}
        />

        <StatCard
          title="Total Cash Collected"
          amount={totalCashAll}
          icon={Coins}
          colorScheme="emerald"
          subtitle={`${Math.round((totalCashAll / (totalSalesAll || 1)) * 100)}% of sales`}
        />

        <StatCard
          title="Total UPI / QR Payments"
          amount={totalUpiAll}
          icon={QrCode}
          colorScheme="blue"
          subtitle={`${Math.round((totalUpiAll / (totalSalesAll || 1)) * 100)}% of sales`}
        />

        <StatCard
          title="Total Card Swipes"
          amount={totalCardAll}
          icon={CreditCard}
          colorScheme="violet"
          subtitle={`${Math.round((totalCardAll / (totalSalesAll || 1)) * 100)}% of sales`}
        />
      </div>

      {/* Sales History Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Daily Sales Log
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Breakdown of counter revenue by payment channel
            </p>
          </div>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
            {sales.length} Days Recorded
          </span>
        </div>

        {paginatedSales.length === 0 ? (
          <EmptyState
            title="No daily sales recorded"
            description="Start logging daily counter sales by cash and UPI."
            icon={ShoppingCart}
            actionLabel="Record Today's Sales"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-emerald-700 dark:text-emerald-400">
                    Cash Sales
                  </th>
                  <th className="py-3 px-4 text-blue-700 dark:text-blue-400">
                    UPI / QR
                  </th>
                  <th className="py-3 px-4 text-purple-700 dark:text-purple-400">
                    Card POS
                  </th>
                  <th className="py-3 px-4 text-slate-600 dark:text-slate-400">Other</th>
                  <th className="py-3 px-4 text-right text-amber-700 dark:text-amber-400 font-bold">
                    Total Sales
                  </th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {paginatedSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-slate-900 dark:text-white font-bold whitespace-nowrap">
                      {formatDate(sale.date)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      <CurrencyDisplay amount={sale.cashSales} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      <CurrencyDisplay amount={sale.upiSales} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                      <CurrencyDisplay amount={sale.cardSales} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      <CurrencyDisplay amount={sale.otherSales} />
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        <CurrencyDisplay amount={sale.totalSales} />
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs truncate max-w-xs">
                      {sale.notes || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingSale(sale)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="View Day Breakdown"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSale(sale)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
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
        {sales.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sales.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Add Daily Sale Modal */}
      <AddDailySaleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSaleSuccess}
      />

      {/* View Day Details Modal */}
      {viewingSale && (
        <Modal
          isOpen={!!viewingSale}
          onClose={() => setViewingSale(null)}
          title={`Sales Breakdown: ${formatDate(viewingSale.date)}`}
          maxWidth="sm"
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <p className="text-[11px] text-emerald-600">Cash Sales</p>
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  <CurrencyDisplay amount={viewingSale.cashSales} />
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <p className="text-[11px] text-blue-600">UPI / Online</p>
                <p className="text-base font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                  <CurrencyDisplay amount={viewingSale.upiSales} />
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <p className="text-[11px] text-purple-600">Card Swipes</p>
                <p className="text-sm font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                  <CurrencyDisplay amount={viewingSale.cardSales} />
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] text-slate-500">Other / Credit</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                  <CurrencyDisplay amount={viewingSale.otherSales} />
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 text-center">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase">
                Grand Total Sales
              </span>
              <p className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
                <CurrencyDisplay amount={viewingSale.totalSales} />
              </p>
            </div>

            {viewingSale.notes && (
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg">
                Notes: {viewingSale.notes}
              </p>
            )}

            <button
              type="button"
              onClick={() => setViewingSale(null)}
              className="w-full rounded-lg bg-slate-100 dark:bg-slate-800 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingSale}
        onClose={() => setDeletingSale(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Sales Record"
        message={`Are you sure you want to remove the sales record for ${
          deletingSale ? formatDate(deletingSale.date) : ""
        }?`}
        isDestructive
      />
    </div>
  );
}
