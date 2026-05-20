// Feature gates — central place to ask "is this user allowed to do X?".
// Used by:
//   - app/api/uploads/route.ts          (canUpload before accepting a file)
//   - app/dashboard/uploads/ (Phase 8)  (canExport per row's export buttons)
//   - app/api/v1/* (future)             (hasApiAccess for API routes)
//
// Source of truth for plan capabilities is lib/plans.ts. This file translates
// those capabilities into yes/no decisions, factoring in real-time usage.

import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { resetUsageIfDue } from "@/lib/usage";

export type ExportFormat = "srt" | "vtt" | "ass";

export interface GateResult {
  allowed: boolean;
  reason?: string;
  /** If true, the upload modal / pricing CTA should be surfaced to the user. */
  upgradeRequired?: boolean;
}

const ALLOW: GateResult = { allowed: true };

export async function canUpload(userId: string): Promise<GateResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  const planDef = PLANS[user.plan];

  // Make sure the counters reflect the current billing period before we
  // compare against limits. resetUsageIfDue is idempotent and cheap.
  const usage = await resetUsageIfDue(userId);

  if (planDef.uploadsPerMonth !== null) {
    if (usage.uploadsThisMonth >= planDef.uploadsPerMonth) {
      return {
        allowed: false,
        reason: `You've used all ${planDef.uploadsPerMonth} ${planDef.name} uploads this month.`,
        upgradeRequired: true,
      };
    }
  }

  if (planDef.minutesPerMonth !== null) {
    if (usage.minutesThisMonth >= planDef.minutesPerMonth) {
      return {
        allowed: false,
        reason: `You've used all ${planDef.minutesPerMonth} ${planDef.name} transcription minutes this month.`,
        upgradeRequired: true,
      };
    }
  }

  return ALLOW;
}

export async function canExport(
  userId: string,
  format: ExportFormat,
): Promise<GateResult> {
  if (format === "srt") return ALLOW;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  const planDef = PLANS[user.plan];
  if (planDef.exportFormats.includes(format)) {
    return ALLOW;
  }
  return {
    allowed: false,
    reason: `${format.toUpperCase()} export is available on Pro and Enterprise.`,
    upgradeRequired: true,
  };
}

export async function hasApiAccess(userId: string): Promise<GateResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (!user) {
    return { allowed: false, reason: "User not found" };
  }
  if (PLANS[user.plan].apiAccess) return ALLOW;
  return {
    allowed: false,
    reason: "Programmatic API access is an Enterprise feature.",
    upgradeRequired: true,
  };
}
