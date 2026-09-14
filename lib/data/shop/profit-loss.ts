import { createClient } from "@/lib/supabase/client";
import { ProfitLossSummary } from "@/types/shop";
import { ProfitTrendPoint } from "@/components/charts/ProfitTrendChart";
import {
  toISODateString,
  getCurrentMonthDateRange,
  getRecentMonths,
} from "@/lib/date";

export type ProfitLossPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface ShopProfitLossData {
  summary: ProfitLossSummary;
  grossMargin: number;
  netMargin: number;
  profitTrend: ProfitTrendPoint[];
  hasData: boolean;
  period: ProfitLossPeriod;
  dateRange: { startDate: string; endDate: string };
}

/**
 * Computes live Profit & Loss metrics for Pan Shop across Daily, Weekly, Monthly, and Yearly periods.
 */
export async function getShopProfitLossData(
  workspaceId: string,
  period: ProfitLossPeriod = "monthly"
): Promise<ShopProfitLossData> {
  const supabase = createClient();
  const now = new Date();
  const todayStr = toISODateString(now);

  // 1. Determine period date range
  let startDate: string;
  let endDate: string;

  switch (period) {
    case "daily": {
      startDate = todayStr;
      endDate = todayStr;
      break;
    }
    case "weekly": {
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
    case "yearly": {
      const year = now.getFullYear();
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
      break;
    }
    case "monthly":
    default: {
      const range = getCurrentMonthDateRange(now);
      startDate = range.startDate;
      endDate = range.endDate;
      break;
    }
  }

  const recent6 = getRecentMonths(6, now);
  const trendWindowStart = recent6[0]?.startDate || startDate;

  try {
    // 2. Fetch Sales, Purchases, Operating Expenses, Products, Movements, and 6-Month Trend Data in parallel
    const [
      salesRes,
      purchasesRes,
      expensesRes,
      movementsRes,
      productsRes,
      trendSalesRes,
      trendPurchasesRes,
      trendExpensesRes,
    ] = await Promise.all([
      // Sales in active period
      supabase
        .from("daily_sales")
        .select("cash_amount, upi_amount, card_amount, other_amount")
        .eq("workspace_id", workspaceId)
        .gte("sale_date", startDate)
        .lte("sale_date", endDate),

      // Purchases in active period
      supabase
        .from("purchases")
        .select("total_amount")
        .eq("workspace_id", workspaceId)
        .gte("purchase_date", startDate)
        .lte("purchase_date", endDate),

      // Operating Expenses in active period
      supabase
        .from("transactions")
        .select("amount")
        .eq("workspace_id", workspaceId)
        .eq("type", "expense")
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate),

      // Inventory stock movements in active period
      supabase
        .from("inventory_movements")
        .select("movement_type, quantity, unit_cost")
        .eq("workspace_id", workspaceId)
        .gte("movement_date", startDate)
        .lte("movement_date", endDate),

      // Active products to compute average cost margin ratio if needed
      supabase
        .from("products")
        .select("purchase_price, selling_price")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true),

      // 6-Month Trend Sales
      supabase
        .from("daily_sales")
        .select("sale_date, cash_amount, upi_amount, card_amount, other_amount")
        .eq("workspace_id", workspaceId)
        .gte("sale_date", trendWindowStart),

      // 6-Month Trend Purchases
      supabase
        .from("purchases")
        .select("purchase_date, total_amount")
        .eq("workspace_id", workspaceId)
        .gte("purchase_date", trendWindowStart),

      // 6-Month Trend Expenses
      supabase
        .from("transactions")
        .select("transaction_date, amount")
        .eq("workspace_id", workspaceId)
        .eq("type", "expense")
        .gte("transaction_date", trendWindowStart),
    ]);

    // 3. Compute Total Counter Revenue
    const salesRows = salesRes.data || [];
    let revenue = 0;
    for (const s of salesRows) {
      revenue +=
        Number(s.cash_amount || 0) +
        Number(s.upi_amount || 0) +
        Number(s.card_amount || 0) +
        Number(s.other_amount || 0);
    }
    revenue = Math.round(revenue);

    // 4. Compute Product Cost Ratio fallback
    const prods = productsRes.data || [];
    let avgCostRatio = 0.68; // standard retail pan shop wholesale cost ratio (~68%)
    if (prods.length > 0) {
      const validProds = prods.filter(
        (p) => Number(p.selling_price || 0) > 0 && Number(p.purchase_price || 0) > 0
      );
      if (validProds.length > 0) {
        const sumRatio = validProds.reduce(
          (acc, p) => acc + Number(p.purchase_price) / Number(p.selling_price),
          0
        );
        avgCostRatio = Math.min(0.95, Math.max(0.1, sumRatio / validProds.length));
      }
    }

    // 5. Compute Cost of Goods Sold (COGS)
    let cogs = 0;
    const rawMovements = (movementsRes.data || []).filter((m) =>
      ["sale", "adjustment_out", "damage"].includes(m.movement_type)
    );
    const movementCogs = rawMovements.reduce(
      (acc, m) => acc + Number(m.quantity || 0) * Number(m.unit_cost || 0),
      0
    );

    const purchaseCogs = (purchasesRes.data || []).reduce(
      (acc, p) => acc + Number(p.total_amount || 0),
      0
    );

    if (movementCogs > 0) {
      cogs = Math.round(movementCogs);
    } else if (purchaseCogs > 0) {
      cogs = Math.round(purchaseCogs);
    } else if (revenue > 0) {
      cogs = Math.round(revenue * avgCostRatio);
    }

    // 6. Compute Shop Operating Expenses
    const shopExpenses = Math.round(
      (expensesRes.data || []).reduce((acc, e) => acc + Number(e.amount || 0), 0)
    );

    // 7. Compute Profit & Margins
    const grossProfit = Math.round(revenue - cogs);
    const netProfit = Math.round(grossProfit - shopExpenses);
    const grossMargin = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;
    const netMargin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;

    // 8. Compute 6-Month Profitability Trajectory
    const tSales = trendSalesRes.data || [];
    const tPurchases = trendPurchasesRes.data || [];
    const tExpenses = trendExpensesRes.data || [];

    const profitTrend: ProfitTrendPoint[] = recent6.map((m) => {
      let mRev = 0;
      let mPurch = 0;
      let mExp = 0;

      for (const s of tSales) {
        if (s.sale_date >= m.startDate && s.sale_date <= m.endDate) {
          mRev +=
            Number(s.cash_amount || 0) +
            Number(s.upi_amount || 0) +
            Number(s.card_amount || 0) +
            Number(s.other_amount || 0);
        }
      }

      for (const p of tPurchases) {
        if (p.purchase_date >= m.startDate && p.purchase_date <= m.endDate) {
          mPurch += Number(p.total_amount || 0);
        }
      }

      for (const e of tExpenses) {
        if (e.transaction_date >= m.startDate && e.transaction_date <= m.endDate) {
          mExp += Number(e.amount || 0);
        }
      }

      const mCogs = mPurch > 0 ? mPurch : Math.round(mRev * avgCostRatio);
      const mGross = Math.round(mRev - mCogs);
      const mNet = Math.round(mGross - mExp);

      return {
        month: m.label,
        revenue: Math.round(mRev),
        grossProfit: mGross,
        netProfit: mNet,
      };
    });

    const summary: ProfitLossSummary = {
      period,
      revenue,
      cogs,
      grossProfit,
      shopExpenses,
      netProfit,
    };

    const hasData = revenue > 0 || cogs > 0 || shopExpenses > 0;

    return {
      summary,
      grossMargin,
      netMargin,
      profitTrend,
      hasData,
      period,
      dateRange: { startDate, endDate },
    };
  } catch (err) {
    console.error("Error calculating shop profit & loss data:", err);
    return {
      summary: {
        period,
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        shopExpenses: 0,
        netProfit: 0,
      },
      grossMargin: 0,
      netMargin: 0,
      profitTrend: [],
      hasData: false,
      period,
      dateRange: { startDate, endDate },
    };
  }
}
