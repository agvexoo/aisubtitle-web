import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect from Supabase after an OAuth flow or email confirmation.
// Exchanges the `code` query param for a session cookie and forwards the user
// on to `next` (defaults to /dashboard).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?reason=missing-code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/error?reason=${encodeURIComponent(error.message)}`,
    );
  }

  // TODO(phase-2): upsert User row keyed by supabaseId in the local DB.

  return NextResponse.redirect(`${origin}${next}`);
}
