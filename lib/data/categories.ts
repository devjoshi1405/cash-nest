import { createClient } from "@/lib/supabase/client";
import { Category } from "@/lib/supabase/types";

export async function getCategories(workspaceId: string, type?: "income" | "expense"): Promise<Category[]> {
  const supabase = createClient();
  try {
    let query = supabase
      .from("categories")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true });

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching categories:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Unexpected error fetching categories:", err);
    return [];
  }
}
