import { createClient } from "@/lib/supabase/client";
import { HomeTransaction, ExpenseCategoryDistribution } from "@/types/home";
import { MonthlyBarData } from "@/components/charts/IncomeExpenseBarChart";
import { SpendingPoint } from "@/components/charts/MonthlySpendingTrendChart";
import {
  getCurrentMonthDateRange,
  getPreviousMonthDateRange,
  getRecentMonths,
} from "@/lib/date";
import { mapDbTransactionToUi } from "./transactions";
import { getDebtSummary } from "./debts";
import { getBudgetSummary } from "./budgets";

export interface HomeDashboardData {
  // Stat cards
  incomeThisMonth: number;
  incomePrevMonth: number;
  incomeGrowthPct: number;
  incomeTrendPositive: boolean;

  expensesThisMonth: number;
  expensesPrevMonth: number;
  expensesGrowthPct: number;
  expensesTrendPositive: boolean; // For expenses, a decrease is positive

  monthlySavings: number;

  moneyToPay: number; // Real Phase 4 Borrow
  moneyToReceive: number; // Real Phase 4 Lend
  overdueDebtAmount: number;
  overdueDebtCount: number;
  activeBorrowingsCount: number;
  activeLendingsCount: number;

  // Monthly Budget overview
  budgetTotal: number;
  budgetSpent: number;
  budgetRemaining: number;
  budgetPercentage: number;
  budgetSafeCount: number;
  budgetNearLimitCount: number;
  budgetExceededCount: number;

  // Charts
  monthlyComparisons: MonthlyBarData[];
  expenseCategories: ExpenseCategoryDistribution[];
  spendingTrend: SpendingPoint[];

  // Recent transactions table
  recentTransactions: HomeTransaction[];

  // Zero state flag
  hasAnyTransactions: boolean;
  totalTransactionsCount: number;
}

const CATEGORY_COLORS = [
  "#10B981", // emerald
  "#6366F1", // indigo
  "#EC4899", // pink
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#EF4444", // red
  "#06B6D4", // cyan
  "#64748B", // slate
  "#14B8A6", // teal
  "#F97316", // orange
  "#3B82F6", // blue
  "#84CC16", // lime
];

function calculateGrowth(current: number, previous: number): { pct: number; isPositive: boolean } {
  if (previous === 0) {
    if (current === 0) return { pct: 0, isPositive: true };
    return { pct: 100, isPositive: true };
  }
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  return {
    pct: Math.abs(pct),
    isPositive: pct >= 0,
  };
}

/**
 * Single, highly optimized query fetching all dashboard statistics, charts, debts, budgets, and recent records.
 */
