import { createClient } from "@/lib/supabase/client";
import { Transaction } from "@/lib/supabase/types";
import { HomeTransaction } from "@/types/home";
import { PaymentMethod, TransactionType } from "@/types/common";

export interface GetHomeTransactionsOptions {
  workspaceId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  type?: "income" | "expense" | "all";
  categoryId?: string;
  categoryName?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
}

export interface HomeTransactionsSummary {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  totalCount: number;
}

export interface HomeTransactionsResult {
  transactions: HomeTransaction[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: HomeTransactionsSummary;
}

export interface CreateHomeTransactionInput {
  name: string;
  type: "income" | "expense" | "Income" | "Expense";
  amount: number;
  paymentMethod: PaymentMethod | string;
  date: string;
  category?: string;
  categoryId?: string;
  notes?: string;
}

export interface UpdateHomeTransactionInput {
  name?: string;
  type?: "income" | "expense" | "Income" | "Expense";
  amount?: number;
  paymentMethod?: PaymentMethod | string;
  date?: string;
  category?: string;
  categoryId?: string;
  notes?: string;
}

// Convert DB payment_method string to UI PaymentMethod
export function dbToUiPaymentMethod(method: string | null | undefined): PaymentMethod {
  if (!method) return "Other";
  const m = method.toLowerCase();
  switch (m) {
    case "cash":
      return "Cash";
    case "upi":
      return "UPI";
    case "bank":
      return "Bank";
    case "credit_card":
      return "Credit Card";
    case "debit_card":
      return "Debit Card";
    default:
      return "Other";
  }
}

// Convert UI PaymentMethod to DB payment_method
export function uiToDbPaymentMethod(method: string | null | undefined): string {
  if (!method) return "other";
  const m = method.toLowerCase();
  if (m.includes("credit")) return "credit_card";
  if (m.includes("debit")) return "debit_card";
  if (m.includes("upi")) return "upi";
  if (m.includes("cash")) return "cash";
  if (m.includes("bank")) return "bank";
  return "other";
}

// Convert DB transaction row with joined category to UI HomeTransaction
export function mapDbTransactionToUi(
  row: Transaction & { categories?: { id: string; name: string; icon: string | null } | null }
): HomeTransaction {
  const isIncome = row.type.toLowerCase() === "income";
  const categoryName = row.categories?.name || "Other";

  return {
    id: row.id,
    name: row.name,
    type: (isIncome ? "Income" : "Expense") as TransactionType,
    category: categoryName as any,
    amount: Number(row.amount),
    paymentMethod: dbToUiPaymentMethod(row.payment_method),
    date: row.transaction_date,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

/**
 * Fetch filtered, paginated transactions for a Home workspace along with aggregate KPI summaries.
 */
export async function getHomeTransactions(
  options: GetHomeTransactionsOptions
): Promise<HomeTransactionsResult> {
  const supabase = createClient();
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.pageSize || 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const emptySummary: HomeTransactionsSummary = {
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
    totalCount: 0,
  };

  try {
    let query = supabase
      .from("transactions")
      .select("*, categories(id, name, icon)", { count: "exact" })
      .eq("workspace_id", options.workspaceId);

    let sumQuery = supabase
      .from("transactions")
      .select("type, amount")
      .eq("workspace_id", options.workspaceId);

    // Filter by type
    if (options.type && options.type !== "all") {
      const dbType = options.type.toLowerCase() as "income" | "expense";
      query = query.eq("type", dbType);
      sumQuery = sumQuery.eq("type", dbType);
    }

    // Filter by Category ID
    if (options.categoryId && options.categoryId !== "all") {
      query = query.eq("category_id", options.categoryId);
      sumQuery = sumQuery.eq("category_id", options.categoryId);
    }

    // Filter by Payment Method
    if (options.paymentMethod && options.paymentMethod !== "all") {
      const dbMethod = uiToDbPaymentMethod(options.paymentMethod);
      query = query.eq("payment_method", dbMethod);
      sumQuery = sumQuery.eq("payment_method", dbMethod);
    }

    // Filter by Date Range
    if (options.startDate) {
      query = query.gte("transaction_date", options.startDate);
      sumQuery = sumQuery.gte("transaction_date", options.startDate);
    }
    if (options.endDate) {
      query = query.lte("transaction_date", options.endDate);
      sumQuery = sumQuery.lte("transaction_date", options.endDate);
    }

    // Search by Name or Notes (case-insensitive)
    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      query = query.or(`name.ilike.%${term}%,notes.ilike.%${term}%`);
      sumQuery = sumQuery.or(`name.ilike.%${term}%,notes.ilike.%${term}%`);
    }

    // Sort newest first & range
    query = query
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    const [listRes, sumRes] = await Promise.all([query, sumQuery]);

    if (listRes.error) {
      console.error("Error fetching home transactions:", listRes.error.message);
      return {
        transactions: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        summary: emptySummary,
      };
    }

    let items = (listRes.data || []).map((row: any) => mapDbTransactionToUi(row));

    // If filtered by category name client-side
    if (options.categoryName && options.categoryName !== "all") {
      items = items.filter(
        (t) => t.category.toLowerCase() === options.categoryName!.toLowerCase()
      );
    }

    const totalCount = listRes.count !== null ? listRes.count : items.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    // Calculate aggregated summary
    let totalIncome = 0;
    let totalExpense = 0;
    for (const r of sumRes.data || []) {
      const amt = Number(r.amount) || 0;
      if (r.type === "income") {
        totalIncome += amt;
      } else if (r.type === "expense") {
        totalExpense += amt;
      }
    }

    const summary: HomeTransactionsSummary = {
      totalIncome: Math.round(totalIncome),
      totalExpense: Math.round(totalExpense),
      netSavings: Math.round(totalIncome - totalExpense),
      totalCount,
    };

    return {
      transactions: items,
      totalCount,
      page,
      pageSize,
      totalPages,
      summary,
    };
  } catch (err) {
    console.error("Unexpected error in getHomeTransactions:", err);
    return {
      transactions: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
      summary: emptySummary,
    };
  }
}

/**
 * Fetch a single transaction by ID.
 */
export async function getHomeTransactionById(id: string): Promise<HomeTransaction | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*, categories(id, name, icon)")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return mapDbTransactionToUi(data as any);
  } catch {
    return null;
  }
}

