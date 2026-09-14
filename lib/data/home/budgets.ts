import { createClient } from "@/lib/supabase/client";
import {
  BudgetRecord,
  BudgetStatus,
  BudgetSummary,
  BudgetVsActualItem,
} from "@/types/home";
import { getMonthDateRange } from "@/lib/date";

export const BUDGET_SAFE_THRESHOLD = 80; // < 80% is Safe
export const BUDGET_NEAR_LIMIT_THRESHOLD = 100; // 80% - 99.99% is Near Limit

export interface GetBudgetsOptions {
  workspaceId: string;
  month?: string; // "YYYY-MM" or "YYYY-MM-DD"
}

export interface CreateBudgetInput {
  categoryId: string;
  amount: number;
  month: string; // "YYYY-MM" or "YYYY-MM-DD"
}

export interface UpdateBudgetInput {
  amount?: number;
  categoryId?: string;
  month?: string;
}

/**
 * Normalizes any date or month string into "YYYY-MM-01" for database storage
 */
export function normalizeBudgetMonth(monthStr?: string): string {
  if (!monthStr) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  }
  const clean = monthStr.trim();
  if (clean.length === 7) {
    // "YYYY-MM"
    return `${clean}-01`;
  }
  if (clean.length >= 10) {
    // "YYYY-MM-DD" -> "YYYY-MM-01"
    return `${clean.slice(0, 7)}-01`;
  }
  return clean;
}

/**
 * Extracts "YYYY-MM" display format from a DB date string
 */
export function formatMonthDisplayKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/**
 * Pure calculation: Budget Usage Percentage
 */
export function calculateBudgetUsage(allocatedAmount: number, spentAmount: number): number {
  if (allocatedAmount <= 0) return 0;
  return Math.round((spentAmount / allocatedAmount) * 1000) / 10;
}

/**
 * Pure calculation: Budget Status derivation
 */
export function calculateBudgetStatus(allocatedAmount: number, spentAmount: number): BudgetStatus {
  if (allocatedAmount <= 0) return "Safe";
  const pct = (spentAmount / allocatedAmount) * 100;
  if (pct >= BUDGET_NEAR_LIMIT_THRESHOLD) {
    return "Exceeded";
  } else if (pct >= BUDGET_SAFE_THRESHOLD) {
    return "Near Limit";
  }
  return "Safe";
}

/**
 * Fetch all budgets for a workspace and month, enriched with actual real-time spending
 */
export async function getBudgets(options: GetBudgetsOptions): Promise<BudgetRecord[]> {
  const supabase = createClient();
  const normalizedMonth = normalizeBudgetMonth(options.month);
  const year = parseInt(normalizedMonth.slice(0, 4), 10);
  const monthNum = parseInt(normalizedMonth.slice(5, 7), 10);
  const { startDate, endDate } = getMonthDateRange(year, monthNum);

  try {
    // 1. Fetch budgets for this workspace & month with category info
    const { data: rawBudgets, error: budgetsError } = await supabase
      .from("budgets")
      .select("*, categories(id, name, icon, type)")
      .eq("workspace_id", options.workspaceId)
      .eq("month", normalizedMonth)
      .order("created_at", { ascending: true });

    if (budgetsError) {
      console.error("Error fetching budgets:", budgetsError.message);
      return [];
    }

    // 2. Fetch all expense transactions for the active month window
    const { data: rawTransactions, error: txError } = await supabase
      .from("transactions")
      .select("amount, category_id, type, transaction_date")
      .eq("workspace_id", options.workspaceId)
      .eq("type", "expense")
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);

    if (txError) {
      console.error("Error fetching expenses for budgets:", txError.message);
    }

    // 3. Aggregate spending per category_id
    const spentByCategoryMap: Record<string, number> = {};
    for (const tx of rawTransactions || []) {
      if (tx.category_id) {
        spentByCategoryMap[tx.category_id] =
          (spentByCategoryMap[tx.category_id] || 0) + Number(tx.amount);
      }
    }

    // 4. Map budget records with calculated spending
    const records: BudgetRecord[] = (rawBudgets || []).map((b: any) => {
      const allocated = Number(b.amount);
      const spent = b.category_id ? spentByCategoryMap[b.category_id] || 0 : 0;
      const remaining = Math.round((allocated - spent) * 100) / 100;
      const percentage = calculateBudgetUsage(allocated, spent);
      const status = calculateBudgetStatus(allocated, spent);

      return {
        id: b.id,
        userId: b.user_id,
        workspaceId: b.workspace_id,
        categoryId: b.category_id,
        category: b.categories?.name || "General Budget",
        categoryIcon: b.categories?.icon || "🏷️",
        allocatedAmount: allocated,
        spentAmount: spent,
        remainingAmount: remaining,
        percentage,
        month: formatMonthDisplayKey(b.month),
        status,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      };
    });

    return records;
  } catch (err) {
    console.error("Unexpected error in getBudgets:", err);
    return [];
  }
}

/**
 * Fetch a budget by category and month
 */
export async function getBudgetByCategory(
  workspaceId: string,
  categoryId: string,
  month: string
): Promise<BudgetRecord | null> {
  const normalizedMonth = normalizeBudgetMonth(month);
  const budgets = await getBudgets({ workspaceId, month: normalizedMonth });
  return budgets.find((b) => b.categoryId === categoryId) || null;
}

/**
 * Create a new monthly Category Budget
 */
