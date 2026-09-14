import { createClient } from "@/lib/supabase/client";
import { Transaction } from "@/lib/supabase/types";

export interface GetTransactionsOptions {
  workspaceId: string;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  type?: "income" | "expense";
}

export async function getTransactions(options: GetTransactionsOptions): Promise<Transaction[]> {
  const supabase = createClient();
  try {
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("workspace_id", options.workspaceId)
      .order("transaction_date", { ascending: false });

    if (options.type) {
      query = query.eq("type", options.type);
    }
    if (options.startDate) {
      query = query.gte("transaction_date", options.startDate);
    }
    if (options.endDate) {
      query = query.lte("transaction_date", options.endDate);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching transactions:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Unexpected error fetching transactions:", err);
    return [];
  }
}
