import { createClient } from "@/lib/supabase/client";
import { Product, InventoryMovement } from "@/lib/supabase/types";

export interface ProductWithMovements extends Product {
  movements?: InventoryMovement[];
}

export async function getProducts(workspaceId: string): Promise<ProductWithMovements[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*, inventory_movements(*)")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching products:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Unexpected error fetching products:", err);
    return [];
  }
}
