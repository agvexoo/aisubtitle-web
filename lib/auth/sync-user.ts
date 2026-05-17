// Upsert the local User row (and its Usage row) for a Supabase auth user.
// Called from /auth/callback after exchangeCodeForSession, and from the
// signup server action when a session lands immediately (email confirmation
// disabled). Idempotent — safe to call on every login.
import type { User as AuthUser } from "@supabase/supabase-js";
import { db } from "@/lib/db";

function extractName(authUser: AuthUser): string | null {
  const meta = authUser.user_metadata;
  if (!meta) return null;
  if (typeof meta.name === "string") return meta.name;
  if (typeof meta.full_name === "string") return meta.full_name;
  return null;
}

// First day of next month at UTC midnight. Usage counters reset to this.
function getNextResetDate(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
}

export async function syncUser(authUser: AuthUser) {
  if (!authUser.email) {
    throw new Error("Cannot sync user without an email");
  }

  return db.user.upsert({
    where: { supabaseId: authUser.id },
    create: {
      supabaseId: authUser.id,
      email: authUser.email,
      name: extractName(authUser),
      usage: {
        create: {
          uploadsThisMonth: 0,
          minutesThisMonth: 0,
          resetAt: getNextResetDate(),
        },
      },
    },
    update: {
      email: authUser.email,
    },
  });
}
