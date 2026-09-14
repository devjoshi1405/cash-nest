import { createClient } from "@/lib/supabase/client";
import { Supplier } from "@/lib/supabase/types";

export async function getSuppliers(workspaceId: string): Promise<Supplier[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching suppliers:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Unexpected error fetching suppliers:", err);
    return [];
  }
}
