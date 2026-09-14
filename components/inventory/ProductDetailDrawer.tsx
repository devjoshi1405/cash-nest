"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Drawer } from "@/components/shared/Drawer";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { Product, InventoryMovementRecord, InventoryMovementType } from "@/types/inventory";
import { getInventoryMovements } from "@/lib/data/shop/inventory";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/currency";
import {
  Package,
  Boxes,
  TrendingUp,
  Tag,
  AlertTriangle,
  Sliders,
  Scale,
  Edit2,
  Archive,
  RefreshCw,
  Clock,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  product: Product | null;
  onEdit: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  onReconcileStock: (product: Product) => void;
  onArchive: (product: Product) => void;
  onRestore: (product: Product) => void;
}

export function ProductDetailDrawer({
  isOpen,
  onClose,
  workspaceId,
  product,
  onEdit,
  onAdjustStock,
  onReconcileStock,
  onArchive,
  onRestore,
}: ProductDetailDrawerProps) {
  const [movements, setMovements] = useState<InventoryMovementRecord[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementFilter, setMovementFilter] = useState<string>("all");

  const loadMovements = useCallback(async () => {
    if (!product || !workspaceId) return;
    setLoadingMovements(true);
    try {
      const res = await getInventoryMovements(workspaceId, {
        productId: product.id,
        movementType: movementFilter !== "all" && !["in", "out"].includes(movementFilter) ? (movementFilter as InventoryMovementType) : undefined,
        direction: ["in", "out"].includes(movementFilter) ? (movementFilter as "in" | "out") : undefined,
        limit: 50,
      });
      setMovements(res.movements);
    } catch (err) {
      console.error("Failed to load product movements:", err);
    } finally {
      setLoadingMovements(false);
    }
  }, [product, workspaceId, movementFilter]);

  useEffect(() => {
    if (isOpen && product) {
      loadMovements();
    }
  }, [isOpen, product, loadMovements]);

  if (!product) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      description={`Category: ${product.category} • SKU / Unit: ${product.unit}`}
      width="lg"
    >
      <div className="space-y-6 text-xs">
        {/* Top Status & Valuation Highlight */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block font-medium text-[11px]">
              Current Stock
            </span>
            <span
              className={cn(
                "text-lg font-black block mt-0.5",
                product.currentStock === 0
                  ? "text-rose-600 dark:text-rose-400"
                  : product.currentStock <= product.lowStockThreshold
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-900 dark:text-white"
              )}
            >
              {product.currentStock} {product.unit}
            </span>
            <div className="mt-1">
              <StatusBadge status={product.status} />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block font-medium text-[11px]">
              Stock Valuation
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">
              {formatINR(product.inventoryValue)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              {product.currentStock} × ₹{product.purchasePrice}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block font-medium text-[11px]">
              Purchase Cost
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">
              {formatINR(product.purchasePrice)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Per {product.unit}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block font-medium text-[11px]">
              Selling MRP
            </span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
              {formatINR(product.sellingPrice)}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-1">
              Margin: +{formatINR(product.unitMargin)} ({product.marginPercentage}%)
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => onAdjustStock(product)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <Sliders className="h-3.5 w-3.5" /> Adjust Stock
          </button>

          <button
            type="button"
            onClick={() => onReconcileStock(product)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <Scale className="h-3.5 w-3.5 text-amber-600" /> Count Audit
          </button>

          <button
            type="button"
            onClick={() => onEdit(product)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5 text-blue-600" /> Edit Specs
          </button>

          {product.isActive ? (
            <button
              type="button"
              onClick={() => onArchive(product)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 font-semibold shadow-xs cursor-pointer transition-colors ml-auto"
            >
              <Archive className="h-3.5 w-3.5 text-slate-400" /> Archive Product
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onRestore(product)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-xs cursor-pointer transition-colors ml-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restore Product
            </button>
          )}
        </div>

        {/* Product Specs Box */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
            Inventory Specifications & Thresholds
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Category:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{product.category}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Unit Packaging:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{product.unit}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Low Stock Limit:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                &le; {product.lowStockThreshold} {product.unit}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Gross Margin / Unit:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatINR(product.unitMargin)} ({product.marginPercentage}%)
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Status:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {product.isActive ? "Active in Store" : "Archived"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Last Updated:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatDate(product.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Stock Movement History Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Stock Movement Ledger
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={movementFilter}
                onChange={(e) => setMovementFilter(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">All Movements</option>
                <option value="in">Stock IN (+)</option>
                <option value="out">Stock OUT (-)</option>
                <option value="purchase">Purchases Only</option>
                <option value="opening_stock">Opening Stock</option>
                <option value="adjustment_in">Adjustment In</option>
                <option value="adjustment_out">Adjustment Out</option>
              </select>

              <button
                type="button"
                onClick={loadMovements}
                disabled={loadingMovements}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-slate-700 disabled:opacity-50"
                title="Refresh Ledger"
              >
                <RefreshCw className={cn("h-3 w-3", loadingMovements && "animate-spin")} />
              </button>
            </div>
          </div>

          {loadingMovements ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Loading stock history...
            </div>
          ) : movements.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              No stock movements recorded for this product yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              {movements.map((m) => {
                const isStockIn = m.direction === "in";
                return (
                  <div
                    key={m.id}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                            isStockIn
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          )}
                        >
                          {m.movementType.replace("_", " ").toUpperCase()}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {formatDate(m.movementDate)}
                        </span>
                      </div>
                      {m.notes && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          {m.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span
                        className={cn(
                          "font-black text-sm block",
                          isStockIn
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {isStockIn ? `+${m.quantity}` : `-${m.quantity}`} {product.unit}
                      </span>
                      {m.unitCost !== null && (
                        <span className="text-[10px] text-slate-400 block">
                          @ ₹{m.unitCost} = {formatINR(m.totalCost || 0)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
