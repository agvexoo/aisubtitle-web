// Usage counter helpers. The Usage row mirrors what the user has consumed in
// the current billing month; resetAt is the wall-clock moment at which
// counters should snap back to zero.
//
// Reset cadence: 1st of the next calendar month at UTC midnight. This is
// independent of the user's Stripe billing anchor; the spec calls for a
// simple monthly window, and the simplest predictable window is calendar
// month UTC.
//
// All operations here are intentionally idempotent — a stale Usage row that
// hasn't been touched in a while will just reset on the next call.

import { db } from "@/lib/db";
import type { Usage } from "@prisma/client";

function getNextResetDate(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
}

/**
 * Read the user's Usage row, resetting counters first if the billing window
 * has rolled over. Creates the row if it's somehow missing.
 */
export async function resetUsageIfDue(userId: string): Promise<Usage> {
  const now = new Date();

  const existing = await db.usage.findUnique({ where: { userId } });

  if (!existing) {
    return db.usage.create({
      data: {
        userId,
        uploadsThisMonth: 0,
        minutesThisMonth: 0,
        resetAt: getNextResetDate(now),
      },
    });
  }

  if (existing.resetAt <= now) {
    return db.usage.update({
      where: { userId },
      data: {
        uploadsThisMonth: 0,
        minutesThisMonth: 0,
        resetAt: getNextResetDate(now),
      },
    });
  }

  return existing;
}

/**
 * Atomic, race-safe increment. Runs inside a transaction with a fresh
 * resetIfDue check so two simultaneous uploads can't double-count.
 */
export async function incrementUsage(
  userId: string,
  uploads: number,
  minutes: number,
): Promise<Usage> {
  return db.$transaction(async (tx) => {
    const now = new Date();
    const existing = await tx.usage.findUnique({ where: { userId } });

    if (!existing || existing.resetAt <= now) {
      // Reset and seed the increment in one write.
      return tx.usage.upsert({
        where: { userId },
        create: {
          userId,
          uploadsThisMonth: uploads,
          minutesThisMonth: minutes,
          resetAt: getNextResetDate(now),
        },
        update: {
          uploadsThisMonth: uploads,
          minutesThisMonth: minutes,
          resetAt: getNextResetDate(now),
        },
      });
    }

    return tx.usage.update({
      where: { userId },
      data: {
        uploadsThisMonth: { increment: uploads },
        minutesThisMonth: { increment: minutes },
      },
    });
  });
}

/**
 * Parse an SRT body's last cue end-timestamp to estimate the source
 * duration. Used after a successful transcription to feed the usage counter.
 * Returns ceil(minutes) so partial minutes count as 1.
 */
export function estimateMinutesFromSrt(srt: string): number {
  // SRT timestamps look like "00:01:23,456 --> 00:01:28,789"
  const matches = srt.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g);
  if (!matches || matches.length === 0) return 0;
  const last = matches[matches.length - 1];
  const parts = last.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
  if (!parts) return 0;
  const hours = Number(parts[1]);
  const mins = Number(parts[2]);
  const secs = Number(parts[3]);
  const totalSeconds = hours * 3600 + mins * 60 + secs;
  return Math.max(1, Math.ceil(totalSeconds / 60));
}
