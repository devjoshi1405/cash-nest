import { createClient } from "@/lib/supabase/client";
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
  calculateDailySalesTotal,
  calculateOnlineSales,
} from "./sales";

export interface ShopSalesReportData {
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
  monthlyRevenueTrend: ShopMonthlyBarData[];
  hasData: boolean;
}

/**
 * Fetch and aggregate Pan Shop sales analytics for the specified date filter.
 */
export async function getShopSalesReportData(
  workspaceId: string,
  dateRangePreset: string = "this-month",
  customRange?: { startDate?: string; endDate?: string }
): Promise<ShopSalesReportData> {
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

  try {
    let query = supabase
      .from("daily_sales")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (startDate) {
      query = query.gte("sale_date", startDate);
    }
    if (endDate) {
      query = query.lte("sale_date", endDate);
    }

    query = query.order("sale_date", { ascending: true });

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
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
        paymentSplit: [
          { name: "Cash", value: 0, percentage: 0, color: "#10B981" },
          { name: "UPI QR", value: 0, percentage: 0, color: "#3B82F6" },
          { name: "Card POS", value: 0, percentage: 0, color: "#8B5CF6" },
          { name: "Other", value: 0, percentage: 0, color: "#64748B" },
        ],
        monthlyRevenueTrend: [],
        hasData: false,
      };
    }

    const salesList = data.map(mapDbDailySaleToUi);

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
        day: formatDate(sale.date).split(" ").slice(0, 2).join(" "), // e.g. "14 Sep"
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

    // Payment split items
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

    // Monthly revenue trend (recent 6 months)
    const recent6 = getRecentMonths(6, now);
    const monthlyRevenueTrend: ShopMonthlyBarData[] = recent6.map((m) => {
      let revenue = 0;
      for (const sale of salesList) {
        if (sale.date >= m.startDate && sale.date <= m.endDate) {
          revenue += sale.totalSales;
        }
      }
      return {
        month: m.label,
        revenue: Math.round(revenue),
        purchases: 0,
        expenses: 0,
      };
    });

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
      monthlyRevenueTrend,
      hasData: true,
    };
  } catch (err) {
    console.error("Error fetching shop sales report data:", err);
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
      monthlyRevenueTrend: [],
      hasData: false,
    };
  }
}
