import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/supabase/types";

export interface ProfileUpdateInput {
  full_name?: string;
  phone?: string;
  currency?: string;
  avatar_url?: string;
}

export async function getCurrentUser() {
  const supabase = createClient();
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user profile:", error.message);
      return null;
    }

    // If profile row doesn't exist yet, construct fallback from user auth data
    if (!data) {
      return {
        id: user.id,
        user_id: user.id,
        full_name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User",
        phone: user.user_metadata?.phone || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        currency: "INR",
        created_at: user.created_at,
        updated_at: user.created_at,
      };
    }

    return data;
  } catch (err) {
    console.error("Unexpected error in getProfile:", err);
    return null;
  }
}

export async function updateProfile(
  input: ProfileUpdateInput
): Promise<{ success: boolean; data?: Profile; error?: string }> {
  const supabase = createClient();
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Authentication required to update profile." };
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          ...input,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (error) {
      return { success: false, error: "Unable to save your profile changes. Please try again." };
    }

    return { success: true, data };
  } catch {
    return { success: false, error: "Something went wrong while updating your profile." };
  }
}
