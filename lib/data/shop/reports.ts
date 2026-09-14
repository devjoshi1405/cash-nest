import { createClient } from "@/lib/supabase/client";
import { DailySalesTrendPoint } from "@/components/charts/DailySalesLineChart";
import { SplitItem } from "@/components/charts/CashVsOnlineDonutChart";
import { ShopMonthlyBarData } from "@/components/charts/MonthlyRevenueBarChart";
import { ExpenseCategoryDistribution } from "@/types/home";
import { CustomerOutstandingSummary } from "@/types/shop";
import {
  toISODateString,
  formatDate,
  getCurrentMonthDateRange,
  getPreviousMonthDateRange,
  getRecentMonths,
} from "@/lib/date";
import {
  mapDbDailySaleToUi,
  calculateDailySalesTotal,
  calculateOnlineSales,
} from "./sales";
import {
  getCustomerCreditSummary,
  getCustomerOutstandingSummary,
} from "./customer-credit";

export interface SupplierOutstandingItem {
  id: string;
  name: string;
  phone: string;
  totalPurchases: number;
  totalPaid: number;
  pendingAmount: number;
}

import { CategoryInventoryValue, StockMovementSummary } from "@/types/inventory";

export interface ShopReportsData {
  // Sales
  totalSales: number;
  totalCash: number;
  totalUpi: number;
  totalCard: number;
  totalOther: number;
  totalOnline: number;
  upiDigitalPercentage: number;
  averageDailySales: number;
  recordedDays: number;
  bestSalesDay: {
    date: string;
    amount: number;
    formattedDate: string;
  } | null;
  salesTrend: DailySalesTrendPoint[];
  paymentSplit: SplitItem[];

  // Purchases
  totalPurchases: number;
  totalPurchasesPaid: number;
  totalPurchasesPending: number;
  purchaseBillsCount: number;

  // Expenses
  totalExpenses: number;
  expensesCount: number;
  expenseCategories: ExpenseCategoryDistribution[];

  // Customer Credit / Udhaar (Phase 8)
  totalCreditIssued: number;
  totalCreditCollected: number;
  currentOutstandingCredit: number;
  currentOverdueCredit: number;
  creditTrend: Array<{ month: string; issued: number; collected: number }>;
  collectionPaymentMethods: SplitItem[];
  customerOutstandingList: CustomerOutstandingSummary[];

  // Inventory & Stock (Phase 7)
  totalInventoryValue: number;
  totalProductsCount: number;
  lowStockProductsCount: number;
  outOfStockProductsCount: number;
  inventoryCategories: CategoryInventoryValue[];
  stockMovementSummary: StockMovementSummary;

  // Supplier Balances
  supplierOutstandings: SupplierOutstandingItem[];
  totalSupplierDues: number;

  // Trends
  monthlyRevenueTrend: ShopMonthlyBarData[];

  hasData: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  Rent: "#8B5CF6",
  Electricity: "#F59E0B",
  Transport: "#3B82F6",
  Maintenance: "#10B981",
  Employee: "#EC4899",
  Packaging: "#06B6D4",
  Equipment: "#6366F1",
  Internet: "#14B8A6",
  Cleaning: "#84CC16",
  "License / Fees": "#EAB308",
  Miscellaneous: "#64748B",
  Other: "#94A3B8",
};

/**
 * Fetch and aggregate complete Pan Shop analytics for the specified date filter.
 */