export async function getHomeDashboardData(workspaceId: string): Promise<HomeDashboardData> {
  const supabase = createClient();
  const now = new Date();

  const currentMonthRange = getCurrentMonthDateRange(now);
  const prevMonthRange = getPreviousMonthDateRange(now);
  const sixMonths = getRecentMonths(6, now);
  const windowStartDate = sixMonths[0]?.startDate || currentMonthRange.startDate;
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  try {
    // 1. Fetch transactions within the 6-month window + total count + debts summary + budgets summary
    const [transactionsRes, totalCountRes, debtSummary, budgetSummary] = await Promise.all([
      supabase
        .from("transactions")
        .select("*, categories(id, name, icon)")
        .eq("workspace_id", workspaceId)
        .gte("transaction_date", windowStartDate)
        .lte("transaction_date", currentMonthRange.endDate)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      getDebtSummary(workspaceId),
      getBudgetSummary(workspaceId, currentMonthKey),
    ]);

    const totalCount = totalCountRes.count || 0;
    const rawRows = transactionsRes.data || [];
    const allWindowTxs: HomeTransaction[] = rawRows.map((r: any) => mapDbTransactionToUi(r));

    // 2. Current Month calculations
    let incomeThisMonth = 0;
    let expensesThisMonth = 0;
    const currentMonthExpensesByCategory: Record<string, number> = {};
    const dailySpendingMap: Record<string, number> = {};

    // 3. Previous Month calculations
    let incomePrevMonth = 0;
    let expensesPrevMonth = 0;

    // 4. Monthly aggregation map for 6-month chart
    const monthStatsMap: Record<string, { income: number; expenses: number }> = {};
    sixMonths.forEach((m) => {
      monthStatsMap[m.key] = { income: 0, expenses: 0 };
    });

    for (const tx of allWindowTxs) {
      const txDate = tx.date;
      const isIncome = tx.type === "Income";
      const amount = tx.amount;

      // Check month key "YYYY-MM"
      const monthKey = txDate.slice(0, 7);
      if (monthStatsMap[monthKey]) {
        if (isIncome) {
          monthStatsMap[monthKey].income += amount;
        } else {
          monthStatsMap[monthKey].expenses += amount;
        }
      }

      // Current month aggregates
      if (txDate >= currentMonthRange.startDate && txDate <= currentMonthRange.endDate) {
        if (isIncome) {
          incomeThisMonth += amount;
        } else {
          expensesThisMonth += amount;

          // Group by category
          const cat = tx.category || "Other";
          currentMonthExpensesByCategory[cat] = (currentMonthExpensesByCategory[cat] || 0) + amount;

          // Daily spending point
          const dayLabel = txDate.slice(8, 10); // "01", "02", etc.
          dailySpendingMap[dayLabel] = (dailySpendingMap[dayLabel] || 0) + amount;
        }
      }

      // Previous month aggregates
      if (txDate >= prevMonthRange.startDate && txDate <= prevMonthRange.endDate) {
        if (isIncome) {
          incomePrevMonth += amount;
        } else {
          expensesPrevMonth += amount;
        }
      }
    }

    // Monthly Savings
    const monthlySavings = incomeThisMonth - expensesThisMonth;

    // Growth trends
    const incomeGrowth = calculateGrowth(incomeThisMonth, incomePrevMonth);
    const expensesGrowth = calculateGrowth(expensesThisMonth, expensesPrevMonth);

    // 5. Build 6-Month Bar Chart Data
    const monthlyComparisons: MonthlyBarData[] = sixMonths.map((m) => {
      const stats = monthStatsMap[m.key] || { income: 0, expenses: 0 };
      return {
        month: m.label,
        income: Math.round(stats.income),
        expenses: Math.round(stats.expenses),
      };
    });

    // 6. Build Expense Category Donut Data
    const expenseCategories: ExpenseCategoryDistribution[] = Object.entries(
      currentMonthExpensesByCategory
    )
      .map(([category, amount], idx) => {
        const percentage =
          expensesThisMonth > 0 ? Math.round((amount / expensesThisMonth) * 1000) / 10 : 0;
        return {
          category: category as any,
          amount: Math.round(amount),
          percentage,
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // 7. Build Spending Trend Line Data
    const currentMonthNum = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
    const daysElapsed = Math.min(now.getDate(), daysInMonth);

    const spendingTrend: SpendingPoint[] = [];
    for (let day = 1; day <= daysElapsed; day++) {
      const dayKey = String(day).padStart(2, "0");
      const monthShort = sixMonths[sixMonths.length - 1]?.label || "Sep";
      spendingTrend.push({
        day: `${dayKey} ${monthShort}`,
        amount: Math.round(dailySpendingMap[dayKey] || 0),
      });
    }

    // 8. Recent 5 transactions
    const recentTransactions = allWindowTxs.slice(0, 5);

    return {
      incomeThisMonth,
      incomePrevMonth,
      incomeGrowthPct: incomeGrowth.pct,
      incomeTrendPositive: incomeGrowth.isPositive,

      expensesThisMonth,
      expensesPrevMonth,
      expensesGrowthPct: expensesGrowth.pct,
      expensesTrendPositive: !expensesGrowth.isPositive, // Decrease in expenses is positive!

      monthlySavings,

      moneyToPay: debtSummary.totalMoneyToPay,
      moneyToReceive: debtSummary.totalMoneyToReceive,
      overdueDebtAmount: debtSummary.overdueAmount,
      overdueDebtCount: 0,
      activeBorrowingsCount: debtSummary.activeBorrowingsCount,
      activeLendingsCount: debtSummary.activeLendingsCount,

      budgetTotal: budgetSummary.totalBudget,
      budgetSpent: budgetSummary.totalSpent,
      budgetRemaining: budgetSummary.totalRemaining,
      budgetPercentage: budgetSummary.overallPercentage,
      budgetSafeCount: budgetSummary.categoriesSafeCount,
      budgetNearLimitCount: budgetSummary.categoriesNearLimitCount,
      budgetExceededCount: budgetSummary.categoriesExceededCount,

      monthlyComparisons,
      expenseCategories,
      spendingTrend,
      recentTransactions,

      hasAnyTransactions: totalCount > 0,
      totalTransactionsCount: totalCount,
    };
  } catch (err) {
    console.error("Error generating home dashboard data:", err);
    return {
      incomeThisMonth: 0,
      incomePrevMonth: 0,
      incomeGrowthPct: 0,
      incomeTrendPositive: true,
      expensesThisMonth: 0,
      expensesPrevMonth: 0,
      expensesGrowthPct: 0,
      expensesTrendPositive: true,
      monthlySavings: 0,
      moneyToPay: 0,
      moneyToReceive: 0,
      overdueDebtAmount: 0,
      overdueDebtCount: 0,
      activeBorrowingsCount: 0,
      activeLendingsCount: 0,
      budgetTotal: 0,
      budgetSpent: 0,
      budgetRemaining: 0,
      budgetPercentage: 0,
      budgetSafeCount: 0,
      budgetNearLimitCount: 0,
      budgetExceededCount: 0,
      monthlyComparisons: [],
      expenseCategories: [],
      spendingTrend: [],
      recentTransactions: [],
      hasAnyTransactions: false,
      totalTransactionsCount: 0,
    };
  }
}
