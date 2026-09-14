"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { DailySalesLineChart } from "@/components/charts/DailySalesLineChart";
import { CashVsOnlineDonutChart } from "@/components/charts/CashVsOnlineDonutChart";
import { ExpenseCategoryDonutChart } from "@/components/charts/ExpenseCategoryDonutChart";
import { MonthlyRevenueBarChart } from "@/components/charts/MonthlyRevenueBarChart";
import { InventoryCategoryDonutChart } from "@/components/charts/InventoryCategoryDonutChart";
import { CustomerCreditTrendChart } from "@/components/charts/CustomerCreditTrendChart";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatINR } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { getShopReportsData, ShopReportsData } from "@/lib/data/shop/reports";
import { getAuthenticatedShopWorkspace } from "@/lib/data/shop/workspace";
import {
  FileSpreadsheet,
  FileText,
  DollarSign,
  TrendingDown,
  Calendar,
  Lock,
  RefreshCw,
  Receipt,
  Users,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DATE_RANGE_OPTIONS = [
  { label: "This Month", value: "this-month" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "this-week" },
  { label: "Last Month", value: "last-month" },
  { label: "Last 3 Months", value: "last-3-months" },
  { label: "Last 6 Months", value: "last-6-months" },
  { label: "This Year", value: "this-year" },
  { label: "Custom Range", value: "custom" },
];

export default function ShopReportsPage() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dateRange, setDateRange] = useState("this-month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [reportData, setReportData] = useState<ShopReportsData>({
    totalSales: 0,
    totalCash: 0,
    totalUpi: 0,
    totalCard: 0,
    totalOther: 0,
    totalOnline: 0,
    upiDigitalPercentage: 0,
    averageDailySales: 0,
    recordedDays: 0,
    bestSalesDay: null,
    salesTrend: [],
    paymentSplit: [],
    totalPurchases: 0,
    totalPurchasesPaid: 0,
    totalPurchasesPending: 0,
    purchaseBillsCount: 0,
    totalExpenses: 0,
    expensesCount: 0,
    expenseCategories: [],
    totalCreditIssued: 0,
    totalCreditCollected: 0,
    currentOutstandingCredit: 0,
    currentOverdueCredit: 0,
    creditTrend: [],
    collectionPaymentMethods: [],
    customerOutstandingList: [],
    totalInventoryValue: 0,
    totalProductsCount: 0,
    lowStockProductsCount: 0,
    outOfStockProductsCount: 0,
    inventoryCategories: [],
    stockMovementSummary: {
      stockAddedCount: 0,
      stockAddedValue: 0,
      stockRemovedCount: 0,
      stockRemovedValue: 0,
      netMovementValue: 0,
      movementsCount: 0,
    },
    supplierOutstandings: [],
    totalSupplierDues: 0,
    monthlyRevenueTrend: [],
    hasData: false,
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

      const data = await getShopReportsData(
        targetWsId,
        dateRange,
        dateRange === "custom"
          ? { startDate: customStartDate, endDate: customEndDate }
          : undefined
      );

      setReportData(data);
    } catch (err) {
      console.error("Failed to load shop analytics report:", err);
      toast.error("Unable to load shop analytics report.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId, dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleExportCSV = () => {
    toast.info("Exporting CSV statements will be enabled in a future release.");
  };

  const handleExportPDF = () => {
    toast.info("Exporting PDF statements will be enabled in a future release.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pan Shop Reports & Analytics"
        description="Comprehensive analytics of counter revenue, wholesale procurement, customer credit ledgers, inventory valuation, and supplier dues."
        badge="🏪 Pan Shop Workspace"
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Selector */}
          <div className="relative inline-flex items-center">
            <Calendar className="absolute left-3 h-4 w-4 pointer-events-none text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-8 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-xs"
            >
              {DATE_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              ▼
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Analytics"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Export CSV
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-rose-600" /> Export PDF
          </button>
        </div>
      </PageHeader>

      {/* Custom Date Range Toolbar */}
      {dateRange === "custom" && (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">From Date:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">To Date:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Financial & Inventory KPI Highlights */}
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
            title="Total Period Sales"
            amount={reportData.totalSales}
            icon={DollarSign}
            colorScheme="emerald"
            subtitle={`${reportData.recordedDays} open business days`}
          />

          <StatCard
            title="Stock Purchases"
            amount={reportData.totalPurchases}
            icon={Receipt}
            colorScheme="amber"
            subtitle={`${reportData.purchaseBillsCount} wholesale invoices`}
          />

          <StatCard
            title="Operating Expenses"
            amount={reportData.totalExpenses}
            icon={TrendingDown}
            colorScheme="rose"
            subtitle={`${reportData.expensesCount} operating cost items`}
          />

          <StatCard
            title="Credit Issued"
            amount={reportData.totalCreditIssued}
            icon={CreditCard}
            colorScheme="amber"
            subtitle="Udhaar tabs in period"
          />

          <StatCard
            title="Credit Collected"
            amount={reportData.totalCreditCollected}
            icon={CheckCircle2}
            colorScheme="emerald"
            subtitle="Installments received"
          />

          <StatCard
            title="Customer Outstanding"
            amount={reportData.currentOutstandingCredit}
            icon={Users}
            colorScheme={reportData.currentOutstandingCredit > 0 ? "rose" : "emerald"}
            badge={reportData.currentOverdueCredit > 0 ? `${formatINR(reportData.currentOverdueCredit)} Overdue` : undefined}
            subtitle="Current total unpaid debt"
          />
        </div>
      )}

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Line */}
        <ChartCard
          title="Daily Sales Velocity"
          subtitle="Sales progression across cash and digital channels for the period"
        >
          {reportData.salesTrend.length === 0 ? (
            <div className="w-full h-72 flex items-center justify-center text-xs text-slate-400">
              No daily sales recorded for this period.
            </div>
          ) : (
            <DailySalesLineChart data={reportData.salesTrend} />
          )}
        </ChartCard>

        {/* Collection Channel Breakdown */}
        <ChartCard
          title="Daily Sales Channel Split"
          subtitle="Proportion of counter cash drawer vs online QR and POS card payments"
        >
          {reportData.paymentSplit.every((p) => p.value === 0) ? (
            <div className="w-full h-72 flex items-center justify-center text-xs text-slate-400">
              No payment breakdown data available.
            </div>
          ) : (
            <CashVsOnlineDonutChart data={reportData.paymentSplit} />
          )}
        </ChartCard>

        {/* Inventory Valuation by Category */}
        <ChartCard
          title="Inventory Valuation by Category"
          subtitle="Current stock holding cost distributed across store categories"
        >
          {reportData.inventoryCategories.length === 0 ? (
            <div className="w-full h-72 flex items-center justify-center text-xs text-slate-400">
              No active products or stock records available.
            </div>
          ) : (
            <InventoryCategoryDonutChart data={reportData.inventoryCategories} />
          )}
        </ChartCard>

        {/* Expense Category Breakdown */}
        <ChartCard
          title="Shop Overhead Distribution"
          subtitle="Breakdown of rent, electricity, helper wages, packaging and maintenance"
        >
          {reportData.expenseCategories.length === 0 ? (
            <div className="w-full h-72 flex items-center justify-center text-xs text-slate-400">
              No shop expenses recorded for this period.
            </div>
          ) : (
            <ExpenseCategoryDonutChart data={reportData.expenseCategories} />
          )}
        </ChartCard>
      </div>

      {/* 6-Month Combined Trend */}
      <ChartCard
        title="6-Month Trajectory: Revenue vs Stock Purchases vs Expenses"
        subtitle="Monthly revenue compared against inventory procurement and operating overheads"
      >
        <MonthlyRevenueBarChart data={reportData.monthlyRevenueTrend} />
      </ChartCard>

      {/* Customer Credit / Udhaar Analytics Section (Phase 8) */}
      <div className="space-y-4">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-amber-500" />
            Customer Credit & Collection Analytics
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Credit extended on tab vs collections settled by customers across payment channels
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 6-Month Customer Credit Trend Chart */}
          <ChartCard
            title="Customer Credit: Issued vs Collected Trend (6 Months)"
            subtitle="Monthly comparison of new credit tabs given versus debt collected back"
          >
            {reportData.creditTrend.length === 0 ? (
              <div className="w-full h-72 flex items-center justify-center text-xs text-slate-400">
                No credit activity in the last 6 months.
              </div>
            ) : (
              <CustomerCreditTrendChart data={reportData.creditTrend} />
            )}
          </ChartCard>

          {/* Collection Methods Donut Chart */}
          <ChartCard
            title="Customer Repayment Collection Methods"
            subtitle="Payment method distribution for credit collections settled at counter"
          >
            {reportData.collectionPaymentMethods.length === 0 ? (
              <div className="w-full h-72 flex items-center justify-center text-xs text-slate-400">
                No customer credit collections recorded for this period.
              </div>
            ) : (
              <CashVsOnlineDonutChart data={reportData.collectionPaymentMethods} />
            )}
          </ChartCard>
        </div>
      </div>

      {/* Customer Outstanding Balance Ledger Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              Customer Outstanding Receivables Ledger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customer khata accounts ranked by largest outstanding balances
            </p>
          </div>
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
            Total Receivables: {formatINR(reportData.currentOutstandingCredit)}
          </span>
        </div>

        {reportData.customerOutstandingList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No customer credit balances recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4 text-center">Tabs Count</th>
                  <th className="py-3 px-4 text-right">Lifetime Credit</th>
                  <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                    Collected
                  </th>
                  <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                    Net Outstanding
                  </th>
                  <th className="py-3 px-4">Oldest Due Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {reportData.customerOutstandingList.map((c, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {c.customerName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className="hover:text-amber-600 hover:underline"
                        >
                          {c.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-400 font-semibold">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {c.creditsCount} tabs
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-white">
                      {formatINR(c.totalCredit)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatINR(c.totalReceived)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatINR(c.outstanding)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {c.oldestDueDate ? formatDate(c.oldestDueDate) : "No due date"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier Outstanding Report Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              Supplier Outstanding Balance Ledger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Wholesale vendors ranked by pending settlement dues
            </p>
          </div>
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
            Total Dues: {formatINR(reportData.totalSupplierDues)}
          </span>
        </div>

        {reportData.supplierOutstandings.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No supplier balances recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Lifetime Procurement</th>
                  <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                    Settled
                  </th>
                  <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                    Pending Dues
                  </th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {reportData.supplierOutstandings.map((sup) => (
                  <tr
                    key={sup.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {sup.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {sup.phone || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-white">
                      {formatINR(sup.totalPurchases)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatINR(sup.totalPaid)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatINR(sup.pendingAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full font-semibold text-[10px]",
                          sup.pendingAmount > 0
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        )}
                      >
                        {sup.pendingAmount > 0 ? "Dues Payable" : "All Settled"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Accounting & Revenue Recognition Notice */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 shadow-sm flex items-start gap-3.5 text-xs text-slate-600 dark:text-slate-400">
        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 shrink-0 mt-0.5">
          <Lock className="h-4 w-4" />
        </div>
        <div>
          <p className="font-bold text-slate-900 dark:text-white text-sm">
            Revenue Recognition & Receivable Accounting Note
          </p>
          <p className="mt-0.5 leading-relaxed">
            Customer Credit (Udhaar) represents an Accounts Receivable asset rather than immediate cash income. Repayments represent debt collection and are not double-counted as new daily sales revenue. Profit & Loss calculations will properly combine daily counter sales, inventory cost of goods sold (COGS), and shop expenses in Phase 9.
          </p>
        </div>
      </div>
    </div>
  );
}
