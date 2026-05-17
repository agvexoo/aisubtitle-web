"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { syncUser } from "@/lib/auth/sync-user";

const signupSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupState = {
  error: string | null;
  needsConfirmation: boolean;
};

// NOTE: do NOT export non-async values from a "use server" file — Next
// only allows async function exports. Initial state lives in the form.

export async function signUpWithPassword(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      needsConfirmation: false,
    };
  }

  const supabase = await createClient();
  const emailRedirectTo = new URL(
    "/auth/callback",
    env.NEXT_PUBLIC_APP_URL,
  ).toString();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo },
  });

  if (error) {
    return { error: error.message, needsConfirmation: false };
  }

  // If email confirmation is disabled, Supabase returns a user + session
  // immediately and we upsert the local row now. If confirmation IS required,
  // data.session is null and the upsert happens at /auth/callback when the
  // user clicks the confirmation link.
  if (data.session && data.user) {
    try {
      await syncUser(data.user);
    } catch (syncError) {
      console.error("syncUser failed in signup action", syncError);
    }
  }

  return { error: null, needsConfirmation: !data.session };
}
