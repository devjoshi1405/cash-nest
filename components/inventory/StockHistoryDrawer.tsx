"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Drawer } from "@/components/shared/Drawer";
import { InventoryMovementRecord, InventoryMovementType } from "@/types/inventory";
import { getInventoryMovements } from "@/lib/data/shop/inventory";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/currency";
import {
  History,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface StockHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function StockHistoryDrawer({
  isOpen,
  onClose,
  workspaceId,
}: StockHistoryDrawerProps) {
  const [movements, setMovements] = useState<InventoryMovementRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [movementType, setMovementType] = useState<string>("all");
  const [direction, setDirection] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const loadMovements = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await getInventoryMovements(workspaceId, {
        movementType: movementType !== "all" ? (movementType as InventoryMovementType) : undefined,
        direction: direction !== "all" ? (direction as "in" | "out") : undefined,
        limit: 100,
      });
      setMovements(res.movements);
    } catch (err) {
      console.error("Failed to load inventory movements:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, movementType, direction]);

  useEffect(() => {
    if (isOpen) {
      loadMovements();
    }
  }, [isOpen, loadMovements]);

  const filteredMovements = movements.filter((m) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.productName?.toLowerCase().includes(term) ||
      m.notes?.toLowerCase().includes(term) ||
      m.movementType.toLowerCase().includes(term)
    );
  });

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Stock Audit Ledger"
      description="Historical log of opening stocks, purchase deliveries, manual adjustments, and audit reconciliations."
      width="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search product or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={movementType}
              onChange={(e) => {
                setMovementType(e.target.value);
                setDirection("all");
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-slate-900 dark:text-white text-xs focus:outline-none cursor-pointer flex-1 sm:flex-initial"
            >
              <option value="all">All Movements</option>
              <option value="purchase">Wholesale Purchases</option>
              <option value="opening_stock">Opening Stock</option>
              <option value="adjustment_in">Adjustments IN (+)</option>
              <option value="adjustment_out">Adjustments OUT (-)</option>
              <option value="sale">Sales</option>
              <option value="return_in">Returns IN</option>
              <option value="return_out">Returns OUT</option>
            </select>

            <button
              type="button"
              onClick={loadMovements}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 hover:text-slate-700 disabled:opacity-50 cursor-pointer shadow-2xs"
              title="Refresh History"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Audit List */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Loading stock history...
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            No stock movements found matching criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {filteredMovements.map((m) => {
              const isStockIn = m.direction === "in";
              return (
                <div
                  key={m.id}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {m.productName}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          isStockIn
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        )}
                      >
                        {m.movementType.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                      <span>{formatDate(m.movementDate)}</span>
                      {m.notes && <span>• {m.notes}</span>}
                    </div>
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
                      {isStockIn ? `+${m.quantity}` : `-${m.quantity}`} {m.productUnit}
                    </span>
                    {m.unitCost !== null && m.unitCost > 0 && (
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
    </Drawer>
  );
}
