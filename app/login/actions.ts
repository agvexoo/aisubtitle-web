"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginState = { error: string | null };

// NOTE: do NOT export non-async values from a "use server" file — Next
// only allows async function exports. Initial state lives in the form.

export async function signInWithPassword(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: error.message };

  const next = (formData.get("next") as string) || "/dashboard";
  redirect(next);
}

export async function signInWithGoogle(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const supabase = await createClient();
  const next = (formData.get("next") as string) || "/dashboard";
  const redirectTo = new URL("/auth/callback", env.NEXT_PUBLIC_APP_URL);
  if (next && next !== "/dashboard") {
    redirectTo.searchParams.set("next", next);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectTo.toString() },
  });

  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
  return { error: "Could not start Google sign-in" };
}
