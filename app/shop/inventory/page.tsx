"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { Drawer } from "@/components/shared/Drawer";
import { AddProductModal } from "@/components/forms/AddProductModal";
import { AdjustStockModal } from "@/components/forms/AdjustStockModal";
import { formatDate } from "@/lib/date";
import { mockShopInventory, mockStockAdjustments } from "@/data/shop/inventory";
import { InventoryProduct, StockAdjustment, StockStatus } from "@/types/shop";
import {
  Package,
  AlertTriangle,
  Boxes,
  Plus,
  Sliders,
  History,
  Edit2,
  TrendingUp,
} from "lucide-react";

export default function ShopInventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>(mockShopInventory);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>(mockStockAdjustments);

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<InventoryProduct | null>(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const totalStockValue = products.reduce((acc, curr) => acc + curr.stockValue, 0);
  const lowStockCount = products.filter((p) => p.status === "Low Stock" || p.status === "Out of Stock").length;
  const inStockCount = products.filter((p) => p.status === "In Stock").length;

  const totalPages = Math.ceil(products.length / pageSize);
  const paginatedProducts = products.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleAddOrEditSuccess = (savedProduct: InventoryProduct) => {
    if (editingProduct) {
      setProducts((prev) =>
        prev.map((item) => (item.id === savedProduct.id ? savedProduct : item))
      );
      setEditingProduct(null);
    } else {
      setProducts((prev) => [savedProduct, ...prev]);
    }
  };

  const handleAdjustSuccess = (adjustment: StockAdjustment, newStock: number) => {
    setAdjustments((prev) => [adjustment, ...prev]);
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === adjustment.productId) {
          let status: StockStatus = "In Stock";
          if (newStock <= 0) {
            status = "Out of Stock";
          } else if (newStock <= p.minThreshold) {
            status = "Low Stock";
          }
          return {
            ...p,
            currentStock: newStock,
            stockValue: newStock * p.purchasePrice,
            status,
          };
        }
        return p;
      })
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory & Stock Management"
        description="Monitor cold drinks, snacks, water bottles, cigarettes, and confectionery stocks."
        badge="🏪 Pan Shop Workspace"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
          >
            <History className="h-4 w-4" /> Stock History
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Stock Valuation"
          amount={totalStockValue}
          icon={Boxes}
          colorScheme="amber"
          subtitle="At wholesale purchase cost"
        />

        <StatCard
          title="Healthy Stock Items"
          amount={inStockCount}
          isRawString
          icon={Package}
          colorScheme="emerald"
          subtitle="Above minimum safety threshold"
        />

        <StatCard
          title="Low & Out of Stock Alerts"
          amount={lowStockCount}
          isRawString
          icon={AlertTriangle}
          colorScheme="rose"
          badge={lowStockCount > 0 ? "Action Required" : "All Good"}
          subtitle="Need distributor re-ordering"
        />
      </div>

      {/* Inventory Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Current Inventory List
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Available stock counts, purchase costs, selling MRP, and estimated stock value
            </p>
          </div>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
            {products.length} Products
          </span>
        </div>

        {paginatedProducts.length === 0 ? (
          <EmptyState
            title="No inventory products"
            description="Add cold drinks, chocolates, snacks, and mouth fresheners to track stock."
            icon={Package}
            actionLabel="Add Product"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Stock Qty</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                    Selling MRP
                  </th>
                  <th className="py-3 px-4 text-right font-bold">Stock Value</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {paginatedProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {p.name}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold whitespace-nowrap">
                      <span
                        className={
                          p.currentStock === 0
                            ? "text-rose-600 dark:text-rose-400"
                            : p.currentStock <= p.minThreshold
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-900 dark:text-white"
                        }
                      >
                        {p.currentStock} {p.unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <CurrencyDisplay amount={p.purchasePrice} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      <CurrencyDisplay amount={p.sellingPrice} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                      <CurrencyDisplay amount={p.stockValue} />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAdjustingProduct(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-semibold text-xs border border-amber-200 dark:border-amber-800 hover:bg-amber-100 cursor-pointer"
                          title="Adjust Stock"
                        >
                          <Sliders className="h-3.5 w-3.5" /> Adjust
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(p);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
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
        {products.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={products.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
        initialData={editingProduct}
        onSuccess={handleAddOrEditSuccess}
      />

      {/* Adjust Stock Modal */}
      {adjustingProduct && (
        <AdjustStockModal
          isOpen={!!adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          productId={adjustingProduct.id}
          productName={adjustingProduct.name}
          currentStock={adjustingProduct.currentStock}
          unit={adjustingProduct.unit}
          onSuccess={handleAdjustSuccess}
        />
      )}

      {/* Stock History Drawer */}
      <Drawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        title="Stock Adjustment Log"
        description="Physical stock additions, manual corrections, and damaged items history."
        width="md"
      >
        <div className="space-y-3 text-xs">
          {adjustments.length === 0 ? (
            <p className="text-center py-8 text-slate-400">No stock adjustments logged.</p>
          ) : (
            adjustments.map((adj) => (
              <div
                key={adj.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {adj.productName}
                  </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                      adj.type === "addition"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : adj.type === "damage"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {adj.type === "addition" ? "+ Stock In" : adj.type === "damage" ? "⚠️ Damage" : "- Stock Out"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                  <span>{formatDate(adj.date)} • Reason: {adj.reason}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {adj.quantity} Qty
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Drawer>
    </div>
  );
}
