import { createClient } from "@/lib/supabase/client";
import { ExpenseCategoryDistribution, BudgetVsActualItem } from "@/types/home";
import { DateRangeFilter } from "@/types/common";
import { MonthlyBarData } from "@/components/charts/IncomeExpenseBarChart";
import { SpendingPoint } from "@/components/charts/MonthlySpendingTrendChart";
import { SplitItem } from "@/components/charts/CashVsOnlineDonutChart";
import { getDateRangeFromPreset, formatDate } from "@/lib/date";
import { mapDbTransactionToUi } from "./transactions";
import { getBudgetVsActual } from "./budgets";

export interface HomeReportsData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number; // e.g. 30.4%

  highestExpenseItem: {
    name: string;
    amount: number;
  } | null;

  averageDailyOutflow: number;

  primaryPaymentMode: {
    name: string;
    percentage: number;
  };

  monthlyComparisons: MonthlyBarData[];
  expenseCategories: ExpenseCategoryDistribution[];
  spendingTrend: SpendingPoint[];
  paymentMethods: SplitItem[];
  budgetVsActual: BudgetVsActualItem[];

  totalTransactions: number;
}

const CATEGORY_COLORS = [
  "#10B981",
  "#6366F1",
  "#EC4899",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#06B6D4",
  "#64748B",
  "#14B8A6",
  "#F97316",
  "#3B82F6",
  "#84CC16",
];

const METHOD_COLORS: Record<string, string> = {
  UPI: "#10B981",
  Cash: "#F59E0B",
  Bank: "#3B82F6",
  "Credit Card": "#8B5CF6",
  "Debit Card": "#06B6D4",
  Other: "#64748B",
};

/**
 * Fetch and aggregate complete Home Financial Reports analytics for a given date range.
 */
export async function getHomeReportsData(
  workspaceId: string,
  preset: DateRangeFilter = "this-month",
  customRange?: { from?: string; to?: string }
): Promise<HomeReportsData> {
  const supabase = createClient();
  const now = new Date();

  let startDate: string | undefined;
  let endDate: string | undefined;

  if (preset === "custom" && customRange?.from) {
    startDate = customRange.from;
    endDate = customRange.to || customRange.from;
  } else {
    const range = getDateRangeFromPreset(preset, now);
    startDate = range.startDate;
    endDate = range.endDate;
  }

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  try {
    let query = supabase
      .from("transactions")
      .select("*, categories(id, name, icon)")
      .eq("workspace_id", workspaceId);

    if (startDate) {
      query = query.gte("transaction_date", startDate);
    }
    if (endDate) {
      query = query.lte("transaction_date", endDate);
    }

    query = query
      .order("transaction_date", { ascending: true })
      .order("created_at", { ascending: true });

    const [txRes, budgetItems] = await Promise.all([
      query,
      getBudgetVsActual(workspaceId, currentMonthKey),
    ]);

    const { data: rawRows, error } = txRes;

    if (error) {
      console.error("Error fetching home reports data:", error.message);
      return getEmptyReportsData();
    }

    const transactions = (rawRows || []).map((r: any) => mapDbTransactionToUi(r));

    let totalIncome = 0;
    let totalExpenses = 0;
    let highestExpense: { name: string; amount: number } | null = null;

    const monthlyMap: Record<string, { income: number; expenses: number }> = {};
    const categoryMap: Record<string, number> = {};
    const methodMap: Record<string, number> = {};
    const dailySpendingMap: Record<string, number> = {};

    for (const tx of transactions) {
      const isIncome = tx.type === "Income";
      const amount = tx.amount;
      const monthKey = tx.date.slice(0, 7); // "YYYY-MM"

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { income: 0, expenses: 0 };
      }

      if (isIncome) {
        totalIncome += amount;
        monthlyMap[monthKey].income += amount;
      } else {
        totalExpenses += amount;
        monthlyMap[monthKey].expenses += amount;

        // Highest expense item
        if (!highestExpense || amount > highestExpense.amount) {
          highestExpense = { name: tx.name, amount };
        }

        // Category breakdown
        const cat = tx.category || "Other";
        categoryMap[cat] = (categoryMap[cat] || 0) + amount;

        // Method breakdown
        const method = tx.paymentMethod || "Other";
        methodMap[method] = (methodMap[method] || 0) + amount;

        // Daily spending
        dailySpendingMap[tx.date] = (dailySpendingMap[tx.date] || 0) + amount;
      }
    }

    const netSavings = totalIncome - totalExpenses;
    const savingsRate =
      totalIncome > 0 ? Math.round((netSavings / totalIncome) * 1000) / 10 : 0;

    // Calculate days in period
    let daysInPeriod = 30;
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      daysInPeriod = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }
    const averageDailyOutflow =
      daysInPeriod > 0 ? Math.round(totalExpenses / daysInPeriod) : 0;

    // Primary payment mode
    let primaryMethod = "None";
    let maxMethodAmount = 0;
    Object.entries(methodMap).forEach(([m, amt]) => {
      if (amt > maxMethodAmount) {
        maxMethodAmount = amt;
        primaryMethod = m;
      }
    });

    const primaryPercentage =
      totalExpenses > 0 ? Math.round((maxMethodAmount / totalExpenses) * 1000) / 10 : 0;

    // Monthly comparisons chart data
    const MONTH_SHORT = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const monthlyComparisons: MonthlyBarData[] = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mKey, stats]) => {
        const [, mStr] = mKey.split("-");
        const mIdx = parseInt(mStr, 10) - 1;
        return {
          month: MONTH_SHORT[mIdx] || mKey,
          income: Math.round(stats.income),
          expenses: Math.round(stats.expenses),
        };
      });

    // Expense Category Distribution
    const expenseCategories: ExpenseCategoryDistribution[] = Object.entries(categoryMap)
      .map(([cat, amt], idx) => {
        const percentage =
          totalExpenses > 0 ? Math.round((amt / totalExpenses) * 1000) / 10 : 0;
        return {
          category: cat as any,
          amount: Math.round(amt),
          percentage,
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Spending Trend
    const spendingTrend: SpendingPoint[] = Object.entries(dailySpendingMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, amt]) => ({
        day: formatDate(dateStr).slice(0, 6),
        amount: Math.round(amt),
      }));

    // Payment Methods Breakdown
    const paymentMethods: SplitItem[] = Object.entries(methodMap)
      .map(([m, amt]) => {
        const pct = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 1000) / 10 : 0;
        return {
          name: m,
          value: Math.round(amt),
          percentage: pct,
          color: METHOD_COLORS[m] || "#64748B",
        };
      })
      .sort((a, b) => b.value - a.value);

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      highestExpenseItem: highestExpense,
      averageDailyOutflow,
      primaryPaymentMode: {
        name: primaryMethod,
        percentage: primaryPercentage,
      },
      monthlyComparisons,
      expenseCategories,
      spendingTrend,
      paymentMethods,
      budgetVsActual: budgetItems,
      totalTransactions: transactions.length,
    };
  } catch (err) {
    console.error("Unexpected error in getHomeReportsData:", err);
    return getEmptyReportsData();
  }
}

function getEmptyReportsData(): HomeReportsData {
  return {
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    savingsRate: 0,
    highestExpenseItem: null,
    averageDailyOutflow: 0,
    primaryPaymentMode: { name: "None", percentage: 0 },
    monthlyComparisons: [],
    expenseCategories: [],
    spendingTrend: [],
    paymentMethods: [],
    budgetVsActual: [],
    totalTransactions: 0,
  };
}
