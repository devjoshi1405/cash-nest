import { createClient } from "@/lib/supabase/client";
import { DailySale } from "@/types/shop";
import { DailySalesTrendPoint } from "@/components/charts/DailySalesLineChart";
import { SplitItem } from "@/components/charts/CashVsOnlineDonutChart";
import { ShopMonthlyBarData } from "@/components/charts/MonthlyRevenueBarChart";
import {
  toISODateString,
  formatDate,
  getCurrentMonthDateRange,
  getPreviousMonthDateRange,
  getRecentMonths,
} from "@/lib/date";
import {
  mapDbDailySaleToUi,
  calculateOnlineSales,
} from "./sales";

export interface ShopRecentActivityItem {
  id: string;
  title: string;
  time: string;
  amount: number;
  method: string;
  type: "sales" | "purchase" | "payment" | "expense";
  date: string;
}

export interface ShopDashboardData {
  // Stat cards
  todaySales: number;
  todayCashSales: number;
  todayOnlineSales: number;
  todayExpenses: number;
  thisMonthPurchases: number;
  estimatedTodayProfit: number | null; // Kept null / placeholder
  pendingSupplierPayments: number;
  isTodayRecorded: boolean;
  todaySale: DailySale | null;

  // Inventory metrics (Phase 7)
  totalInventoryValue: number;
  totalProductsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    category: string;
    currentStock: number;
    unit: string;
    purchasePrice: number;
    lowStockThreshold: number;
    status: "In Stock" | "Low Stock" | "Out of Stock";
  }>;

  // Monthly stats
  thisMonthSales: number;
  prevMonthSales: number;
  monthGrowthPct: number;
  monthTrendPositive: boolean;
  averageDailySales: number;
  bestSalesDay: {
    date: string;
    amount: number;
    formattedDate: string;
  } | null;

  // Charts
  last7DaysSales: DailySalesTrendPoint[];
  paymentBreakdown: SplitItem[];
  monthlyRevenueTrend: ShopMonthlyBarData[];

  // Activity Feed
  recentActivity: ShopRecentActivityItem[];

  // Status flags
  hasAnySales: boolean;
  totalRecordedDays: number;
}

/**
 * Fetch all Shop Dashboard metrics, charts, and activity in an optimized pass.
 */
