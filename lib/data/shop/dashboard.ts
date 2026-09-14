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
  todayExpenses: number; // Placeholder for Phase 6
  estimatedTodayProfit: number | null; // Placeholder for Phase 8
  pendingSupplierPayments: number; // Placeholder for Phase 7
  isTodayRecorded: boolean;
  todaySale: DailySale | null;

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
 * Fetch all Shop Dashboard metrics, charts, and activity in a single optimized pass.
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
    // 1. Fetch all daily sales within the 6-month window + total count
    const [salesWindowRes, totalCountRes] = await Promise.all([
      supabase
        .from("daily_sales")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("sale_date", windowStartDate)
        .order("sale_date", { ascending: false }),
      supabase
        .from("daily_sales")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
    ]);

    const rawSales = salesWindowRes.data || [];
    const totalRecordedDays = totalCountRes.count || 0;
    const hasAnySales = totalRecordedDays > 0;

    const salesList: DailySale[] = rawSales.map(mapDbDailySaleToUi);

    // Map by date for instant lookup
    const salesByDate = new Map<string, DailySale>();
    salesList.forEach((s) => salesByDate.set(s.date, s));

    // 2. Today's metrics
    const todaySale = salesByDate.get(todayStr) || null;
    const isTodayRecorded = !!todaySale;
    const todaySales = todaySale ? todaySale.totalSales : 0;
    const todayCashSales = todaySale ? todaySale.cashSales : 0;
    const todayOnlineSales = todaySale
      ? calculateOnlineSales(todaySale.upiSales, todaySale.cardSales, todaySale.otherSales)
      : 0;

    // 3. Current Month & Previous Month calculations
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

    // Growth percentage calculation
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

    // Average daily sales (total in month divided by days recorded with sales)
    const averageDailySales =
      recordedDaysInMonth > 0 ? Math.round(thisMonthSales / recordedDaysInMonth) : 0;

    // 4. Last 7 Days continuous timeline (oldest to newest)
    const last7DaysSales: DailySalesTrendPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = toISODateString(d);
      const dayLabel = formatDate(dateStr).split(" ").slice(0, 2).join(" "); // e.g. "14 Sep"

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

    // 5. Payment Channel Breakdown (Donut)
    // If current month has data, use current month. Otherwise fallback to overall recent sales.
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
        color: "#10B981", // Emerald
      },
      {
        name: "UPI QR",
        value: donutUpi,
        percentage: donutTotal > 0 ? Math.round((donutUpi / donutTotal) * 100) : 0,
        color: "#3B82F6", // Blue
      },
      {
        name: "Card POS",
        value: donutCard,
        percentage: donutTotal > 0 ? Math.round((donutCard / donutTotal) * 100) : 0,
        color: "#8B5CF6", // Purple
      },
      {
        name: "Other",
        value: donutOther,
        percentage: donutTotal > 0 ? Math.round((donutOther / donutTotal) * 100) : 0,
        color: "#64748B", // Slate
      },
    ];

    // 6. Monthly Revenue Trend (6 Months Bar Chart)
    const monthlyRevenueTrend: ShopMonthlyBarData[] = recent6Months.map((m) => {
      let revenue = 0;
      for (const sale of salesList) {
        if (sale.date >= m.startDate && sale.date <= m.endDate) {
          revenue += sale.totalSales;
        }
      }
      return {
        month: m.label,
        revenue: Math.round(revenue),
        purchases: 0, // In Phase 7, this will be connected
        expenses: 0,  // In Phase 6, this will be connected
      };
    });

    // 7. Recent Shop Activity feed derived from real sales records
    const recentActivity: ShopRecentActivityItem[] = salesList.slice(0, 6).map((sale) => {
      const topMethod =
        sale.cashSales >= sale.upiSales
          ? `Cash (₹${sale.cashSales.toLocaleString("en-IN")})`
          : `UPI (₹${sale.upiSales.toLocaleString("en-IN")})`;

      return {
        id: `act-${sale.id}`,
        title: `Daily Sales Recorded (${formatDate(sale.date)})`,
        time: formatDate(sale.date),
        amount: sale.totalSales,
        method: topMethod,
        type: "sales" as const,
        date: sale.date,
      };
    });

    return {
      todaySales,
      todayCashSales,
      todayOnlineSales,
      todayExpenses: 0,
      estimatedTodayProfit: null,
      pendingSupplierPayments: 0,
      isTodayRecorded,
      todaySale,
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
      estimatedTodayProfit: null,
      pendingSupplierPayments: 0,
      isTodayRecorded: false,
      todaySale: null,
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
