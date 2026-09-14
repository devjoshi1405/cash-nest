import { createClient } from "@/lib/supabase/client";
import { DailySale } from "@/lib/supabase/types";

export interface DailySaleCalculated extends DailySale {
  total_sales: number;
}

export async function getDailySales(workspaceId: string, limit = 30): Promise<DailySaleCalculated[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("daily_sales")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("sale_date", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching daily sales:", error.message);
      return [];
    }

    return (data || []).map((sale) => ({
      ...sale,
      total_sales:
        Number(sale.cash_amount || 0) +
        Number(sale.upi_amount || 0) +
        Number(sale.card_amount || 0) +
        Number(sale.other_amount || 0),
    }));
  } catch (err) {
    console.error("Unexpected error fetching daily sales:", err);
    return [];
  }
}
