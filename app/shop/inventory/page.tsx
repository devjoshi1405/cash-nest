"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { AddProductModal } from "@/components/forms/AddProductModal";
import { EditProductModal } from "@/components/forms/EditProductModal";
import { AdjustStockModal } from "@/components/forms/AdjustStockModal";
import { StockReconciliationModal } from "@/components/forms/StockReconciliationModal";
import { ProductDetailDrawer } from "@/components/inventory/ProductDetailDrawer";
import { StockHistoryDrawer } from "@/components/inventory/StockHistoryDrawer";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/currency";
import { Product, InventorySummary, StockStatus } from "@/types/inventory";
import {
  getProducts,
  archiveProduct,
  restoreProduct,
} from "@/lib/data/shop/products";
import { getInventorySummary } from "@/lib/data/shop/inventory";
import { getAuthenticatedShopWorkspace } from "@/lib/data/shop/workspace";
import {
  Package,
  AlertTriangle,
  Boxes,
  Plus,
  Sliders,
  History,
  Edit2,
  TrendingUp,
  Search,
  RefreshCw,
  Eye,
  Scale,
  Archive,
  RotateCcw,
  Tag,
  AlertOctagon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ShopInventoryPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Products and Summary state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    totalProducts: 0,
    totalUnitsInStock: 0,
    totalInventoryValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockCount: 0,
  });

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<
    "All" | "In Stock" | "Low Stock" | "Out of Stock" | "Archived"
  >("All");
  const [selectedSort, setSelectedSort] = useState<
    | "name-asc"
    | "name-desc"
    | "stock-desc"
    | "stock-asc"
    | "value-desc"
    | "value-asc"
    | "low-stock-first"
    | "updated-desc"
  >("low-stock-first");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [reconcilingProduct, setReconcilingProduct] = useState<Product | null>(null);

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

      const [pRes, sumRes] = await Promise.all([
        getProducts(targetWsId, {
          search: searchTerm,
          category: selectedCategory,
          status: selectedStatus,
          sortBy: selectedSort,
          page: currentPage,
          pageSize,
          includeArchived: selectedStatus === "Archived",
        }),
        getInventorySummary(targetWsId),
      ]);

      setProducts(pRes.products);
      setCategories(pRes.categories);
      setTotalPages(pRes.totalPages);
      setTotalCount(pRes.totalCount);
      setSummary(sumRes);

      // If drawer is open, keep viewed product in sync
      if (viewingProduct) {
        const updated = pRes.products.find((p) => p.id === viewingProduct.id);
        if (updated) setViewingProduct(updated);
      }
    } catch (err) {
      console.error("Failed to load inventory data:", err);
      toast.error("Unable to load inventory.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    workspaceId,
    searchTerm,
    selectedCategory,
    selectedStatus,
    selectedSort,
    currentPage,
    viewingProduct?.id,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleArchive = async (p: Product) => {
    if (!workspaceId) return;
    const confirmMsg =
      p.currentStock > 0
        ? `Warning: "${p.name}" still has ${p.currentStock} ${p.unit} in stock. Archiving will hide it from active procurement. Continue?`
        : `Archive product "${p.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await archiveProduct(p.id, workspaceId);
      if (!res.success) {
        toast.error(res.error || "Failed to archive product.");
        return;
      }
      toast.success(`Product "${p.name}" archived.`);
      loadData();
      if (viewingProduct?.id === p.id) setViewingProduct(null);
    } catch (err) {
      toast.error("Error archiving product.");
    }
  };

  const handleRestore = async (p: Product) => {
    if (!workspaceId) return;
    try {
      const res = await restoreProduct(p.id, workspaceId);
      if (!res.success) {
        toast.error(res.error || "Failed to restore product.");
        return;
      }
      toast.success(`Product "${p.name}" restored to active inventory.`);
      loadData();
      if (viewingProduct?.id === p.id) setViewingProduct(null);
    } catch (err) {
      toast.error("Error restoring product.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory & Product Stock"
        description="Wholesale purchase valuation, selling MRPs, safety thresholds, and audit movements."
        badge="🏪 Pan Shop Workspace"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Inventory"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
          >
            <History className="h-4 w-4 text-amber-600" /> Stock Audit Ledger
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      </PageHeader>

      {/* 5 Real Inventory Summary KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            title="Total Inventory Valuation"
            amount={summary.totalInventoryValue}
            icon={Boxes}
            colorScheme="amber"
            subtitle="Wholesale cost (Stock × Buy Price)"
          />

          <StatCard
            title="Active Products"
            amount={summary.totalProducts}
            isRawString
            icon={Package}
            colorScheme="blue"
            subtitle={`${summary.inStockCount} healthy stock items`}
          />

          <StatCard
            title="Units in Stock"
            amount={summary.totalUnitsInStock}
            isRawString
            icon={Tag}
            colorScheme="emerald"
            subtitle="Physical packaged inventory units"
          />

          <StatCard
            title="Low Stock Alerts"
            amount={summary.lowStockCount}
            isRawString
            icon={AlertTriangle}
            colorScheme="amber"
            badge={summary.lowStockCount > 0 ? "Re-order" : undefined}
            subtitle="At or below safety limit"
          />

          <StatCard
            title="Out of Stock"
            amount={summary.outOfStockCount}
            isRawString
            icon={AlertOctagon}
            colorScheme="rose"
            badge={summary.outOfStockCount > 0 ? "Empty Shelf" : "All Good"}
            subtitle="Require immediate distributor restock"
          />
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by title or category..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Status Tab Dropdown */}
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
              <option value="All">All Active Products</option>
              <option value="In Stock">In Stock (Healthy)</option>
              <option value="Low Stock">Low Stock Alerts</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="Archived">Archived Products</option>
            </select>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Sort:</span>
            <select
              value={selectedSort}
              onChange={(e) => {
                setSelectedSort(e.target.value as any);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="low-stock-first">Low Stock First</option>
              <option value="name-asc">Name (A &rarr; Z)</option>
              <option value="name-desc">Name (Z &rarr; A)</option>
              <option value="stock-desc">Highest Stock</option>
              <option value="stock-asc">Lowest Stock</option>
              <option value="value-desc">Highest Stock Value</option>
              <option value="value-asc">Lowest Stock Value</option>
              <option value="updated-desc">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table & Mobile Cards */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Pan Shop Stock Register
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Current store stock counts, wholesale purchase cost, retail MRP, and margin valuation
            </p>
          </div>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
            {totalCount} {totalCount === 1 ? "Product" : "Products"}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Loading pan shop inventory...
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No inventory products found"
            description={
              searchTerm || selectedCategory !== "all" || selectedStatus !== "All"
                ? "No products match your filter criteria."
                : "Add cold drinks, chocolates, snacks, and mouth fresheners to start tracking stock."
            }
            icon={Package}
            actionLabel="Add First Product"
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
                  <th className="py-3 px-4 text-right">Unit Margin</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => setViewingProduct(p)}
                        className="font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 text-left cursor-pointer transition-colors block"
                      >
                        {p.name}
                      </button>
                      {!p.isActive && (
                        <span className="text-[10px] font-semibold text-rose-500 uppercase">
                          (Archived)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                        {p.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold whitespace-nowrap">
                      <span
                        className={cn(
                          p.currentStock === 0
                            ? "text-rose-600 dark:text-rose-400 font-black"
                            : p.currentStock <= p.lowStockThreshold
                            ? "text-amber-600 dark:text-amber-400 font-black"
                            : "text-slate-900 dark:text-white"
                        )}
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
                      <CurrencyDisplay amount={p.inventoryValue} />
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span
                        className={cn(
                          "font-bold text-[11px]",
                          p.unitMargin >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {formatINR(p.unitMargin)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ({p.marginPercentage}%)
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={p.status} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingProduct(p)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
                          title="View Details & Ledger"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setAdjustingProduct(p)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-semibold text-[11px] border border-amber-200 dark:border-amber-800 hover:bg-amber-100 cursor-pointer shadow-2xs"
                          title="Adjust Stock"
                        >
                          <Sliders className="h-3 w-3" /> Adjust
                        </button>

                        <button
                          type="button"
                          onClick={() => setReconcilingProduct(p)}
                          className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer shadow-2xs"
                          title="Count Audit Reconciliation"
                        >
                          <Scale className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingProduct(p)}
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer shadow-2xs"
                          title="Edit Specs"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {p.isActive ? (
                          <button
                            type="button"
                            onClick={() => handleArchive(p)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shadow-2xs"
                            title="Archive Product"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestore(p)}
                            className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer shadow-2xs"
                            title="Restore Product"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
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

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        workspaceId={workspaceId}
        existingCategories={categories}
        onSuccess={() => loadData()}
      />

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductModal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          workspaceId={workspaceId}
          product={editingProduct}
          existingCategories={categories}
          onSuccess={() => loadData()}
          onOpenAdjustStock={(p) => setAdjustingProduct(p)}
        />
      )}

      {/* Adjust Stock Modal */}
      {adjustingProduct && (
        <AdjustStockModal
          isOpen={!!adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          workspaceId={workspaceId}
          product={adjustingProduct}
          onSuccess={() => loadData()}
        />
      )}

      {/* Stock Reconciliation Modal */}
      {reconcilingProduct && (
        <StockReconciliationModal
          isOpen={!!reconcilingProduct}
          onClose={() => setReconcilingProduct(null)}
          workspaceId={workspaceId}
          product={reconcilingProduct}
          onSuccess={() => loadData()}
        />
      )}

      {/* Product Detail Drawer */}
      {viewingProduct && (
        <ProductDetailDrawer
          isOpen={!!viewingProduct}
          onClose={() => setViewingProduct(null)}
          workspaceId={workspaceId}
          product={viewingProduct}
          onEdit={(p) => setEditingProduct(p)}
          onAdjustStock={(p) => setAdjustingProduct(p)}
          onReconcileStock={(p) => setReconcilingProduct(p)}
          onArchive={(p) => handleArchive(p)}
          onRestore={(p) => handleRestore(p)}
        />
      )}

      {/* Complete Stock History Drawer */}
      <StockHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        workspaceId={workspaceId}
      />
    </div>
  );
}