/**
 * Create a new Home transaction linked to workspace and category.
 */
export async function createHomeTransaction(
  workspaceId: string,
  input: CreateHomeTransactionInput
): Promise<{ success: boolean; transaction?: HomeTransaction; error?: string }> {
  const supabase = createClient();
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Authentication required." };
    }

    const normalizedType = input.type.toLowerCase() as "income" | "expense";
    const dbMethod = uiToDbPaymentMethod(input.paymentMethod);

    let categoryId = input.categoryId;

    // Resolve category ID if category name provided
    if (!categoryId && input.category) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("type", normalizedType)
        .ilike("name", input.category.trim())
        .maybeSingle();

      if (cat) {
        categoryId = cat.id;
      } else {
        // Auto-create category if doesn't exist
        const { data: newCat } = await supabase
          .from("categories")
          .insert({
            user_id: user.id,
            workspace_id: workspaceId,
            name: input.category.trim(),
            type: normalizedType,
            icon: normalizedType === "income" ? "💰" : "🏷️",
            is_default: false,
            is_active: true,
          })
          .select("id")
          .single();

        if (newCat) {
          categoryId = newCat.id;
        }
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        category_id: categoryId || null,
        type: normalizedType,
        name: input.name.trim(),
        amount: Number(input.amount),
        payment_method: dbMethod,
        transaction_date: input.date,
        notes: input.notes?.trim() || null,
      })
      .select("*, categories(id, name, icon)")
      .single();

    if (insertError) {
      console.error("Error creating transaction:", insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, transaction: mapDbTransactionToUi(inserted as any) };
  } catch (err: any) {
    console.error("Unexpected error creating transaction:", err);
    return { success: false, error: err?.message || "Failed to create transaction." };
  }
}

/**
 * Update an existing Home transaction.
 */
export async function updateHomeTransaction(
  id: string,
  workspaceId: string,
  input: UpdateHomeTransactionInput
): Promise<{ success: boolean; transaction?: HomeTransaction; error?: string }> {
  const supabase = createClient();
  try {
    const updatePayload: {
      name?: string;
      amount?: number;
      transaction_date?: string;
      notes?: string | null;
      payment_method?: string;
      type?: "income" | "expense";
      category_id?: string | null;
    } = {};

    if (input.name !== undefined) updatePayload.name = input.name.trim();
    if (input.amount !== undefined) updatePayload.amount = Number(input.amount);
    if (input.date !== undefined) updatePayload.transaction_date = input.date;
    if (input.notes !== undefined) updatePayload.notes = input.notes.trim() || null;
    if (input.paymentMethod !== undefined) {
      updatePayload.payment_method = uiToDbPaymentMethod(input.paymentMethod);
    }
    if (input.type !== undefined) {
      updatePayload.type = input.type.toLowerCase() as "income" | "expense";
    }

    // Category handling
    if (input.categoryId !== undefined) {
      updatePayload.category_id = input.categoryId;
    } else if (input.category) {
      const effectiveType = input.type
        ? (input.type.toLowerCase() as "income" | "expense")
        : undefined;
      let catQuery = supabase
        .from("categories")
        .select("id")
        .eq("workspace_id", workspaceId)
        .ilike("name", input.category.trim());

      if (effectiveType) {
        catQuery = catQuery.eq("type", effectiveType);
      }

      const { data: cat } = await catQuery.maybeSingle();
      if (cat) {
        updatePayload.category_id = cat.id;
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: newCat } = await supabase
            .from("categories")
            .insert({
              user_id: user.id,
              workspace_id: workspaceId,
              name: input.category.trim(),
              type: effectiveType || "expense",
              icon: (effectiveType || "expense") === "income" ? "💰" : "🏷️",
              is_default: false,
              is_active: true,
            })
            .select("id")
            .single();
          if (newCat) {
            updatePayload.category_id = newCat.id;
          }
        }
      }
    }

    const { data: updated, error } = await supabase
      .from("transactions")
      .update(updatePayload as any)
      .eq("id", id)
      .select("*, categories(id, name, icon)")
      .single();

    if (error) {
      console.error("Error updating transaction:", error);
      return { success: false, error: error.message };
    }

    return { success: true, transaction: mapDbTransactionToUi(updated as any) };
  } catch (err: any) {
    console.error("Unexpected error updating transaction:", err);
    return { success: false, error: err?.message || "Failed to update transaction." };
  }
}

/**
 * Delete a Home transaction by ID.
 */
export async function deleteHomeTransaction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  try {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      console.error("Error deleting transaction:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error deleting transaction:", err);
    return { success: false, error: err?.message || "Failed to delete transaction." };
  }
}

