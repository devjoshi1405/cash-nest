import { createClient } from "@/lib/supabase/client";
import { Workspace } from "@/lib/supabase/types";

export async function getWorkspaces(): Promise<Workspace[]> {
  const supabase = createClient();
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return [];

    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching workspaces:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      // If trigger hasn't run or table is empty for user, provision defaults
      return await ensureDefaultWorkspaces(user.id);
    }

    return data;
  } catch (err) {
    console.error("Unexpected error in getWorkspaces:", err);
    return [];
  }
}

export async function getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
  const supabase = createClient();
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", user.id)
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function ensureDefaultWorkspaces(userId: string): Promise<Workspace[]> {
  const supabase = createClient();
  try {
    // Try to run the database function if available
    try {
      await supabase.rpc("provision_user_defaults", { p_user_id: userId });
    } catch {
      // RPC might not exist or be callable
    }

    // Double-check / insert via direct client query if needed
    const { data: existing } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", userId);

    if (existing && existing.length > 0) {
      return existing;
    }

    // Insert Home & Shop workspaces
    const toInsert = [
      {
        user_id: userId,
        name: "Home Finance",
        slug: "home",
        type: "home" as const,
        icon: "🏠",
      },
      {
        user_id: userId,
        name: "Pan Shop Finance",
        slug: "pan-shop",
        type: "shop" as const,
        icon: "🏪",
      },
    ];

    const { data: created, error } = await supabase
      .from("workspaces")
      .upsert(toInsert, { onConflict: "user_id,slug" })
      .select("*");

    if (error || !created) {
      // Fallback synthetic workspace records if database is in offline mode
      return [
        {
          id: "ws-home-default",
          user_id: userId,
          name: "Home Finance",
          slug: "home",
          type: "home",
          icon: "🏠",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "ws-shop-default",
          user_id: userId,
          name: "Pan Shop Finance",
          slug: "pan-shop",
          type: "shop",
          icon: "🏪",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    }

    return created;
  } catch (err) {
    console.error("Error in ensureDefaultWorkspaces:", err);
    return [];
  }
}
