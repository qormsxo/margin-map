import { lockRemainingMs, recordFailure, type ThrottlePolicy, type ThrottleState } from "@/domain/auth/throttle";
import { tooManyRequests } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export type ThrottleKey = { key: string; policy: ThrottlePolicy };

/** Caller IP behind Vercel's proxy (first hop of x-forwarded-for). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

async function load(key: string): Promise<ThrottleState | null> {
  const row = await prisma.authThrottle.findUnique({ where: { key } });

  return row ? { failures: row.failures, windowStart: row.windowStart, lockedUntil: row.lockedUntil } : null;
}

function lockedMessage(ms: number, action: string) {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));

  return `${action} 시도가 너무 많습니다. ${minutes}분 뒤에 다시 시도해 주세요.`;
}

/** Throws 429 when any key is locked. */
export async function assertNotLocked(keys: ThrottleKey[], action: string) {
  const now = new Date();

  for (const { key } of keys) {
    const remaining = lockRemainingMs(await load(key), now);

    if (remaining > 0) throw tooManyRequests(lockedMessage(remaining, action));
  }
}

/** Counts one failure (or attempt) per key. Returns the longest lock it caused, in ms. */
export async function recordFailures(keys: ThrottleKey[]): Promise<number> {
  const now = new Date();
  let longestLock = 0;

  for (const { key, policy } of keys) {
    const next = recordFailure(await load(key), now, policy);

    await prisma.authThrottle.upsert({
      where: { key },
      create: { key, ...next },
      update: next,
    });

    longestLock = Math.max(longestLock, lockRemainingMs(next, now));
  }

  return longestLock;
}

export async function clearThrottle(key: string) {
  await prisma.authThrottle.deleteMany({ where: { key } });
}

export { lockedMessage };