export async function createBudget(
  workspaceId: string,
  input: CreateBudgetInput
): Promise<{ success: boolean; data?: BudgetRecord; error?: string }> {
  const supabase = createClient();
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Authentication required." };
    }

    if (input.amount <= 0) {
      return { success: false, error: "Budget amount must be greater than 0." };
    }

    // 1. Verify category belongs to user & workspace and is an expense category
    const { data: category, error: catError } = await supabase
      .from("categories")
      .select("id, name, type")
      .eq("id", input.categoryId)
      .eq("workspace_id", workspaceId)
      .single();

    if (catError || !category) {
      return { success: false, error: "Selected category is invalid or not found." };
    }

    if (category.type !== "expense") {
      return { success: false, error: "Budgets can only be set for Expense categories." };
    }

    const normalizedMonth = normalizeBudgetMonth(input.month);

    // 2. Prevent duplicate budget for the same category and month
    const { data: existing } = await supabase
      .from("budgets")
      .select("id")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .eq("category_id", input.categoryId)
      .eq("month", normalizedMonth)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: `A budget already exists for "${category.name}" in this month. Please edit the existing budget.`,
      };
    }

    // 3. Insert budget
    const { data, error } = await supabase
      .from("budgets")
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        category_id: input.categoryId,
        month: normalizedMonth,
        amount: Number(input.amount),
      })
      .select("*, categories(id, name, icon, type)")
      .single();

    if (error) {
      console.error("Error creating budget:", error.message);
      return { success: false, error: error.message };
    }

    const created: BudgetRecord = {
      id: data.id,
      userId: data.user_id,
      workspaceId: data.workspace_id,
      categoryId: data.category_id,
      category: data.categories?.name || category.name,
      categoryIcon: data.categories?.icon || "🏷️",
      allocatedAmount: Number(data.amount),
      spentAmount: 0,
      remainingAmount: Number(data.amount),
      percentage: 0,
      month: formatMonthDisplayKey(data.month),
      status: "Safe",
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { success: true, data: created };
  } catch (err: any) {
    console.error("Unexpected error in createBudget:", err);
    return { success: false, error: err.message || "Failed to create budget." };
  }
}

/**
 * Update an existing monthly budget
 */
export async function updateBudget(
  id: string,
  input: UpdateBudgetInput
): Promise<{ success: boolean; data?: BudgetRecord; error?: string }> {
  const supabase = createClient();
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Authentication required." };
    }

    if (input.amount !== undefined && input.amount <= 0) {
      return { success: false, error: "Budget amount must be greater than 0." };
    }

    const payload: any = {};
    if (input.amount !== undefined) payload.amount = Number(input.amount);
    if (input.categoryId !== undefined) payload.category_id = input.categoryId;
    if (input.month !== undefined) payload.month = normalizeBudgetMonth(input.month);

    const { data, error } = await supabase
      .from("budgets")
      .update(payload)
      .eq("id", id)
      .select("*, categories(id, name, icon, type)")
      .single();

    if (error) {
      console.error("Error updating budget:", error.message);
      return { success: false, error: error.message };
    }

    const updated: BudgetRecord = {
      id: data.id,
      userId: data.user_id,
      workspaceId: data.workspace_id,
      categoryId: data.category_id,
      category: data.categories?.name || "General Budget",
      categoryIcon: data.categories?.icon || "🏷️",
      allocatedAmount: Number(data.amount),
      spentAmount: 0,
      remainingAmount: Number(data.amount),
      percentage: 0,
      month: formatMonthDisplayKey(data.month),
      status: "Safe",
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("Unexpected error in updateBudget:", err);
    return { success: false, error: err.message || "Failed to update budget." };
  }
}

/**
 * Delete a budget record (without touching transactions)
 */
export async function deleteBudget(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  try {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) {
      console.error("Error deleting budget:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error in deleteBudget:", err);
    return { success: false, error: err.message || "Failed to delete budget." };
  }
}

/**
 * Summary totals for Budgets in the target month
 */
export async function getBudgetSummary(
  workspaceId: string,
  month: string
): Promise<BudgetSummary> {
  const records = await getBudgets({ workspaceId, month });

  const totalBudget = records.reduce((acc, b) => acc + b.allocatedAmount, 0);
  const totalSpent = records.reduce((acc, b) => acc + b.spentAmount, 0);
  const totalRemaining = Math.round((totalBudget - totalSpent) * 100) / 100;
  const overallPercentage = calculateBudgetUsage(totalBudget, totalSpent);
  const overallStatus = calculateBudgetStatus(totalBudget, totalSpent);

  const categoriesExceededCount = records.filter((b) => b.status === "Exceeded").length;
  const categoriesNearLimitCount = records.filter((b) => b.status === "Near Limit").length;
  const categoriesSafeCount = records.filter((b) => b.status === "Safe").length;

  return {
    totalBudget: Math.round(totalBudget),
    totalSpent: Math.round(totalSpent),
    totalRemaining,
    overallPercentage,
    overallStatus,
    categoriesCount: records.length,
    categoriesExceededCount,
    categoriesNearLimitCount,
    categoriesSafeCount,
  };
}

/**
 * Formats budget vs actual data for charts & reporting
 */
export async function getBudgetVsActual(
  workspaceId: string,
  month: string
): Promise<BudgetVsActualItem[]> {
  const records = await getBudgets({ workspaceId, month });
  return records.map((r) => ({
    category: String(r.category),
    icon: r.categoryIcon,
    budget: Math.round(r.allocatedAmount),
    spent: Math.round(r.spentAmount),
    remaining: Math.round(r.remainingAmount),
    percentage: r.percentage ?? 0,
    status: r.status,
  }));
}
