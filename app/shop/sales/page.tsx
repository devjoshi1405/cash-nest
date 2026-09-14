"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddDailySaleModal } from "@/components/forms/AddDailySaleModal";
import { EditDailySaleModal } from "@/components/forms/EditDailySaleModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Modal } from "@/components/shared/Modal";
import { SkeletonCard, SkeletonTable } from "@/components/shared/SkeletonCard";
import { formatDate, toISODateString, getCurrentMonthDateRange } from "@/lib/date";
import { formatINR } from "@/lib/currency";
import { DailySale } from "@/types/shop";
import {
  getDailySales,
  deleteDailySale,
  DailySalesSummary,
  calculateOnlineSales,
} from "@/lib/data/shop/sales";
import { getAuthenticatedShopWorkspace } from "@/lib/data/shop/workspace";
import {
  ShoppingCart,
  Coins,
  QrCode,
  CreditCard,
  Plus,
  Trash2,
  Eye,
  Edit2,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DATE_PRESETS = [
  { label: "This Month", value: "this-month" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "this-week" },
  { label: "Last Month", value: "last-month" },
  { label: "All Time", value: "all" },
  { label: "Custom Range", value: "custom" },
];

export default function ShopDailySalesPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sales data & pagination
  const [sales, setSales] = useState<DailySale[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filter state
  const [datePreset, setDatePreset] = useState("this-month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Aggregate summary
  const [summary, setSummary] = useState<DailySalesSummary>({
    totalSales: 0,
    totalCash: 0,
    totalUpi: 0,
    totalCard: 0,
    totalOther: 0,
    totalOnline: 0,
    daysRecorded: 0,
  });

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<DailySale | null>(null);
  const [viewingSale, setViewingSale] = useState<DailySale | null>(null);
  const [deletingSale, setDeletingSale] = useState<DailySale | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate missing days in current month
  const missingDaysCount = useMemo(() => {
    const now = new Date();
    const currentDayOfMonth = now.getDate();
    // Only count if we're viewing current month or all
    if (datePreset === "this-month") {
      const recorded = summary.daysRecorded;
      return Math.max(0, currentDayOfMonth - recorded);
    }
    return 0;
  }, [datePreset, summary.daysRecorded]);

  // Load sales data
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

      const res = await getDailySales({
        workspaceId: targetWsId,
        page: currentPage,
        pageSize,
        preset: datePreset,
        startDate: datePreset === "custom" ? customStartDate : undefined,
        endDate: datePreset === "custom" ? customEndDate : undefined,
        search: searchQuery,
      });

      setSales(res.sales);
      setTotalCount(res.totalCount);
      setSummary(res.summary);
    } catch (err) {
      console.error("Failed to load shop daily sales:", err);
      toast.error("Unable to load shop sales.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId, currentPage, pageSize, datePreset, customStartDate, customEndDate, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    setCurrentPage(1);
  };

  const handleAddSaleSuccess = () => {
    loadData();
  };

  const handleEditSaleSuccess = () => {
    setEditingSale(null);
    loadData();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSale) return;
    setIsDeleting(true);

    const res = await deleteDailySale(deletingSale.id, workspaceId);
    setIsDeleting(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success("Sales entry deleted.");
    setDeletingSale(null);
    loadData();
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Sales Register"
        description="Daily sales records categorized into Cash, UPI QR code, and Card POS swipe collections."
        badge="🏪 Pan Shop Workspace"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Sales"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Record Daily Sales
          </button>
        </div>
      </PageHeader>

      {/* Summary Stat Cards */}
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
            title="Total Recorded Sales"
            amount={summary.totalSales}
            icon={ShoppingCart}
            colorScheme="amber"
            subtitle={`${summary.daysRecorded} active business days recorded`}
          />

          <StatCard
            title="Total Cash Collected"
            amount={summary.totalCash}
            icon={Coins}
            colorScheme="emerald"
            subtitle={`${
              summary.totalSales > 0
                ? Math.round((summary.totalCash / summary.totalSales) * 100)
                : 0
            }% physical cash drawer`}
          />

          <StatCard
            title="Total UPI / QR Payments"
            amount={summary.totalUpi}
            icon={QrCode}
            colorScheme="blue"
            subtitle={`${
              summary.totalSales > 0
                ? Math.round((summary.totalUpi / summary.totalSales) * 100)
                : 0
            }% digital QR collections`}
          />

          <StatCard
            title="Card POS & Other"
            amount={summary.totalCard + summary.totalOther}
            icon={CreditCard}
            colorScheme="violet"
            subtitle={`${
              summary.totalSales > 0
                ? Math.round(
                    ((summary.totalCard + summary.totalOther) / summary.totalSales) * 100
                  )
                : 0
            }% card swipe & credit`}
          />
        </div>
      )}

      {/* Missing Days Notification Banner */}
      {!loading && missingDaysCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>{missingDaysCount} days</strong> have no sales entry this month. Keep your daily closings up to date for accurate shop trends.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white shrink-0 transition-colors cursor-pointer"
          >
            Record Missing Day
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-medium">
            {DATE_PRESETS.map((preset) => {
              const isSelected = datePreset === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetChange(preset.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer",
                    isSelected
                      ? "bg-amber-600 text-white font-semibold shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search notes / observations..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Custom Range Inputs */}
        {datePreset === "custom" && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Sales History Table & Cards */}
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
            {totalCount} {totalCount === 1 ? "Day" : "Days"} Logged
          </span>
        </div>

        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={6} cols={6} />
          </div>
        ) : sales.length === 0 ? (
          <EmptyState
            title="No sales recorded for this period"
            description="Start logging daily counter sales by cash, UPI, and card to track shop performance."
            icon={ShoppingCart}
            actionLabel="Record Daily Sales"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-emerald-700 dark:text-emerald-400">
                      Cash
                    </th>
                    <th className="py-3 px-4 text-blue-700 dark:text-blue-400">
                      UPI
                    </th>
                    <th className="py-3 px-4 text-purple-700 dark:text-purple-400">
                      Card
                    </th>
                    <th className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      Other
                    </th>
                    <th className="py-3 px-4 text-right text-amber-700 dark:text-amber-400 font-bold">
                      Total Sales
                    </th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {sales.map((sale) => (
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
                            onClick={() => setEditingSale(sale)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                            title="Edit Entry"
                          >
                            <Edit2 className="h-4 w-4" />
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

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {sales.map((sale) => (
                <div key={sale.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatDate(sale.date)}
                      </span>
                      {sale.notes && (
                        <p className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5">
                          {sale.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                        {formatINR(sale.totalSales)}
                      </span>
                      <span className="block text-[10px] text-slate-400 uppercase">Total Sales</span>
                    </div>
                  </div>

                  {/* Channel Breakdown Row */}
                  <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Cash</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatINR(sale.cashSales)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">UPI</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {formatINR(sale.upiSales)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Card</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        {formatINR(sale.cardSales)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Other</span>
                      <span className="font-semibold text-slate-500">
                        {formatINR(sale.otherSales)}
                      </span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setViewingSale(sale)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSale(sale)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingSale(sale)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {sales.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
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

      {/* Edit Daily Sale Modal */}
      <EditDailySaleModal
        isOpen={!!editingSale}
        sale={editingSale}
        onClose={() => setEditingSale(null)}
        onSuccess={handleEditSaleSuccess}
      />

      {/* View Day Details Modal */}
      {viewingSale && (
        <Modal
          isOpen={!!viewingSale}
          onClose={() => setViewingSale(null)}
          title={`Daily Sales Closing: ${formatDate(viewingSale.date)}`}
          maxWidth="sm"
        >
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <p className="text-[11px] font-semibold text-emerald-600">Cash Sales</p>
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  <CurrencyDisplay amount={viewingSale.cashSales} />
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <p className="text-[11px] font-semibold text-blue-600">UPI / QR Code</p>
                <p className="text-base font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                  <CurrencyDisplay amount={viewingSale.upiSales} />
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <p className="text-[11px] font-semibold text-purple-600">Card POS Swipes</p>
                <p className="text-sm font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                  <CurrencyDisplay amount={viewingSale.cardSales} />
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-semibold text-slate-500">Other / Credit</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                  <CurrencyDisplay amount={viewingSale.otherSales} />
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 text-center space-y-1">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                Total Daily Counter Sales
              </span>
              <p className="text-2xl font-black text-amber-900 dark:text-amber-200">
                <CurrencyDisplay amount={viewingSale.totalSales} />
              </p>
            </div>

            {viewingSale.notes && (
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-100 dark:border-slate-700 space-y-1">
                <span className="font-semibold text-slate-400 block text-[10px] uppercase">
                  Notes & Observations
                </span>
                <p>{viewingSale.notes}</p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const s = viewingSale;
                  setViewingSale(null);
                  setEditingSale(s);
                }}
                className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer text-center"
              >
                Edit Entry
              </button>
              <button
                type="button"
                onClick={() => setViewingSale(null)}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingSale}
        onClose={() => setDeletingSale(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Daily Sales Record"
        message={`Are you sure you want to remove the sales record for ${
          deletingSale ? formatDate(deletingSale.date) : ""
        }? This will remove the recorded shop sales for this date.`}
        isDestructive
        confirmLabel={isDeleting ? "Deleting..." : "Delete Record"}
      />
    </div>
  );
}
