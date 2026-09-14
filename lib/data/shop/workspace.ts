import { createClient } from "@/lib/supabase/client";
import { Workspace } from "@/lib/supabase/types";
import { ensureDefaultWorkspaces } from "@/lib/data/workspaces";
import { ensureDefaultShopExpenseCategories } from "./categories";

export interface AuthenticatedShopWorkspace {
  userId: string;
  workspaceId: string;
  workspace: Workspace;
}

/**
 * Safely resolves the authenticated user's Pan Shop workspace (type = 'shop').
 * Validates ownership and provisions defaults if required.
 */
export async function getAuthenticatedShopWorkspace(): Promise<AuthenticatedShopWorkspace | null> {
  const supabase = createClient();
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    // 1. Fetch user's shop workspace by slug or type
    let { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", user.id)
      .eq("slug", "pan-shop")
      .maybeSingle();

    // If not found by slug, fallback to type = 'shop'
    if (!workspace) {
      const { data: fallbackWs } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "shop")
        .maybeSingle();

      workspace = fallbackWs;
    }

    // If still not found, provision default workspaces
    if (!workspace) {
      const provisioned = await ensureDefaultWorkspaces(user.id);
      const shopWs = provisioned.find((w) => w.slug === "pan-shop" || w.type === "shop");
      if (shopWs) {
        workspace = shopWs;
      }
    }

    if (!workspace) {
      return null;
    }

    // Ensure default shop categories exist
    await ensureDefaultShopExpenseCategories(workspace.id, user.id);

    return {
      userId: user.id,
      workspaceId: workspace.id,
      workspace,
    };
  } catch (err) {
    console.error("Error resolving Pan Shop workspace:", err);
    return null;
  }
}
