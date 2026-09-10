import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  client_code: string;
  full_name: string;
  phone: string | null;
  is_admin: boolean;
  created_at: string;
  /**
   * The client's email as the DATABASE knows it. This is the key holdings and
   * monthly_returns are stored against, and the same value current_client_email()
   * resolves for RLS. Read it from here rather than from the auth session, so
   * the app scopes rows exactly the way the database does.
   */
  email: string | null;
};

// Server-side gate for portal pages. Verifies the session with Supabase
// (getUser, not getSession) and loads the profile row. Redirects to login if
// unauthenticated, or to /portal if a profile is somehow missing.
export async function requireUser(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile;
  /**
   * The email every per-client query must be scoped to: the profile row's
   * email, falling back to the session email exactly as current_client_email()
   * does. Lowercased, because the sync writes holdings.email lowercased
   * (replace_holdings_for_month does `v_email := lower(p_email)`).
   */
  clientEmail: string | null;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  // RLS ensures this returns only the caller's own row.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, client_code, full_name, phone, is_admin, created_at, email")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Authenticated but no profile row: account not fully provisioned.
    redirect("/portal/login?error=no_profile");
  }

  const typed = profile as Profile;
  const clientEmail = (typed.email ?? user.email ?? "").trim().toLowerCase() || null;

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: typed,
    clientEmail,
  };
}

export async function requireAdmin() {
  const ctx = await requireUser();
  if (!ctx.profile.is_admin) {
    redirect("/portal");
  }
  return ctx;
}
