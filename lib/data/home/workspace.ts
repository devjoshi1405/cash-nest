import { createClient } from "@/lib/supabase/client";
import { Workspace } from "@/lib/supabase/types";
import { ensureDefaultWorkspaces } from "@/lib/data/workspaces";
import { ensureDefaultHomeCategories } from "./categories";

export interface AuthenticatedHomeWorkspace {
  userId: string;
  workspaceId: string;
  workspace: Workspace;
}

/**
 * Safely resolves the authenticated user's Home workspace.
 * Validates ownership and auto-provisions defaults if required.
 */
export async function getAuthenticatedHomeWorkspace(): Promise<AuthenticatedHomeWorkspace | null> {
  const supabase = createClient();
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    // 1. Fetch user's home workspace
    let { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", user.id)
      .eq("slug", "home")
      .maybeSingle();

    // If not found by slug, fallback to type = home
    if (!workspace) {
      const { data: fallbackWs } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "home")
        .maybeSingle();

      workspace = fallbackWs;
    }

    // If still not found, provision default workspaces
    if (!workspace) {
      const provisioned = await ensureDefaultWorkspaces(user.id);
      const homeWs = provisioned.find((w) => w.slug === "home" || w.type === "home");
      if (homeWs) {
        workspace = homeWs;
      }
    }

    if (!workspace) {
      return null;
    }

    // Ensure default categories exist for this home workspace
    await ensureDefaultHomeCategories(workspace.id, user.id);

    return {
      userId: user.id,
      workspaceId: workspace.id,
      workspace,
    };
  } catch (err) {
    console.error("Error resolving Home workspace:", err);
    return null;
  }
}
