import { createClient } from "@/lib/supabase/client";
import { Category } from "@/lib/supabase/types";

export interface DefaultCategory {
  name: string;
  icon: string;
}

export const DEFAULT_SHOP_EXPENSE_CATEGORIES: DefaultCategory[] = [
  { name: "Rent", icon: "🏬" },
  { name: "Electricity", icon: "⚡" },
  { name: "Transport", icon: "🚚" },
  { name: "Maintenance", icon: "🔧" },
  { name: "Employee", icon: "👥" },
  { name: "Packaging", icon: "📦" },
  { name: "Equipment", icon: "🧊" },
  { name: "Internet", icon: "📶" },
  { name: "Cleaning", icon: "🧹" },
  { name: "License / Fees", icon: "📜" },
  { name: "Miscellaneous", icon: "🏷️" },
  { name: "Other", icon: "📌" },
];

/**
 * Fetch all active Shop expense categories for a workspace.
 */
export async function getShopExpenseCategories(workspaceId: string): Promise<Category[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("type", "expense")
      .neq("is_active", false)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching shop expense categories:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Unexpected error in getShopExpenseCategories:", err);
    return [];
  }
}

/**
 * Ensures all default Pan Shop expense categories exist for a given workspace and user.
 */
export async function ensureDefaultShopExpenseCategories(
  workspaceId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();
  try {
    const { data: existing, error } = await supabase
      .from("categories")
      .select("name, type")
      .eq("workspace_id", workspaceId)
      .eq("type", "expense");

    if (error) {
      console.warn("Error checking existing shop categories:", error.message);
      return;
    }

    const existingNames = new Set((existing || []).map((c) => c.name.trim().toLowerCase()));

    const toInsert = DEFAULT_SHOP_EXPENSE_CATEGORIES.filter(
      (cat) => !existingNames.has(cat.name.toLowerCase())
    ).map((cat) => ({
      user_id: userId,
      workspace_id: workspaceId,
      name: cat.name,
      type: "expense" as const,
      icon: cat.icon,
      is_default: true,
      is_active: true,
    }));

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from("categories").insert(toInsert);
      if (insertError) {
        console.warn("Could not insert default shop categories:", insertError.message);
      }
    }
  } catch (err) {
    console.warn("Unexpected error in ensureDefaultShopExpenseCategories:", err);
  }
}
