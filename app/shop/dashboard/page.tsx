"use client";

import React, { useState, useEffect, useCallback } from "react";
import { StatCard } from "@/components/shared/StatCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChartCard } from "@/components/shared/ChartCard";
import { DailySalesLineChart } from "@/components/charts/DailySalesLineChart";
import { CashVsOnlineDonutChart } from "@/components/charts/CashVsOnlineDonutChart";
import { MonthlyRevenueBarChart } from "@/components/charts/MonthlyRevenueBarChart";
import { AddDailySaleModal } from "@/components/forms/AddDailySaleModal";
import { EditDailySaleModal } from "@/components/forms/EditDailySaleModal";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { formatINR } from "@/lib/currency";
import { DailySale } from "@/types/shop";
import { getShopDashboardData, ShopDashboardData } from "@/lib/data/shop/dashboard";
import { getAuthenticatedShopWorkspace } from "@/lib/data/shop/workspace";
import {
  ShoppingCart,
  Coins,
  QrCode,
  TrendingDown,
  LineChart,
  Users,
  Plus,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Lock,
  Receipt,
  CreditCard,
  Boxes,
  Package,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ShopDashboardPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [isEditTodayOpen, setIsEditTodayOpen] = useState(false);

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState<ShopDashboardData>({
    todaySales: 0,
    todayCashSales: 0,
    todayOnlineSales: 0,
    todayExpenses: 0,
    thisMonthPurchases: 0,
    estimatedTodayProfit: null,
    pendingSupplierPayments: 0,
    isTodayRecorded: false,
    todaySale: null,
    totalInventoryValue: 0,
    totalProductsCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    lowStockProducts: [],
    thisMonthSales: 0,
    prevMonthSales: 0,
    monthGrowthPct: 0,
    monthTrendPositive: true,
    averageDailySales: 0,
    bestSalesDay: null,
    last7DaysSales: [],
    paymentBreakdown: [],
    monthlyRevenueTrend: [],
    recentActivity: [],
    hasAnySales: false,
    totalRecordedDays: 0,
  });

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

      const data = await getShopDashboardData(targetWsId);
      setDashboardData(data);
    } catch (err) {
      console.error("Failed to load shop dashboard:", err);
      toast.error("Unable to load shop dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddSaleSuccess = () => {
    loadData();
  };

  const handleEditSaleSuccess = () => {
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pan Shop Dashboard"
        description="Daily counter sales, cash vs UPI collections, wholesale purchases, expenses and dues."
        badge="🏪 Pan Shop Workspace"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Dashboard"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {dashboardData.isTodayRecorded ? (
            <button
              type="button"
              onClick={() => setIsEditTodayOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
            >
              <Edit2 className="h-4 w-4" /> Edit Today's Sales
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddSaleOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Record Today's Sales
            </button>
          )}
        </div>
      </PageHeader>

      {/* Today's Sales Status Banner */}
      {!loading && (
        <div
          className={cn(
            "p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-all",
            dashboardData.isTodayRecorded
              ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                dashboardData.isTodayRecorded
                  ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300"
                  : "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300"
              )}
            >
              {dashboardData.isTodayRecorded ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="font-bold text-sm">
                {dashboardData.isTodayRecorded
                  ? `Today's Daily Closing Recorded (${formatINR(dashboardData.todaySales)})`
                  : "Today's sales haven't been recorded yet."}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {dashboardData.isTodayRecorded
                  ? `Cash: ${formatINR(dashboardData.todayCashSales)} • Online: ${formatINR(dashboardData.todayOnlineSales)}`
                  : "Keep daily closings consistent to maintain accurate monthly sales and average footfall."}
              </p>
            </div>
          </div>

          <div>
            {dashboardData.isTodayRecorded ? (
              <button
                type="button"
                onClick={() => setIsEditTodayOpen(true)}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
              >
                Edit Closing
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddSaleOpen(true)}
                className="rounded-lg bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
              >
                Record Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6 Pan Shop Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Today's Sales"
            amount={dashboardData.todaySales}
            icon={ShoppingCart}
            colorScheme="amber"
            subtitle={dashboardData.isTodayRecorded ? "Closing Recorded" : "Not recorded yet"}
          />

          <StatCard
            title="Cash Sales"
            amount={dashboardData.todayCashSales}
            icon={Coins}
            colorScheme="emerald"
            subtitle="Physical cash drawer"
          />

          <StatCard
            title="Online / UPI"
            amount={dashboardData.todayOnlineSales}
            icon={QrCode}
            colorScheme="blue"
            subtitle="QR & Card collection"
          />

          <StatCard
            title="Today's Expenses"
            amount={dashboardData.todayExpenses}
            icon={TrendingDown}
            colorScheme="rose"
            subtitle="Operational overheads"
          />

          <StatCard
            title="Estimated Profit"
            amount="Pending"
            isRawString
            icon={LineChart}
            colorScheme="indigo"
            badge="Phase 8"
            subtitle="Requires Inventory & COGS"
          />

          <StatCard
            title="Pending Suppliers"
            amount={dashboardData.pendingSupplierPayments}
            icon={Users}
            colorScheme="violet"
            badge={dashboardData.pendingSupplierPayments > 0 ? "Dues" : undefined}
            subtitle="Outstanding invoices"
          />
        </div>
      )}

      {/* Monthly Performance & Inventory Highlight Bar */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                This Month Sales
              </span>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {formatINR(dashboardData.thisMonthSales)}
              </p>
            </div>
            {dashboardData.prevMonthSales > 0 && (
              <span
                className={cn(
                  "text-xs font-bold px-2 py-1 rounded-md",
                  dashboardData.monthTrendPositive
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                )}
              >
                {dashboardData.monthTrendPositive ? "+" : "-"}
                {dashboardData.monthGrowthPct}% vs last mo.
              </span>
            )}
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Average Daily Sales
            </span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {formatINR(dashboardData.averageDailySales)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Per active business day
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Purchases This Month
            </span>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {formatINR(dashboardData.thisMonthPurchases)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Stock procurement bills
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Stock Valuation
              </span>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {formatINR(dashboardData.totalInventoryValue)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {dashboardData.totalProductsCount} active items
              </p>
            </div>
            {(dashboardData.lowStockCount > 0 || dashboardData.outOfStockCount > 0) && (
              <span className="text-xs font-bold px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                {dashboardData.lowStockCount + dashboardData.outOfStockCount} Low/Empty
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4 Dashboard Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Line Chart (Last 7 Days) */}
        <ChartCard
          title="Daily Sales Trajectory (Last 7 Days)"
          subtitle="Continuous sales curve with Cash and Online breakdown"
        >
          <DailySalesLineChart data={dashboardData.last7DaysSales} />
        </ChartCard>

        {/* Cash vs Online Split Donut */}
        <ChartCard
          title="Cash vs Online Collection Split"
          subtitle="Proportion of cash drawer vs UPI and POS payments"
        >
          <CashVsOnlineDonutChart data={dashboardData.paymentBreakdown} />
        </ChartCard>

        {/* Monthly Revenue vs Stock Purchases vs Expenses */}
        <ChartCard
          title="Monthly Revenue vs Stock Purchases vs Expenses"
          subtitle="6-month operational comparison of sales revenue, wholesale stock, and operating costs"
        >
          <MonthlyRevenueBarChart data={dashboardData.monthlyRevenueTrend} />
        </ChartCard>

        {/* Profit Trajectory Placeholder */}
        <ChartCard
          title="Profit & Loss Trajectory"
          subtitle="Gross margin vs net shop earnings"
        >
          <div className="w-full h-72 flex flex-col items-center justify-center p-6 text-center rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                Profit Calculation Available in Phase 8
              </p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                True profit cannot be calculated from sales alone. Cost of Goods Sold (COGS) and inventory valuation will connect here.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              Pending: Phase 7 (Inventory & COGS)
            </span>
          </div>
        </ChartCard>
      </div>

      {/* Mixed Shop Activity Feed & Quick Operations Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Shop Operations Activity
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time activity across sales, stock purchases, supplier payments and expenses
              </p>
            </div>
            <Link
              href="/shop/reports"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              All Reports <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {dashboardData.recentActivity.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent shop activity recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {dashboardData.recentActivity.map((act) => {
                let badgeBg = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
                let sign = "+";
                let amountColor = "text-emerald-600 dark:text-emerald-400";
                let icon = <ShoppingCart className="h-4 w-4" />;

                if (act.type === "purchase") {
                  badgeBg = "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
                  sign = "";
                  amountColor = "text-amber-600 dark:text-amber-400";
                  icon = <Receipt className="h-4 w-4" />;
                } else if (act.type === "payment") {
                  badgeBg = "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
                  sign = "-";
                  amountColor = "text-blue-600 dark:text-blue-400";
                  icon = <CreditCard className="h-4 w-4" />;
                } else if (act.type === "expense") {
                  badgeBg = "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
                  sign = "-";
                  amountColor = "text-rose-600 dark:text-rose-400";
                  icon = <TrendingDown className="h-4 w-4" />;
                }

                return (
                  <div
                    key={act.id}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold", badgeBg)}>
                        {icon}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {act.title}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {act.time} • {act.method}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={cn("font-bold block", amountColor)}>
                        {sign}{formatINR(act.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {act.type === "sales"
                          ? "Daily Sales"
                          : act.type === "purchase"
                          ? "Stock Bill"
                          : act.type === "payment"
                          ? "Vendor Payment"
                          : "Shop Expense"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Operations Overview Box */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Quick Navigation
            </h3>

            <Link
              href="/shop/inventory"
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-amber-500/50 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600">
                    Inventory & Products
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {dashboardData.totalProductsCount} items • {formatINR(dashboardData.totalInventoryValue)} value
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/shop/suppliers"
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-amber-500/50 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600">
                    Distributors & Suppliers
                  </p>
                  <p className="text-[11px] text-slate-400">Manage vendor accounts & balances</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/shop/purchases"
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-amber-500/50 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600">
                    Stock Invoices & Bills
                  </p>
                  <p className="text-[11px] text-slate-400">Record stock delivery invoices</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/shop/expenses"
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-rose-500/50 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600">
                  <TrendingDown className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-600">
                    Shop Operating Expenses
                  </p>
                  <p className="text-[11px] text-slate-400">Rent, power bills, helper wages</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>

          <div className="pt-2">
            <Link
              href="/shop/sales"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 text-white p-2.5 text-xs font-semibold hover:bg-amber-700 transition-colors shadow-xs"
            >
              Open Daily Counter Sales <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts & Distributor Re-Order Widget */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Store Low Stock & Out of Stock Alerts
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pan shop items reaching safety minimums or completely empty shelves
              </p>
            </div>
          </div>

          <Link
            href="/shop/inventory"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
          >
            Open Inventory <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {dashboardData.lowStockProducts.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>All active products have sufficient stock. Minimum safety thresholds are satisfied.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 pt-1">
            {dashboardData.lowStockProducts.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "p-3 rounded-xl border flex flex-col justify-between space-y-2 text-xs",
                  p.currentStock === 0
                    ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
                    : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                )}
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block truncate">
                    {p.name}
                  </span>
                  <span className="text-[11px] text-slate-400 block">{p.category}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span
                    className={cn(
                      "font-black text-xs",
                      p.currentStock === 0 ? "text-rose-600" : "text-amber-600"
                    )}
                  >
                    {p.currentStock} {p.unit} left
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Limit: {p.lowStockThreshold}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Daily Sale Modal */}
      <AddDailySaleModal
        isOpen={isAddSaleOpen}
        onClose={() => setIsAddSaleOpen(false)}
        onSuccess={handleAddSaleSuccess}
      />

      {/* Edit Today's Sale Modal */}
      {dashboardData.todaySale && (
        <EditDailySaleModal
          isOpen={isEditTodayOpen}
          sale={dashboardData.todaySale}
          onClose={() => setIsEditTodayOpen(false)}
          onSuccess={handleEditSaleSuccess}
        />
      )}
    </div>
  );
}
