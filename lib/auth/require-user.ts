// Helper for server contexts (API routes, server actions, RSC) that need both
// the Supabase auth user AND the local Prisma User row. Returns null if there
// is no authenticated session — callers turn that into a 401 / redirect.
//
// Falls back to syncUser() if the auth user exists but the local row is
// missing (rare edge case — e.g. /auth/callback DB upsert failed previously).
import type { User as AuthUser } from "@supabase/supabase-js";
import type { User as DbUser } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { syncUser } from "@/lib/auth/sync-user";

export interface AuthedUser {
  authUser: AuthUser;
  dbUser: DbUser;
}

export async function requireUser(): Promise<AuthedUser | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  let dbUser = await db.user.findUnique({
    where: { supabaseId: authUser.id },
  });

  if (!dbUser) {
    dbUser = await syncUser(authUser);
  }

  return { authUser, dbUser };
}