export async function getShopDashboardData(workspaceId: string): Promise<ShopDashboardData> {
  const supabase = createClient();
  const now = new Date();
  const todayStr = toISODateString(now);

  const currentMonthRange = getCurrentMonthDateRange(now);
  const prevMonthRange = getPreviousMonthDateRange(now);
  const recent6Months = getRecentMonths(6, now);
  const windowStartDate = recent6Months[0]?.startDate || prevMonthRange.startDate;

  try {
    // 1. Parallel fetch across Daily Sales, Purchases, Supplier Payments, Shop Expenses, and Products
    const [
      salesWindowRes,
      totalSalesCountRes,
      todayExpensesRes,
      purchasesWindowRes,
      allPurchasesSumRes,
      allPaymentsSumRes,
      expensesWindowRes,
      productsRes,
      recentActivitySalesRes,
      recentActivityPurchasesRes,
      recentActivityPaymentsRes,
      recentActivityExpensesRes,
    ] = await Promise.all([
      // Sales window
      supabase
        .from("daily_sales")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("sale_date", windowStartDate)
        .order("sale_date", { ascending: false }),

      // Total sales count
      supabase
        .from("daily_sales")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),

      // Today's expenses
      supabase
        .from("transactions")
        .select("amount")
        .eq("workspace_id", workspaceId)
        .eq("type", "expense")
        .eq("transaction_date", todayStr),

      // Purchases in 6 month window
      supabase
        .from("purchases")
        .select("id, total_amount, purchase_date, bill_number, supplier_id, suppliers(name)")
        .eq("workspace_id", workspaceId)
        .gte("purchase_date", windowStartDate)
        .order("purchase_date", { ascending: false }),

      // All purchases total for pending dues
      supabase
        .from("purchases")
        .select("total_amount")
        .eq("workspace_id", workspaceId),

      // All payments total for pending dues
      supabase
        .from("supplier_payments")
        .select("amount")
        .eq("workspace_id", workspaceId),

      // Expenses in 6 month window
      supabase
        .from("transactions")
        .select("id, amount, transaction_date, name, payment_method, categories(name)")
        .eq("workspace_id", workspaceId)
        .eq("type", "expense")
        .gte("transaction_date", windowStartDate)
        .order("transaction_date", { ascending: false }),

      // Active products in inventory
      supabase
        .from("products")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true),

      // Recent 5 sales
      supabase
        .from("daily_sales")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sale_date", { ascending: false })
        .limit(5),

      // Recent 5 purchases
      supabase
        .from("purchases")
        .select("id, total_amount, purchase_date, bill_number, suppliers(name)")
        .eq("workspace_id", workspaceId)
        .order("purchase_date", { ascending: false })
        .limit(5),

      // Recent 5 supplier payments
      supabase
        .from("supplier_payments")
        .select("id, amount, payment_date, payment_method, suppliers(name)")
        .eq("workspace_id", workspaceId)
        .order("payment_date", { ascending: false })
        .limit(5),

      // Recent 5 expenses
      supabase
        .from("transactions")
        .select("id, amount, transaction_date, name, payment_method")
        .eq("workspace_id", workspaceId)
        .eq("type", "expense")
        .order("transaction_date", { ascending: false })
        .limit(5),
    ]);

    // Inventory Calculations
    const rawProducts = productsRes.data || [];
    let totalInventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockProductsList: Array<{
      id: string;
      name: string;
      category: string;
      currentStock: number;
      unit: string;
      purchasePrice: number;
      lowStockThreshold: number;
      status: "In Stock" | "Low Stock" | "Out of Stock";
    }> = [];

    for (const p of rawProducts) {
      const stock = Number(p.current_stock || 0);
      const buyPrice = Number(p.purchase_price || 0);
      const threshold = p.low_stock_threshold !== null ? Number(p.low_stock_threshold) : 5;

      totalInventoryValue += stock * buyPrice;

      let status: "In Stock" | "Low Stock" | "Out of Stock" = "In Stock";
      if (stock <= 0) {
        status = "Out of Stock";
        outOfStockCount += 1;
        lowStockProductsList.push({
          id: p.id,
          name: p.name,
          category: p.category || "Other",
          currentStock: stock,
          unit: p.unit || "Piece",
          purchasePrice: buyPrice,
          lowStockThreshold: threshold,
          status,
        });
      } else if (stock <= threshold) {
        status = "Low Stock";
        lowStockCount += 1;
        lowStockProductsList.push({
          id: p.id,
          name: p.name,
          category: p.category || "Other",
          currentStock: stock,
          unit: p.unit || "Piece",
          purchasePrice: buyPrice,
          lowStockThreshold: threshold,
          status,
        });
      }
    }

    // Sort low stock products: out of stock first, then lowest stock
    lowStockProductsList.sort((a, b) => a.currentStock - b.currentStock);
    const lowStockProducts = lowStockProductsList.slice(0, 5);

    const rawSales = salesWindowRes.data || [];
    const totalRecordedDays = totalSalesCountRes.count || 0;
    const hasAnySales = totalRecordedDays > 0;
    const salesList: DailySale[] = rawSales.map(mapDbDailySaleToUi);

    // Map sales by date
    const salesByDate = new Map<string, DailySale>();
    salesList.forEach((s) => salesByDate.set(s.date, s));

    // 2. Today's Metrics
    const todaySale = salesByDate.get(todayStr) || null;
    const isTodayRecorded = !!todaySale;
    const todaySales = todaySale ? todaySale.totalSales : 0;
    const todayCashSales = todaySale ? todaySale.cashSales : 0;
    const todayOnlineSales = todaySale
      ? calculateOnlineSales(todaySale.upiSales, todaySale.cardSales, todaySale.otherSales)
      : 0;

    const todayExpenses = (todayExpensesRes.data || []).reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    );

    // 3. Current Month Purchases
    const rawPurchases = purchasesWindowRes.data || [];
    let thisMonthPurchases = 0;
    for (const p of rawPurchases) {
      if (p.purchase_date >= currentMonthRange.startDate && p.purchase_date <= currentMonthRange.endDate) {
        thisMonthPurchases += Number(p.total_amount || 0);
      }
    }

    // 4. Pending Supplier Dues (Lifetime Purchases - Lifetime Supplier Payments)
    const allPurchasesTotal = (allPurchasesSumRes.data || []).reduce(
      (sum, p) => sum + Number(p.total_amount || 0),
      0
    );
    const allPaymentsTotal = (allPaymentsSumRes.data || []).reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );
    const pendingSupplierPayments = Math.max(0, allPurchasesTotal - allPaymentsTotal);

    // 5. Monthly Sales trajectory
    let thisMonthSales = 0;
    let thisMonthCash = 0;
    let thisMonthUpi = 0;
    let thisMonthCard = 0;
    let thisMonthOther = 0;
    let recordedDaysInMonth = 0;
    let bestSalesDay: { date: string; amount: number; formattedDate: string } | null = null;
    let prevMonthSales = 0;

    for (const sale of salesList) {
      if (sale.date >= currentMonthRange.startDate && sale.date <= currentMonthRange.endDate) {
        thisMonthSales += sale.totalSales;
        thisMonthCash += sale.cashSales;
        thisMonthUpi += sale.upiSales;
        thisMonthCard += sale.cardSales;
        thisMonthOther += sale.otherSales;
        recordedDaysInMonth += 1;

        if (!bestSalesDay || sale.totalSales > bestSalesDay.amount) {
          bestSalesDay = {
            date: sale.date,
            amount: sale.totalSales,
            formattedDate: formatDate(sale.date),
          };
        }
      } else if (sale.date >= prevMonthRange.startDate && sale.date <= prevMonthRange.endDate) {
        prevMonthSales += sale.totalSales;
      }
    }

    thisMonthSales = Math.round(thisMonthSales * 100) / 100;
    prevMonthSales = Math.round(prevMonthSales * 100) / 100;

    let monthGrowthPct = 0;
    let monthTrendPositive = true;
    if (prevMonthSales > 0) {
      const pct = Math.round(((thisMonthSales - prevMonthSales) / prevMonthSales) * 1000) / 10;
      monthGrowthPct = Math.abs(pct);
      monthTrendPositive = pct >= 0;
    } else if (thisMonthSales > 0) {
      monthGrowthPct = 100;
      monthTrendPositive = true;
    }

    const averageDailySales =
      recordedDaysInMonth > 0 ? Math.round(thisMonthSales / recordedDaysInMonth) : 0;

    // 6. Last 7 Days Sales Trend
    const last7DaysSales: DailySalesTrendPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = toISODateString(d);
      const dayLabel = formatDate(dateStr).split(" ").slice(0, 2).join(" ");

      const existing = salesByDate.get(dateStr);
      if (existing) {
        last7DaysSales.push({
          day: dayLabel,
          sales: existing.totalSales,
          cash: existing.cashSales,
          upi: calculateOnlineSales(existing.upiSales, existing.cardSales, existing.otherSales),
        });
      } else {
        last7DaysSales.push({
          day: dayLabel,
          sales: 0,
          cash: 0,
          upi: 0,
        });
      }
    }

    // 7. Payment Channels Donut Breakdown
    const donutCash = recordedDaysInMonth > 0 ? thisMonthCash : salesList.reduce((acc, s) => acc + s.cashSales, 0);
    const donutUpi = recordedDaysInMonth > 0 ? thisMonthUpi : salesList.reduce((acc, s) => acc + s.upiSales, 0);
    const donutCard = recordedDaysInMonth > 0 ? thisMonthCard : salesList.reduce((acc, s) => acc + s.cardSales, 0);
    const donutOther = recordedDaysInMonth > 0 ? thisMonthOther : salesList.reduce((acc, s) => acc + s.otherSales, 0);
    const donutTotal = donutCash + donutUpi + donutCard + donutOther;

    const paymentBreakdown: SplitItem[] = [
      {
        name: "Cash",
        value: donutCash,
        percentage: donutTotal > 0 ? Math.round((donutCash / donutTotal) * 100) : 0,
        color: "#10B981",
      },
      {
        name: "UPI QR",
        value: donutUpi,
        percentage: donutTotal > 0 ? Math.round((donutUpi / donutTotal) * 100) : 0,
        color: "#3B82F6",
      },
      {
        name: "Card POS",
        value: donutCard,
        percentage: donutTotal > 0 ? Math.round((donutCard / donutTotal) * 100) : 0,
        color: "#8B5CF6",
      },
      {
        name: "Other",
        value: donutOther,
        percentage: donutTotal > 0 ? Math.round((donutOther / donutTotal) * 100) : 0,
        color: "#64748B",
      },
    ];

    // 8. Monthly Revenue vs Purchases vs Expenses Trend (6 Months Bar Chart)
    const rawExpenses = expensesWindowRes.data || [];
    const monthlyRevenueTrend: ShopMonthlyBarData[] = recent6Months.map((m) => {
      let revenue = 0;
      let purchases = 0;
      let expenses = 0;

      for (const sale of salesList) {
        if (sale.date >= m.startDate && sale.date <= m.endDate) {
          revenue += sale.totalSales;
        }
      }

      for (const p of rawPurchases) {
        if (p.purchase_date >= m.startDate && p.purchase_date <= m.endDate) {
          purchases += Number(p.total_amount || 0);
        }
      }

      for (const exp of rawExpenses) {
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

    // 9. Mixed Activity Feed: Daily Sales, Purchases, Payments, Expenses
    const combinedActivity: ShopRecentActivityItem[] = [];

    // Sales
    (recentActivitySalesRes.data || []).forEach((sale: any) => {
      const saleUi = mapDbDailySaleToUi(sale);
      const topMethod =
        saleUi.cashSales >= saleUi.upiSales
          ? `Cash (₹${saleUi.cashSales.toLocaleString("en-IN")})`
          : `UPI (₹${saleUi.upiSales.toLocaleString("en-IN")})`;

      combinedActivity.push({
        id: `sale-${sale.id}`,
        title: `Daily Sales Recorded`,
        time: formatDate(sale.sale_date),
        amount: saleUi.totalSales,
        method: topMethod,
        type: "sales",
        date: sale.sale_date,
      });
    });

    // Purchases
    (recentActivityPurchasesRes.data || []).forEach((p: any) => {
      const supplierName = (p.suppliers as any)?.name || "Wholesale Distributor";
      combinedActivity.push({
        id: `pur-${p.id}`,
        title: `Purchase from ${supplierName}`,
        time: formatDate(p.purchase_date),
        amount: Number(p.total_amount || 0),
        method: p.bill_number ? `Bill #${p.bill_number}` : "Invoice",
        type: "purchase",
        date: p.purchase_date,
      });
    });

    // Supplier Payments
    (recentActivityPaymentsRes.data || []).forEach((sp: any) => {
      const supplierName = (sp.suppliers as any)?.name || "Supplier";
      combinedActivity.push({
        id: `spay-${sp.id}`,
        title: `Paid ${supplierName}`,
        time: formatDate(sp.payment_date),
        amount: Number(sp.amount || 0),
        method: sp.payment_method || "UPI",
        type: "payment",
        date: sp.payment_date,
      });
    });

    // Shop Expenses
    (recentActivityExpensesRes.data || []).forEach((exp: any) => {
      combinedActivity.push({
        id: `exp-${exp.id}`,
        title: exp.name || "Shop Operating Expense",
        time: formatDate(exp.transaction_date),
        amount: Number(exp.amount || 0),
        method: exp.payment_method || "UPI",
        type: "expense",
        date: exp.transaction_date,
      });
    });

    // Sort combined activity newest date first
    combinedActivity.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const recentActivity = combinedActivity.slice(0, 8);

    return {
      todaySales,
      todayCashSales,
      todayOnlineSales,
      todayExpenses,
      thisMonthPurchases,
      estimatedTodayProfit: null,
      pendingSupplierPayments,
      isTodayRecorded,
      todaySale,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      totalProductsCount: rawProducts.length,
      lowStockCount,
      outOfStockCount,
      lowStockProducts,
      thisMonthSales,
      prevMonthSales,
      monthGrowthPct,
      monthTrendPositive,
      averageDailySales,
      bestSalesDay,
      last7DaysSales,
      paymentBreakdown,
      monthlyRevenueTrend,
      recentActivity,
      hasAnySales,
      totalRecordedDays,
    };
  } catch (err) {
    console.error("Error in getShopDashboardData:", err);
    return {
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
    };
  }
}
