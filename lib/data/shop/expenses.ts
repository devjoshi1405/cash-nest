import { createClient } from "@/lib/supabase/client";
import { ShopExpense, ShopExpenseCategory } from "@/types/shop";
import { PaymentMethod } from "@/types/common";
import { ExpenseCategoryDistribution } from "@/types/home";
import {
  toISODateString,
  getCurrentMonthDateRange,
  getPreviousMonthDateRange,
} from "@/lib/date";

export interface ExpenseFilterOptions {
  categoryId?: string;
  paymentMethod?: string;
  search?: string;
  datePreset?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopExpensesListResponse {
  expenses: ShopExpense[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    totalExpenses: number;
    count: number;
  };
}

export interface ShopExpenseSummaryData {
  totalExpensesThisMonth: number;
  prevMonthExpenses: number;
  monthGrowthPct: number;
  monthTrendPositive: boolean;
  dailyAverage: number;
  mostExpensiveCategory: string;
  categoryBreakdown: ExpenseCategoryDistribution[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Rent: "#8B5CF6", // Purple
  Electricity: "#F59E0B", // Amber
  Transport: "#3B82F6", // Blue
  Maintenance: "#10B981", // Emerald
  Employee: "#EC4899", // Pink
  Packaging: "#06B6D4", // Cyan
  Equipment: "#6366F1", // Indigo
  Internet: "#14B8A6", // Teal
  Cleaning: "#84CC16", // Lime
  "License / Fees": "#EAB308", // Yellow
  Miscellaneous: "#64748B", // Slate
  Other: "#94A3B8", // Slate light
};

/**
 * Fetch filtered & paginated shop operating expenses from the central transactions table.
 */
export async function getShopExpenses(
  workspaceId: string,
  options: ExpenseFilterOptions = {}
): Promise<ShopExpensesListResponse> {
  const supabase = createClient();
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.pageSize || 20);

  let startDate = options.startDate;
  let endDate = options.endDate;

  if (options.datePreset) {
    const now = new Date();
    if (options.datePreset === "this-month") {
      const r = getCurrentMonthDateRange(now);
      startDate = r.startDate;
      endDate = r.endDate;
    } else if (options.datePreset === "last-month") {
      const r = getPreviousMonthDateRange(now);
      startDate = r.startDate;
      endDate = r.endDate;
    } else if (options.datePreset === "today") {
      const todayStr = toISODateString(now);
      startDate = todayStr;
      endDate = todayStr;
    }
  }

  try {
    let query = supabase
      .from("transactions")
      .select("*, categories(id, name, icon)", { count: "exact" })
      .eq("workspace_id", workspaceId)
      .eq("type", "expense");

    if (options.categoryId && options.categoryId !== "all") {
      query = query.eq("category_id", options.categoryId);
    }

    if (options.paymentMethod && options.paymentMethod !== "all") {
      query = query.eq("payment_method", options.paymentMethod);
    }

    if (startDate) {
      query = query.gte("transaction_date", startDate);
    }
    if (endDate) {
      query = query.lte("transaction_date", endDate);
    }

    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      query = query.or(`name.ilike.%${term}%,notes.ilike.%${term}%`);
    }

    query = query.order("transaction_date", { ascending: false });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error("Error fetching shop expenses:", error.message);
      return {
        expenses: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        summary: { totalExpenses: 0, count: 0 },
      };
    }

    const expenses: ShopExpense[] = (data || []).map((row: any) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      date: row.transaction_date,
      title: row.name,
      category: (row.categories?.name || "Other") as ShopExpenseCategory,
      categoryId: row.category_id,
      categoryIcon: row.categories?.icon || "🏷️",
      amount: Number(row.amount || 0),
      paymentMethod: (row.payment_method || "UPI") as PaymentMethod,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Get total sum for the filter
    let sumQuery = supabase
      .from("transactions")
      .select("amount")
      .eq("workspace_id", workspaceId)
      .eq("type", "expense");

    if (options.categoryId && options.categoryId !== "all") {
      sumQuery = sumQuery.eq("category_id", options.categoryId);
    }
    if (options.paymentMethod && options.paymentMethod !== "all") {
      sumQuery = sumQuery.eq("payment_method", options.paymentMethod);
    }
    if (startDate) sumQuery = sumQuery.gte("transaction_date", startDate);
    if (endDate) sumQuery = sumQuery.lte("transaction_date", endDate);
    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      sumQuery = sumQuery.or(`name.ilike.%${term}%,notes.ilike.%${term}%`);
    }

