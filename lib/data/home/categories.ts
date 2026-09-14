import { createClient } from "@/lib/supabase/client";
import { Category } from "@/lib/supabase/types";

export const DEFAULT_HOME_INCOME_CATEGORIES = [
  { name: "Salary", icon: "💼" },
  { name: "Bonus", icon: "🎁" },
  { name: "Freelance", icon: "💻" },
  { name: "Interest", icon: "📈" },
  { name: "Business Income", icon: "🏬" },
  { name: "Other Income", icon: "💰" },
];

export const DEFAULT_HOME_EXPENSE_CATEGORIES = [
  { name: "Kitchen", icon: "🍳" },
  { name: "Groceries", icon: "🛒" },
  { name: "Electricity", icon: "⚡" },
  { name: "Gas", icon: "🔥" },
  { name: "Wi-Fi", icon: "📶" },
  { name: "Mobile Recharge", icon: "📱" },
  { name: "Petrol", icon: "⛽" },
  { name: "Vehicle", icon: "🚗" },
  { name: "EMI", icon: "💳" },
  { name: "Loan", icon: "🏦" },
  { name: "Medical", icon: "💊" },
  { name: "Shopping", icon: "🛍️" },
  { name: "Entertainment", icon: "🎬" },
  { name: "Education", icon: "📚" },
  { name: "Travel", icon: "✈️" },
  { name: "Other", icon: "🏷️" },
];

/**
 * Fetch all active Home categories for a workspace.
 */
export async function getHomeCategories(
  workspaceId: string,
  type?: "income" | "expense"
): Promise<Category[]> {
  const supabase = createClient();
  try {
    let query = supabase
      .from("categories")
      .select("*")
      .eq("workspace_id", workspaceId)
      .neq("is_active", false)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching home categories:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Unexpected error in getHomeCategories:", err);
    return [];
  }
}

/**
 * Create a custom Home category with duplicate check.
 */
export async function createHomeCategory(
  workspaceId: string,
  payload: { name: string; type: "income" | "expense"; icon?: string }
): Promise<{ success: boolean; category?: Category; error?: string }> {
  const supabase = createClient();
  const trimmedName = payload.name.trim();

  if (!trimmedName || trimmedName.length < 2) {
    return { success: false, error: "Category name must be at least 2 characters long." };
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Authentication required." };
    }

    // Check for existing category with same name & type (case-insensitive)
    const { data: existingList, error: checkError } = await supabase
      .from("categories")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("type", payload.type);

    if (checkError) {
      console.error("Error checking existing category:", checkError);
    }

    const matchingCategory = (existingList || []).find(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (matchingCategory) {
      // If inactive, reactivate it!
      if (matchingCategory.is_active === false) {
        const { data: reactivated, error: reactivateError } = await supabase
          .from("categories")
          .update({ is_active: true, icon: payload.icon || matchingCategory.icon })
          .eq("id", matchingCategory.id)
          .select("*")
          .single();

        if (reactivateError) {
          return { success: false, error: reactivateError.message };
        }
        return { success: true, category: reactivated };
      }

      return {
        success: false,
        error: `Category "${trimmedName}" already exists for ${payload.type}.`,
      };
    }

    // Insert new category
    const { data: newCategory, error: insertError } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        name: trimmedName,
        type: payload.type,
        icon: payload.icon || (payload.type === "income" ? "💰" : "🏷️"),
        is_default: false,
        is_active: true,
      })
      .select("*")
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true, category: newCategory };
  } catch (err: any) {
    console.error("Unexpected error creating category:", err);
    return { success: false, error: err?.message || "Failed to create category." };
  }
}

/**
 * Update an existing Home category (e.g. rename or change icon).
 */
export async function updateHomeCategory(
  categoryId: string,
  payload: { name: string; icon?: string }
): Promise<{ success: boolean; category?: Category; error?: string }> {
  const supabase = createClient();
  const trimmedName = payload.name.trim();

  if (!trimmedName || trimmedName.length < 2) {
    return { success: false, error: "Category name must be at least 2 characters long." };
  }

  try {
    const { data, error } = await supabase
      .from("categories")
      .update({
        name: trimmedName,
        ...(payload.icon !== undefined ? { icon: payload.icon } : {}),
      })
      .eq("id", categoryId)
      .select("*")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, category: data };
  } catch (err: any) {
    console.error("Error updating category:", err);
    return { success: false, error: err?.message || "Failed to update category." };
  }
}

/**
 * Delete or soft-disable a category.
 * If transactions reference this category, soft-disable (is_active = false) to preserve historical data.
 */
export async function deleteHomeCategory(
  categoryId: string
): Promise<{ success: boolean; error?: string; softDeleted?: boolean }> {
  const supabase = createClient();
  try {
    // Check if category is used in transactions
    const { count, error: countError } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("category_id", categoryId);

    if (countError) {
      console.warn("Could not check transaction category usage:", countError.message);
    }

    if (count && count > 0) {
      // In use: soft delete
      const { error: softErr } = await supabase
        .from("categories")
        .update({ is_active: false })
        .eq("id", categoryId);

      if (softErr) return { success: false, error: softErr.message };
      return { success: true, softDeleted: true };
    } else {
      // Not in use: hard delete
      const { error: delErr } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (delErr) {
        // Fallback to soft delete if FK restriction occurs
        const { error: fallbackErr } = await supabase
          .from("categories")
          .update({ is_active: false })
          .eq("id", categoryId);
        if (fallbackErr) return { success: false, error: delErr.message };
        return { success: true, softDeleted: true };
      }
      return { success: true, softDeleted: false };
    }
  } catch (err: any) {
    console.error("Error deleting category:", err);
    return { success: false, error: err?.message || "Failed to delete category." };
  }
}

/**
 * Ensures all default Home categories exist for a given workspace and user.
 */
export async function ensureDefaultHomeCategories(
  workspaceId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();
  try {
    const { data: existing } = await supabase
      .from("categories")
      .select("name, type")
      .eq("workspace_id", workspaceId);

    const existingIncomeSet = new Set(
      (existing || []).filter((c) => c.type === "income").map((c) => c.name.toLowerCase())
    );
    const existingExpenseSet = new Set(
      (existing || []).filter((c) => c.type === "expense").map((c) => c.name.toLowerCase())
    );

    const toInsert: Array<{
      user_id: string;
      workspace_id: string;
      name: string;
      type: "income" | "expense";
      icon: string;
      is_default: boolean;
      is_active: boolean;
    }> = [];

    for (const inc of DEFAULT_HOME_INCOME_CATEGORIES) {
      if (!existingIncomeSet.has(inc.name.toLowerCase())) {
        toInsert.push({
          user_id: userId,
          workspace_id: workspaceId,
          name: inc.name,
          type: "income",
          icon: inc.icon,
          is_default: true,
          is_active: true,
        });
      }
    }

    for (const exp of DEFAULT_HOME_EXPENSE_CATEGORIES) {
      if (!existingExpenseSet.has(exp.name.toLowerCase())) {
        toInsert.push({
          user_id: userId,
          workspace_id: workspaceId,
          name: exp.name,
          type: "expense",
          icon: exp.icon,
          is_default: true,
          is_active: true,
        });
      }
    }

    if (toInsert.length > 0) {
      await supabase.from("categories").insert(toInsert);
    }
  } catch (err) {
    console.warn("ensureDefaultHomeCategories warning:", err);
  }
}
