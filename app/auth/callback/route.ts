import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/auth/sync-user";
import { trackServer } from "@/lib/analytics-server";

// Handles the redirect from Supabase after an OAuth flow or email confirmation.
// Exchanges the `code` query param for a session cookie, upserts the local
// User row, and forwards on to `next` (defaults to /dashboard).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?reason=missing-code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/error?reason=${encodeURIComponent(error.message)}`,
    );
  }

  if (data.user) {
    try {
      await syncUser(data.user);
    } catch (syncError) {
      console.error("syncUser failed in /auth/callback", syncError);
    }
    trackServer(data.user.id, "user_logged_in", { method: "google" });
  }

  return NextResponse.redirect(`${origin}${next}`);
}