    const { data: sumData } = await sumQuery;
    const totalExpenses = (sumData || []).reduce(
      (acc, curr) => acc + Number(curr.amount || 0),
      0
    );

    return {
      expenses,
      totalCount,
      page,
      pageSize,
      totalPages,
      summary: { totalExpenses, count: totalCount },
    };
  } catch (err) {
    console.error("Unexpected error in getShopExpenses:", err);
    return {
      expenses: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
      summary: { totalExpenses: 0, count: 0 },
    };
  }
}

export interface CreateShopExpensePayload {
  title: string;
  category: string;
  categoryId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  notes?: string;
}

/**
 * Create a new Shop Operating Expense in the central transactions table.
 */
export async function createShopExpense(
  workspaceId: string,
  payload: CreateShopExpensePayload
): Promise<{ success: boolean; expense?: ShopExpense; error?: string }> {
  const supabase = createClient();
  const trimmedTitle = payload.title.trim();
  const amount = Number(payload.amount);

  if (!trimmedTitle || trimmedTitle.length < 2) {
    return { success: false, error: "Expense title must be at least 2 characters long." };
  }

  if (!amount || amount <= 0) {
    return { success: false, error: "Expense amount must be greater than 0." };
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Authentication required." };
    }

    let categoryId = payload.categoryId;

    // Resolve categoryId by name if not provided
    if (!categoryId && payload.category) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("type", "expense")
        .ilike("name", payload.category.trim())
        .maybeSingle();

      if (cat) {
        categoryId = cat.id;
      }
    }

    const { data: newRow, error: insertError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        category_id: categoryId || null,
        type: "expense",
        name: trimmedTitle,
        amount,
        payment_method: payload.paymentMethod || "UPI",
        transaction_date: payload.date || toISODateString(),
        notes: payload.notes?.trim() || null,
      })
      .select("*, categories(id, name, icon)")
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    const expense: ShopExpense = {
      id: newRow.id,
      workspaceId: newRow.workspace_id,
      userId: newRow.user_id,
      date: newRow.transaction_date,
      title: newRow.name,
      category: (newRow.categories?.name || payload.category || "Other") as ShopExpenseCategory,
      categoryId: newRow.category_id,
      categoryIcon: newRow.categories?.icon || "🏷️",
      amount: Number(newRow.amount || 0),
      paymentMethod: (newRow.payment_method || "UPI") as PaymentMethod,
      notes: newRow.notes || undefined,
      createdAt: newRow.created_at,
      updatedAt: newRow.updated_at,
    };

    return { success: true, expense };
  } catch (err: any) {
    console.error("Unexpected error in createShopExpense:", err);
    return { success: false, error: err?.message || "Failed to save shop expense." };
  }
}

/**
 * Update an existing shop expense.
 */
export async function updateShopExpense(
  expenseId: string,
  workspaceId: string,
  payload: {
    title?: string;
    category?: string;
    categoryId?: string;
    amount?: number;
    paymentMethod?: PaymentMethod;
    date?: string;
    notes?: string;
  }
): Promise<{ success: boolean; expense?: ShopExpense; error?: string }> {
  const supabase = createClient();
  try {
    const updateObj: any = {};
    if (payload.title !== undefined) updateObj.name = payload.title.trim();
    if (payload.amount !== undefined) {
      const amt = Number(payload.amount);
      if (amt <= 0) return { success: false, error: "Amount must be greater than 0." };
      updateObj.amount = amt;
    }
    if (payload.paymentMethod) updateObj.payment_method = payload.paymentMethod;
    if (payload.date) updateObj.transaction_date = payload.date;
    if (payload.notes !== undefined) updateObj.notes = payload.notes.trim() || null;

    let categoryId = payload.categoryId;
    if (!categoryId && payload.category) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("type", "expense")
        .ilike("name", payload.category.trim())
        .maybeSingle();

      if (cat) categoryId = cat.id;
    }

    if (categoryId) updateObj.category_id = categoryId;

    const { data: updatedRow, error } = await supabase
      .from("transactions")
      .update(updateObj)
      .eq("id", expenseId)
      .eq("workspace_id", workspaceId)
      .select("*, categories(id, name, icon)")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const expense: ShopExpense = {
      id: updatedRow.id,
      workspaceId: updatedRow.workspace_id,
      userId: updatedRow.user_id,
      date: updatedRow.transaction_date,
      title: updatedRow.name,
      category: (updatedRow.categories?.name || "Other") as ShopExpenseCategory,
      categoryId: updatedRow.category_id,
      categoryIcon: updatedRow.categories?.icon || "🏷️",
      amount: Number(updatedRow.amount || 0),
      paymentMethod: (updatedRow.payment_method || "UPI") as PaymentMethod,
      notes: updatedRow.notes || undefined,
      createdAt: updatedRow.created_at,
      updatedAt: updatedRow.updated_at,
    };

    return { success: true, expense };
  } catch (err: any) {
    console.error("Error updating shop expense:", err);
    return { success: false, error: err?.message || "Failed to update shop expense." };
  }
}

