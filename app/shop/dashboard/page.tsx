"use client";

import React, { useState } from "react";
import { StatCard } from "@/components/shared/StatCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChartCard } from "@/components/shared/ChartCard";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { DailySalesLineChart } from "@/components/charts/DailySalesLineChart";
import { CashVsOnlineDonutChart } from "@/components/charts/CashVsOnlineDonutChart";
import { MonthlyRevenueBarChart } from "@/components/charts/MonthlyRevenueBarChart";
import { ProfitTrendChart } from "@/components/charts/ProfitTrendChart";
import { AddDailySaleModal } from "@/components/forms/AddDailySaleModal";
import { formatINR } from "@/lib/currency";
import {
  mockShopDashboardSummary,
  mockShopRecentActivity,
  mockShopDailySales,
} from "@/data/shop/sales";
import {
  mockShopDailySalesTrend,
  mockShopCashVsOnlineSplit,
  mockShopMonthlyRevenueTrend,
} from "@/data/shop/reports";
import { mockProfitTrend } from "@/data/shop/profit-loss";
import { DailySale } from "@/types/shop";
import {
  ShoppingCart,
  Coins,
  QrCode,
  TrendingDown,
  LineChart,
  Users,
  Plus,
  ArrowRight,
  Sparkles,
  Receipt,
} from "lucide-react";
import Link from "next/link";

export default function ShopDashboardPage() {
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [salesList, setSalesList] = useState<DailySale[]>(mockShopDailySales);

  const handleAddSaleSuccess = (newSale: DailySale) => {
    setSalesList((prev) => [newSale, ...prev]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pan Shop Dashboard"
        description="Daily counter counter sales, cash vs UPI collections, inventory turnover, and profitability."
        badge="🏪 Pan Shop Workspace"
      >
        <button
          type="button"
          onClick={() => setIsAddSaleOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Record Today's Sales
        </button>
      </PageHeader>

      {/* 6 Pan Shop Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Today's Sales"
          amount={mockShopDashboardSummary.todaySales}
          icon={ShoppingCart}
          colorScheme="amber"
          subtitle="Monday Total"
        />

        <StatCard
          title="Cash Sales"
          amount={mockShopDashboardSummary.cashSales}
          icon={Coins}
          colorScheme="emerald"
          subtitle="Physical cash drawer"
        />

        <StatCard
          title="Online / UPI"
          amount={mockShopDashboardSummary.onlineSales}
          icon={QrCode}
          colorScheme="blue"
          subtitle="QR & Card collection"
        />

        <StatCard
          title="Today's Expenses"
          amount={mockShopDashboardSummary.todayExpenses}
          icon={TrendingDown}
          colorScheme="rose"
          subtitle="Daily operating costs"
        />

        <StatCard
          title="Estimated Profit"
          amount={mockShopDashboardSummary.estimatedTodayProfit}
          icon={LineChart}
          colorScheme="indigo"
          subtitle="Est. net profit today"
        />

        <StatCard
          title="Pending Suppliers"
          amount={mockShopDashboardSummary.pendingSupplierPayments}
          icon={Users}
          colorScheme="violet"
          badge="Due"
          subtitle="Payable to distributors"
        />
      </div>

      {/* 4 Dashboard Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Line Chart (Last 7 Days) */}
        <ChartCard
          title="Daily Sales Trajectory (Last 7 Days)"
          subtitle="Sales curve with Cash and UPI breakdown"
        >
          <DailySalesLineChart data={mockShopDailySalesTrend} />
        </ChartCard>

        {/* Cash vs Online Split Donut */}
        <ChartCard
          title="Cash vs UPI Collection Split"
          subtitle="Ratio of paper cash vs digital QR collections"
        >
          <CashVsOnlineDonutChart data={mockShopCashVsOnlineSplit} />
        </ChartCard>

        {/* Monthly Revenue vs Purchases Bar Chart */}
        <ChartCard
          title="Monthly Revenue vs Stock Purchases"
          subtitle="6-month counter performance"
        >
          <MonthlyRevenueBarChart data={mockShopMonthlyRevenueTrend} />
        </ChartCard>

        {/* Profit Trend Chart */}
        <ChartCard
          title="Profit Trajectory (Gross vs Net)"
          subtitle="Gross margin vs final shop net earnings"
        >
          <ProfitTrendChart data={mockProfitTrend} />
        </ChartCard>
      </div>

      {/* Recent Shop Activity Feed & Quick Stock Link */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Shop Activity
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Today's counter transactions, stock arrivals, and supplier settlements
              </p>
            </div>
            <Link
              href="/shop/sales"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Sales History <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
            {mockShopRecentActivity.map((act) => (
              <div
                key={act.id}
                className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                      act.type === "sales"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : act.type === "purchase"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        : act.type === "payment"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    {act.type === "sales" ? "₹" : act.type === "purchase" ? "📦" : "🧾"}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {act.title}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {act.time} • via {act.method}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-bold block ${
                      act.type === "sales"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {act.type === "sales" ? "+" : "-"}
                    {formatINR(act.amount)}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {act.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stock & Khata Summary Box */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Operations Overview
            </h3>
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-1">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase block">
                Customer Khata (Udhar)
              </span>
              <p className="text-xl font-bold text-amber-900 dark:text-amber-200">
                ₹3,050 Pending
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                4 customers have active credit tabs
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Inventory Alerts
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                2 Items Low / Out of Stock
              </p>
              <p className="text-[11px] text-slate-400">
                Red Bull (6 pcs) & KitKat (0 pcs)
              </p>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <Link
              href="/shop/inventory"
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Open Inventory <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/shop/customer-credit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 text-white p-2.5 text-xs font-semibold hover:bg-amber-700 transition-colors shadow-xs"
            >
              Customer Khata <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Add Daily Sale Modal */}
      <AddDailySaleModal
        isOpen={isAddSaleOpen}
        onClose={() => setIsAddSaleOpen(false)}
        onSuccess={handleAddSaleSuccess}
      />
    </div>
  );
}
