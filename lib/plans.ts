// Single source of truth for the three plans. Used by:
//   - scripts/stripe-seed.ts (creates Stripe products/prices with these values)
//   - app/pricing/page.tsx (renders the 3 plan cards)
//   - lib/gates.ts (Phase 4 — feature gating per plan)
//   - webhook handlers (mapping Stripe price → local Plan)
//
// Prices are in pence (Stripe's smallest currency unit). The Stripe lookup
// keys here are how we reference prices from the app without storing IDs.

import type { Plan } from "@prisma/client";

export const PLAN_IDS = ["FREE", "PRO", "ENTERPRISE"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  /** Monthly price in pence. 0 means free. */
  priceInPence: number;
  currency: "gbp";
  /** Stripe lookup_key for the recurring price. null = no Stripe product. */
  stripeLookupKey: string | null;
  /** null = unlimited. */
  uploadsPerMonth: number | null;
  /** null = unlimited. */
  minutesPerMonth: number | null;
  exportFormats: ReadonlyArray<"srt" | "vtt" | "ass">;
  features: ReadonlyArray<string>;
  apiAccess: boolean;
  /** UI hint — the plan card to visually emphasise. */
  recommended?: boolean;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    tagline: "Try the workflow without committing.",
    priceInPence: 0,
    currency: "gbp",
    stripeLookupKey: null,
    uploadsPerMonth: 3,
    minutesPerMonth: 30,
    exportFormats: ["srt"],
    features: [
      "3 uploads per month",
      "30 minutes of transcription",
      "SRT export",
      "Standard processing queue",
    ],
    apiAccess: false,
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    tagline: "For creators and small teams shipping subtitles weekly.",
    priceInPence: 1200,
    currency: "gbp",
    stripeLookupKey: "pro_monthly",
    uploadsPerMonth: null,
    minutesPerMonth: 300,
    exportFormats: ["srt", "vtt", "ass"],
    features: [
      "Unlimited uploads",
      "300 minutes of transcription per month",
      "SRT, VTT, and ASS export",
      "Priority processing",
      "Email support",
    ],
    apiAccess: false,
    recommended: true,
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    tagline: "Production volume, API access, and team seats.",
    priceInPence: 3900,
    currency: "gbp",
    stripeLookupKey: "enterprise_monthly",
    uploadsPerMonth: null,
    minutesPerMonth: null,
    exportFormats: ["srt", "vtt", "ass"],
    features: [
      "Unlimited uploads",
      "Unlimited transcription minutes",
      "All export formats",
      "Priority processing",
      "API access",
      "Team seats",
      "Priority support",
    ],
    apiAccess: true,
  },
} as const;

export function formatPrice(plan: PlanDefinition): string {
  if (plan.priceInPence === 0) return "Free";
  const pounds = plan.priceInPence / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: plan.currency.toUpperCase(),
    minimumFractionDigits: pounds % 1 === 0 ? 0 : 2,
  }).format(pounds);
}

export function planFromLookupKey(lookupKey: string | null | undefined): Plan {
  if (!lookupKey) return "FREE";
  for (const plan of Object.values(PLANS)) {
    if (plan.stripeLookupKey === lookupKey) return plan.id;
  }
  return "FREE";
}