/**
 * Delete a shop operating expense.
 */
export async function deleteShopExpense(
  expenseId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", expenseId)
      .eq("workspace_id", workspaceId)
      .eq("type", "expense");

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting shop expense:", err);
    return { success: false, error: err?.message || "Failed to delete shop expense." };
  }
}

/**
 * Calculate summary metrics & category breakdown for Shop Expenses page.
 */
export async function getShopExpenseSummary(
  workspaceId: string,
  datePreset: string = "this-month",
  customRange?: { startDate?: string; endDate?: string }
): Promise<ShopExpenseSummaryData> {
  const supabase = createClient();
  const now = new Date();
  const currentMonthRange = getCurrentMonthDateRange(now);
  const prevMonthRange = getPreviousMonthDateRange(now);

  try {
    // Fetch this month and previous month expenses
    const [thisMonthRes, prevMonthRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("amount, transaction_date, categories(name)")
        .eq("workspace_id", workspaceId)
        .eq("type", "expense")
        .gte("transaction_date", currentMonthRange.startDate)
        .lte("transaction_date", currentMonthRange.endDate),
      supabase
        .from("transactions")
        .select("amount")
        .eq("workspace_id", workspaceId)
        .eq("type", "expense")
        .gte("transaction_date", prevMonthRange.startDate)
        .lte("transaction_date", prevMonthRange.endDate),
    ]);

    const thisMonthRows = thisMonthRes.data || [];
    const prevMonthRows = prevMonthRes.data || [];

    const totalExpensesThisMonth = thisMonthRows.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0
    );
    const prevMonthExpenses = prevMonthRows.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0
    );

    // Calculate growth percentage vs prev month
    let monthGrowthPct = 0;
    let monthTrendPositive = false;
    if (prevMonthExpenses > 0) {
      const pct =
        Math.round(((totalExpensesThisMonth - prevMonthExpenses) / prevMonthExpenses) * 1000) / 10;
      monthGrowthPct = Math.abs(pct);
      monthTrendPositive = pct <= 0; // for expenses, lower is better (positive)
    } else if (totalExpensesThisMonth > 0) {
      monthGrowthPct = 100;
      monthTrendPositive = false;
    }

    // Daily average based on days passed in the month
    const currentDay = Math.max(1, now.getDate());
    const dailyAverage =
      totalExpensesThisMonth > 0 ? Math.round(totalExpensesThisMonth / currentDay) : 0;

    // Category aggregation
    const categoryTotals: Record<string, number> = {};
    for (const r of thisMonthRows) {
      const catName = (r.categories as any)?.name || "Other";
      categoryTotals[catName] = (categoryTotals[catName] || 0) + Number(r.amount || 0);
    }

    let mostExpensiveCategory = "None";
    let maxCatAmount = 0;

    const categoryBreakdown: ExpenseCategoryDistribution[] = Object.entries(categoryTotals)
      .map(([name, amount]) => {
        if (amount > maxCatAmount) {
          maxCatAmount = amount;
          mostExpensiveCategory = name;
        }
        return {
          category: name,
          amount: Math.round(amount),
          percentage:
            totalExpensesThisMonth > 0
              ? Math.round((amount / totalExpensesThisMonth) * 100)
              : 0,
          color: CATEGORY_COLORS[name] || "#64748B",
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      totalExpensesThisMonth,
      prevMonthExpenses,
      monthGrowthPct,
      monthTrendPositive,
      dailyAverage,
      mostExpensiveCategory: mostExpensiveCategory !== "None" ? mostExpensiveCategory : "—",
      categoryBreakdown,
    };
  } catch (err) {
    console.error("Error calculating shop expense summary:", err);
    return {
      totalExpensesThisMonth: 0,
      prevMonthExpenses: 0,
      monthGrowthPct: 0,
      monthTrendPositive: true,
      dailyAverage: 0,
      mostExpensiveCategory: "—",
      categoryBreakdown: [],
    };
  }
}
