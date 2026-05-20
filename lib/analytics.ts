import posthog from "posthog-js";

type EventMap = {
  user_signed_up: { method: "email" | "google" };
  user_logged_in: { method: "email" | "google" };
  upload_started: { file_type: string; file_size_bytes: number };
  transcription_completed: { file_name: string; duration_minutes: number };
  export_downloaded: { format: "srt" | "vtt" | "ass"; file_name: string };
  upgrade_modal_shown: { reason: string | null };
  checkout_started: { plan_id: string };
  subscription_activated: { plan_id: string };
  subscription_cancelled: Record<string, never>;
};

export function track<E extends keyof EventMap>(
  event: E,
  properties: EventMap[E],
): void {
  if (typeof window === "undefined") return;
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
}

export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (!posthog.__loaded) return;
  posthog.identify(userId, traits);
}

export function resetAnalytics(): void {
  if (typeof window === "undefined") return;
  if (!posthog.__loaded) return;
  posthog.reset();
}
