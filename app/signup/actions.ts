"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

const signupSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupState = {
  error: string | null;
  needsConfirmation: boolean;
};

export const initialSignupState: SignupState = {
  error: null,
  needsConfirmation: false,
};

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

  // TODO(phase-2): upsert User row keyed by supabaseId in the local DB once
  // Prisma is wired up. For now Supabase auth.users holds the record.

  // If email confirmation is required, Supabase returns no session.
  return { error: null, needsConfirmation: !data.session };
}
