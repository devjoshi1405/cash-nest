import { createClient } from "@/lib/supabase/client";
import { Budget } from "@/lib/supabase/types";

export async function getBudgets(workspaceId: string, month: string): Promise<Budget[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("budgets")
      .select("*, categories(*)")
      .eq("workspace_id", workspaceId)
      .eq("month", month);

    if (error) {
      console.error("Error fetching budgets:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Unexpected error fetching budgets:", err);
    return [];
  }
}
