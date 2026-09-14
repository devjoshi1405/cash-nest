"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/shared/Modal";
import { Product, PurchaseItemRecord } from "@/types/inventory";
import {
  getPurchaseItems,
  savePurchaseItem,
  deletePurchaseItem,
} from "@/lib/data/shop/purchase-items";
import { getProducts } from "@/lib/data/shop/products";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { formatINR } from "@/lib/currency";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Trash2,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  RefreshCw,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ManagePurchaseItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  purchaseId: string;
  billNumber: string;
  supplierName: string;
  totalBillAmount: number;
  onSuccess?: () => void;
}

export function ManagePurchaseItemsModal({
  isOpen,
  onClose,
  workspaceId,
  purchaseId,
  billNumber,
  supplierName,
  totalBillAmount,
  onSuccess,
}: ManagePurchaseItemsModalProps) {
  const [items, setItems] = useState<PurchaseItemRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState(false);

  // New Item Input State
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(0);

  const loadData = useCallback(async () => {
    if (!purchaseId || !workspaceId) return;
    setLoading(true);
    try {
      const [itemsList, prodRes] = await Promise.all([
        getPurchaseItems(purchaseId, workspaceId),
        getProducts(workspaceId, { includeArchived: false, pageSize: 200 }),
      ]);
      setItems(itemsList);
      setProducts(prodRes.products);

      if (prodRes.products.length > 0 && !selectedProductId) {
        setSelectedProductId(prodRes.products[0].id);
        setUnitCost(prodRes.products[0].purchasePrice);
      }
    } catch (err) {
      console.error("Error loading purchase items:", err);
      toast.error("Failed to load purchase items.");
    } finally {
      setLoading(false);
    }
  }, [purchaseId, workspaceId, selectedProductId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // When selected product changes, auto-fill unitCost with product's purchasePrice
  const handleProductChange = (pId: string) => {
    setSelectedProductId(pId);
    const prod = products.find((p) => p.id === pId);
    if (prod) {
      setUnitCost(prod.purchasePrice);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const lineSubtotal = Math.round(Number(quantity || 0) * Number(unitCost || 0) * 100) / 100;
  const itemsTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const difference = Math.round((totalBillAmount - itemsTotal) * 100) / 100;
  const hasDiscrepancy = Math.abs(difference) > 0.01;

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast.error("Please select a product.");
      return;
    }
    if (quantity <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }
    if (unitCost < 0) {
      toast.error("Unit cost cannot be negative.");
      return;
    }

    setSavingItem(true);
    try {
      const res = await savePurchaseItem(workspaceId, {
        purchaseId,
        productId: selectedProductId,
        quantity: Number(quantity),
        unitCost: Number(unitCost),
      });

      if (!res.success || !res.item) {
        toast.error(res.error || "Failed to add purchase item.");
        return;
      }

      toast.success(`Added ${res.item.quantity} ${res.item.productUnit} of "${res.item.productName}" to bill & updated stock.`);
      setQuantity(10);
      loadData();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error("Failed to add purchase line item.");
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (item: PurchaseItemRecord) => {
    if (!window.confirm(`Are you sure you want to remove "${item.productName}" from this purchase bill? This will reverse ${item.quantity} ${item.productUnit} from stock.`)) {
      return;
    }

    try {
      const res = await deletePurchaseItem(workspaceId, item.id);
      if (!res.success) {
        toast.error(res.error || "Failed to remove purchase item.");
        return;
      }

      toast.success(`Removed "${item.productName}" and reversed stock.`);
      loadData();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error("Error deleting purchase item.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Procured Products — Bill #${billNumber}`}
      description={`Assign line items, quantities and wholesale rates for ${supplierName}.`}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Bill Summary Banner */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                Wholesale Bill #{billNumber}
              </p>
              <p className="text-[11px] text-slate-400">
                Supplier: {supplierName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Bill Total
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {formatINR(totalBillAmount)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Items Total
              </span>
              <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                {formatINR(itemsTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Add Product Line Item Form */}
        <form
          onSubmit={handleAddItem}
          className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-amber-600" /> Add Product Line Item
            </span>
            {selectedProduct && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Current in Stock: <strong>{selectedProduct.currentStock} {selectedProduct.unit}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            {/* Product Selector */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Product *
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {products.length === 0 ? (
                  <option value="">No products available in inventory</option>
                ) : (
                  products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity ({selectedProduct?.unit || "Piece"}) *
              </label>
              <input
                type="number"
                step="any"
                min="0.001"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Unit Cost */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit Cost (₹) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Subtotal: <strong className="text-slate-900 dark:text-white">{formatINR(lineSubtotal)}</strong>
            </span>

            <button
              type="submit"
              disabled={savingItem || products.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              {savingItem ? "Adding..." : "Add to Purchase & Update Stock"}
            </button>
          </div>
        </form>

        {/* Existing Line Items Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white">
              Assigned Items ({items.length})
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
              ✓ Stock Posted Atomically
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Loading purchase line items...
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No products assigned to this purchase bill yet. Add products above to record stock.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Rate</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {item.productName}
                        </span>
                        {item.category && (
                          <span className="text-[10px] text-slate-400">{item.category}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        +{item.quantity} {item.productUnit}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatINR(item.unitCost)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatINR(item.lineTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Remove item & reverse stock"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Totals Comparison & Discrepancy Warning */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Total Assigned Items:</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatINR(itemsTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Purchase Invoice Total:</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatINR(totalBillAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-700 dark:text-slate-300">Difference / Variance:</span>
            <span
              className={cn(
                "font-black",
                difference === 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              )}
            >
              {formatINR(difference)}
            </span>
          </div>

          {hasDiscrepancy && (
            <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                Items total ({formatINR(itemsTotal)}) does not match invoice total ({formatINR(totalBillAmount)}).
                Difference of {formatINR(Math.abs(difference))} may be due to delivery charges, GST, or unassigned items.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-2 text-xs font-semibold shadow-xs cursor-pointer hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