export async function getShopReportsData(
  workspaceId: string,
  dateRangePreset: string = "this-month",
  customRange?: { startDate?: string; endDate?: string }
): Promise<ShopReportsData> {
  const supabase = createClient();
  const now = new Date();
  const todayStr = toISODateString(now);

  let startDate: string | undefined;
  let endDate: string | undefined;

  switch (dateRangePreset) {
    case "today":
      startDate = todayStr;
      endDate = todayStr;
      break;
    case "yesterday": {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      startDate = toISODateString(y);
      endDate = startDate;
      break;
    }
    case "this-week": {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      startDate = toISODateString(monday);
      endDate = toISODateString(sunday);
      break;
    }
    case "this-month": {
      const r = getCurrentMonthDateRange(now);
      startDate = r.startDate;
      endDate = r.endDate;
      break;
    }
    case "last-month": {
      const r = getPreviousMonthDateRange(now);
      startDate = r.startDate;
      endDate = r.endDate;
      break;
    }
    case "last-3-months": {
      const startD = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const endR = getCurrentMonthDateRange(now);
      startDate = toISODateString(startD);
      endDate = endR.endDate;
      break;
    }
    case "last-6-months": {
      const startD = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const endR = getCurrentMonthDateRange(now);
      startDate = toISODateString(startD);
      endDate = endR.endDate;
      break;
    }
    case "this-year": {
      const y = now.getFullYear();
      startDate = `${y}-01-01`;
      endDate = `${y}-12-31`;
      break;
    }
    case "custom": {
      startDate = customRange?.startDate;
      endDate = customRange?.endDate;
      break;
    }
    default: {
      const r = getCurrentMonthDateRange(now);
      startDate = r.startDate;
      endDate = r.endDate;
      break;
    }
  }

  const recent6 = getRecentMonths(6, now);
  const trendWindowStart = recent6[0]?.startDate || startDate || "";

  try {
    // 1. Parallel queries for Sales, Purchases, Expenses, Customer Credits, Suppliers, Products, Movements, and 6-Month Windows
    let salesQuery = supabase
      .from("daily_sales")
      .select("*")
      .eq("workspace_id", workspaceId);

    let purchasesQuery = supabase
      .from("purchases")
      .select("*, supplier_payments(amount)")
      .eq("workspace_id", workspaceId);

    let expensesQuery = supabase
      .from("transactions")
      .select("*, categories(name)")
      .eq("workspace_id", workspaceId)
      .eq("type", "expense");

    let creditsIssuedQuery = supabase
      .from("customer_credits")
      .select("original_amount, credit_date")
      .eq("workspace_id", workspaceId)
      .neq("is_archived", true);

    let creditPaymentsQuery = supabase
      .from("customer_credit_payments")
      .select("amount, payment_date, payment_method, customer_credits!inner(workspace_id)")
      .eq("customer_credits.workspace_id", workspaceId);

    const suppliersQuery = supabase
      .from("suppliers")
      .select("id, name, phone, purchases(total_amount), supplier_payments(amount)")
      .eq("workspace_id", workspaceId)
      .neq("is_active", false);

    const productsQuery = supabase
      .from("products")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    let movementsQuery = supabase
      .from("inventory_movements")
      .select("movement_type, quantity, unit_cost, movement_date")
      .eq("workspace_id", workspaceId);

    const trendSalesQuery = supabase
      .from("daily_sales")
      .select("sale_date, cash_amount, upi_amount, card_amount, other_amount")
      .eq("workspace_id", workspaceId)
      .gte("sale_date", trendWindowStart);

    const trendPurchasesQuery = supabase
      .from("purchases")
      .select("purchase_date, total_amount")
      .eq("workspace_id", workspaceId)
      .gte("purchase_date", trendWindowStart);

    const trendExpensesQuery = supabase
      .from("transactions")
      .select("transaction_date, amount")
      .eq("workspace_id", workspaceId)
      .eq("type", "expense")
      .gte("transaction_date", trendWindowStart);

    const trendCreditsQuery = supabase
      .from("customer_credits")
      .select("original_amount, credit_date")
      .eq("workspace_id", workspaceId)
      .gte("credit_date", trendWindowStart)
      .neq("is_archived", true);

    const trendCreditPaymentsQuery = supabase
      .from("customer_credit_payments")
      .select("amount, payment_date, customer_credits!inner(workspace_id)")
      .eq("customer_credits.workspace_id", workspaceId)
      .gte("payment_date", trendWindowStart);

    if (startDate) {
      salesQuery = salesQuery.gte("sale_date", startDate);
      purchasesQuery = purchasesQuery.gte("purchase_date", startDate);
      expensesQuery = expensesQuery.gte("transaction_date", startDate);
      creditsIssuedQuery = creditsIssuedQuery.gte("credit_date", startDate);
      creditPaymentsQuery = creditPaymentsQuery.gte("payment_date", startDate);
      movementsQuery = movementsQuery.gte("movement_date", startDate);
    }
    if (endDate) {
      salesQuery = salesQuery.lte("sale_date", endDate);
      purchasesQuery = purchasesQuery.lte("purchase_date", endDate);
      expensesQuery = expensesQuery.lte("transaction_date", endDate);
      creditsIssuedQuery = creditsIssuedQuery.lte("credit_date", endDate);
      creditPaymentsQuery = creditPaymentsQuery.lte("payment_date", endDate);
      movementsQuery = movementsQuery.lte("movement_date", endDate);
    }

    salesQuery = salesQuery.order("sale_date", { ascending: true });
    purchasesQuery = purchasesQuery.order("purchase_date", { ascending: true });
    expensesQuery = expensesQuery.order("transaction_date", { ascending: true });

    const [
      salesRes,
      purchasesRes,
      expensesRes,
      creditsIssuedRes,
      creditPaymentsRes,
      suppliersRes,
      productsRes,
      movementsRes,
      trendSalesRes,
      trendPurchasesRes,
      trendExpensesRes,
      trendCreditsRes,
      trendCreditPaymentsRes,
      customerSummaryRes,
      customerOutstandingListRes,
    ] = await Promise.all([
      salesQuery,
      purchasesQuery,
      expensesQuery,
      creditsIssuedQuery,
      creditPaymentsQuery,
      suppliersQuery,
      productsQuery,
      movementsQuery,
      trendSalesQuery,
      trendPurchasesQuery,
      trendExpensesQuery,
      trendCreditsQuery,
      trendCreditPaymentsQuery,
      getCustomerCreditSummary(workspaceId),
      getCustomerOutstandingSummary(workspaceId),
    ]);

    // 2. Aggregate Sales
    const salesList = (salesRes.data || []).map(mapDbDailySaleToUi);
    let totalCash = 0;
    let totalUpi = 0;
    let totalCard = 0;
    let totalOther = 0;
    let bestSalesDay: { date: string; amount: number; formattedDate: string } | null = null;
    const salesTrend: DailySalesTrendPoint[] = [];

    for (const sale of salesList) {
      totalCash += sale.cashSales;
      totalUpi += sale.upiSales;
      totalCard += sale.cardSales;
      totalOther += sale.otherSales;

      if (!bestSalesDay || sale.totalSales > bestSalesDay.amount) {
        bestSalesDay = {
          date: sale.date,
          amount: sale.totalSales,
          formattedDate: formatDate(sale.date),
        };
      }

      salesTrend.push({
        day: formatDate(sale.date).split(" ").slice(0, 2).join(" "),
        sales: sale.totalSales,
        cash: sale.cashSales,
        upi: calculateOnlineSales(sale.upiSales, sale.cardSales, sale.otherSales),
      });
    }

    const totalSales = calculateDailySalesTotal(totalCash, totalUpi, totalCard, totalOther);
    const totalOnline = calculateOnlineSales(totalUpi, totalCard, totalOther);
    const recordedDays = salesList.length;
    const averageDailySales = recordedDays > 0 ? Math.round(totalSales / recordedDays) : 0;
    const upiDigitalPercentage =
      totalSales > 0 ? Math.round((totalOnline / totalSales) * 1000) / 10 : 0;

    const paymentSplit: SplitItem[] = [
      {
        name: "Cash",
        value: totalCash,
        percentage: totalSales > 0 ? Math.round((totalCash / totalSales) * 100) : 0,
        color: "#10B981",
      },
      {
        name: "UPI QR",
        value: totalUpi,
        percentage: totalSales > 0 ? Math.round((totalUpi / totalSales) * 100) : 0,
        color: "#3B82F6",
      },
      {
        name: "Card POS",
        value: totalCard,
        percentage: totalSales > 0 ? Math.round((totalCard / totalSales) * 100) : 0,
        color: "#8B5CF6",
      },
      {
        name: "Other",
        value: totalOther,
        percentage: totalSales > 0 ? Math.round((totalOther / totalSales) * 100) : 0,
        color: "#64748B",
      },
    ];

    // 3. Aggregate Purchases
    const rawPurchases = purchasesRes.data || [];
    let totalPurchases = 0;
    let totalPurchasesPaid = 0;

    for (const p of rawPurchases) {
      const amt = Number(p.total_amount || 0);
      totalPurchases += amt;
      const paidForBill = (p.supplier_payments || []).reduce(
        (sum: number, sp: { amount?: number }) => sum + Number(sp.amount || 0),
        0
      );
      totalPurchasesPaid += paidForBill;
    }

    const totalPurchasesPending = Math.max(0, totalPurchases - totalPurchasesPaid);
    const purchaseBillsCount = rawPurchases.length;

    // 4. Aggregate Expenses
    const rawExpenses = expensesRes.data || [];
    let totalExpenses = 0;
    const categoryMap: Record<string, number> = {};

    for (const exp of rawExpenses) {
      const amt = Number(exp.amount || 0);
      totalExpenses += amt;
      const catName = (exp.categories as { name?: string } | null)?.name || "Other";
      categoryMap[catName] = (categoryMap[catName] || 0) + amt;
    }

    const expenseCategories: ExpenseCategoryDistribution[] = Object.entries(categoryMap)
      .map(([name, amount]) => ({
        category: name,
        amount: Math.round(amount),
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
        color: CATEGORY_COLORS[name] || "#64748B",
      }))
      .sort((a, b) => b.amount - a.amount);

    // 5. Aggregate Customer Credit & Repayments (Phase 8)
    const totalCreditIssued = (creditsIssuedRes.data || []).reduce(
      (sum, row) => sum + Number(row.original_amount || 0),
      0
    );

    const rawCreditPayments = creditPaymentsRes.data || [];
    let totalCreditCollected = 0;
    const repaymentMethodTotals: Record<string, number> = {
      Cash: 0,
      UPI: 0,
      Bank: 0,
      "Credit Card": 0,
      "Debit Card": 0,
      Other: 0,
    };

    for (const cp of rawCreditPayments) {
      const amt = Number(cp.amount || 0);
      totalCreditCollected += amt;
      const m = cp.payment_method || "Cash";
      repaymentMethodTotals[m] = (repaymentMethodTotals[m] || 0) + amt;
    }

    const repaymentColors: Record<string, string> = {
      Cash: "#10B981",
      UPI: "#3B82F6",
      Bank: "#8B5CF6",
      "Credit Card": "#F59E0B",
      "Debit Card": "#EC4899",
      Other: "#64748B",
    };

    const collectionPaymentMethods: SplitItem[] = Object.entries(repaymentMethodTotals)
      .filter(([_, val]) => val > 0)
      .map(([name, val]) => ({
        name,
        value: Math.round(val),
        percentage:
          totalCreditCollected > 0
            ? Math.round((val / totalCreditCollected) * 100)
            : 0,
        color: repaymentColors[name] || "#64748B",
      }))
      .sort((a, b) => b.value - a.value);

    // Monthly Credit Issued vs Collected Trend (6 Months)
    const tCreds = trendCreditsRes.data || [];
    const tPays = trendCreditPaymentsRes.data || [];

    const creditTrend = recent6.map((m) => {
      let issued = 0;
      let collected = 0;

      for (const c of tCreds) {
        if (c.credit_date >= m.startDate && c.credit_date <= m.endDate) {
          issued += Number(c.original_amount || 0);
        }
      }

      for (const p of tPays) {
        if (p.payment_date >= m.startDate && p.payment_date <= m.endDate) {
          collected += Number(p.amount || 0);
        }
      }

      return {
        month: m.label,
        issued: Math.round(issued),
        collected: Math.round(collected),
      };
    });

    // 6. Aggregate Inventory & Stock (Phase 7)
    const rawProducts = productsRes.data || [];
    let totalInventoryValue = 0;
    let lowStockProductsCount = 0;
    let outOfStockProductsCount = 0;
    const catMap: Record<string, { count: number; units: number; val: number }> = {};

    for (const prod of rawProducts) {
      const stock = Number(prod.current_stock || 0);
      const buyPrice = Number(prod.purchase_price || 0);
      const threshold = prod.low_stock_threshold !== null ? Number(prod.low_stock_threshold) : 5;
      const val = stock * buyPrice;

      totalInventoryValue += val;

      if (stock <= 0) {
        outOfStockProductsCount += 1;
      } else if (stock <= threshold) {
        lowStockProductsCount += 1;
      }

      const cName = prod.category?.trim() || "Other";
      if (!catMap[cName]) {
        catMap[cName] = { count: 0, units: 0, val: 0 };
      }
      catMap[cName].count += 1;
      catMap[cName].units += stock;
      catMap[cName].val += val;
    }

    const catColors = [
      "#F59E0B",
      "#10B981",
      "#3B82F6",
      "#8B5CF6",
      "#EC4899",
      "#06B6D4",
      "#EAB308",
      "#6366F1",
      "#14B8A6",
      "#64748B",
    ];

    const inventoryCategories: CategoryInventoryValue[] = Object.entries(catMap)
      .map(([category, stats], idx) => ({
        category,
        productCount: stats.count,
        totalStockUnits: Math.round(stats.units * 1000) / 1000,
        inventoryValue: Math.round(stats.val * 100) / 100,
        percentage:
          totalInventoryValue > 0
            ? Math.round((stats.val / totalInventoryValue) * 1000) / 10
            : 0,
        color: catColors[idx % catColors.length],
      }))
      .sort((a, b) => b.inventoryValue - a.inventoryValue);

    // 7. Aggregate Stock Movement Summary for period
    const rawMovements = movementsRes.data || [];
    let addedCount = 0;
    let addedVal = 0;
    let removedCount = 0;
    let removedVal = 0;

    for (const m of rawMovements) {
      const qty = Number(m.quantity || 0);
      const cost = Number(m.unit_cost || 0);
      const lineCost = qty * cost;
      const isStockIn = ["opening_stock", "purchase", "adjustment_in", "return_in"].includes(m.movement_type);

      if (isStockIn) {
        addedCount += 1;
        addedVal += lineCost;
      } else {
        removedCount += 1;
        removedVal += lineCost;
      }
    }

    const stockMovementSummary: StockMovementSummary = {
      stockAddedCount: addedCount,
      stockAddedValue: Math.round(addedVal * 100) / 100,
      stockRemovedCount: removedCount,
      stockRemovedValue: Math.round(removedVal * 100) / 100,
      netMovementValue: Math.round((addedVal - removedVal) * 100) / 100,
      movementsCount: rawMovements.length,
    };

    // 8. Aggregate Supplier Outstanding Dues
    const rawSuppliers = suppliersRes.data || [];
    let totalSupplierDues = 0;
    const supplierOutstandings: SupplierOutstandingItem[] = [];

    for (const sup of rawSuppliers) {
      const sPurchases = (sup.purchases || []).reduce(
        (sum: number, p: { total_amount?: number }) => sum + Number(p.total_amount || 0),
        0
      );
      const sPaid = (sup.supplier_payments || []).reduce(
        (sum: number, sp: { amount?: number }) => sum + Number(sp.amount || 0),
        0
      );
      const pending = Math.max(0, sPurchases - sPaid);
      totalSupplierDues += pending;

      if (pending > 0 || sPurchases > 0) {
        supplierOutstandings.push({
          id: sup.id,
          name: sup.name,
          phone: sup.phone || "",
          totalPurchases: sPurchases,
          totalPaid: sPaid,
          pendingAmount: pending,
        });
      }
    }

    // Sort by largest pending dues
    supplierOutstandings.sort((a, b) => b.pendingAmount - a.pendingAmount);

    // 9. Monthly Revenue vs Purchases vs Expenses Trend (6 Months Bar Chart)
    const tSales = trendSalesRes.data || [];
    const tPurchases = trendPurchasesRes.data || [];
    const tExpenses = trendExpensesRes.data || [];

    const monthlyRevenueTrend: ShopMonthlyBarData[] = recent6.map((m) => {
      let revenue = 0;
      let purchases = 0;
      let expenses = 0;

      for (const s of tSales) {
        if (s.sale_date >= m.startDate && s.sale_date <= m.endDate) {
          revenue +=
            Number(s.cash_amount || 0) +
            Number(s.upi_amount || 0) +
            Number(s.card_amount || 0) +
            Number(s.other_amount || 0);
        }
      }

      for (const p of tPurchases) {
        if (p.purchase_date >= m.startDate && p.purchase_date <= m.endDate) {
          purchases += Number(p.total_amount || 0);
        }
      }

      for (const exp of tExpenses) {
        if (exp.transaction_date >= m.startDate && exp.transaction_date <= m.endDate) {
          expenses += Number(exp.amount || 0);
        }
      }

      return {
        month: m.label,
        revenue: Math.round(revenue),
        purchases: Math.round(purchases),
        expenses: Math.round(expenses),
      };
    });

    const hasData =
      totalSales > 0 ||
      totalPurchases > 0 ||
      totalExpenses > 0 ||
      totalCreditIssued > 0 ||
      totalCreditCollected > 0 ||
      supplierOutstandings.length > 0 ||
      rawProducts.length > 0;

    return {
      totalSales,
      totalCash,
      totalUpi,
      totalCard,
      totalOther,
      totalOnline,
      upiDigitalPercentage,
      averageDailySales,
      recordedDays,
      bestSalesDay,
      salesTrend,
      paymentSplit,
      totalPurchases,
      totalPurchasesPaid,
      totalPurchasesPending,
      purchaseBillsCount,
      totalExpenses,
      expensesCount: rawExpenses.length,
      expenseCategories,
      totalCreditIssued: Math.round(totalCreditIssued * 100) / 100,
      totalCreditCollected: Math.round(totalCreditCollected * 100) / 100,
      currentOutstandingCredit: customerSummaryRes.totalOutstanding,
      currentOverdueCredit: customerSummaryRes.totalOverdue,
      creditTrend,
      collectionPaymentMethods,
      customerOutstandingList: customerOutstandingListRes,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      totalProductsCount: rawProducts.length,
      lowStockProductsCount,
      outOfStockProductsCount,
      inventoryCategories,
      stockMovementSummary,
      supplierOutstandings,
      totalSupplierDues,
      monthlyRevenueTrend,
      hasData,
    };
  } catch (err) {
    console.error("Error fetching shop reports data:", err);
    return {
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
    };
  }
}
