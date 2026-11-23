import { Prisma } from "@prisma/client";
import {
  admitAttempt,
  lockRemainingMs,
  refundAttempt,
  THROTTLE_POLICIES,
  type ThrottlePolicy,
  type ThrottleState,
} from "@/domain/auth/throttle";
import { tooManyRequests } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export type ThrottleKey = { key: string; policy: ThrottlePolicy };

type Tx = Prisma.TransactionClient;

/** Caller IP behind Vercel's proxy (first hop of x-forwarded-for). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

function lockedMessage(ms: number, action: string) {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));

  return `${action} 시도가 너무 많습니다. ${minutes}분 뒤에 다시 시도해 주세요.`;
}

/**
 * Row-locks the throttle rows for `keys` until the transaction ends, so concurrent attempts
 * on the same key take turns. Locked in key order so two transactions never deadlock.
 */
async function lockRows(tx: Tx, keys: string[], create: boolean): Promise<Map<string, ThrottleState>> {
  const sorted = [...new Set(keys)].sort();

  if (create) {
    await tx.authThrottle.createMany({
      data: sorted.map((key) => ({ key, failures: 0, windowStart: new Date() })),
      skipDuplicates: true,
    });
  }

  // Raw only for the row lock; the values are read through Prisma so dates map as usual.
  await tx.$executeRaw`
    SELECT 1 FROM "AuthThrottle"
    WHERE "key" IN (${Prisma.join(sorted)})
    ORDER BY "key"
    FOR UPDATE`;

  const rows = await tx.authThrottle.findMany({
    where: { key: { in: sorted } },
    select: { key: true, failures: true, windowStart: true, lockedUntil: true },
  });

  return new Map(rows.map(({ key, ...state }) => [key, state] as const));
}

/**
 * Counts one attempt on every key before the password is checked.
 * Throws 429 (counting nothing) when any key is already locked.
 * Returns how long the keys would be locked if this attempt turns out wrong (0 = not locked).
 */
export async function admitAttempts(keys: ThrottleKey[], action: string): Promise<number> {
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const states = await lockRows(tx, keys.map((k) => k.key), true);
    const admitted = keys.map(({ key, policy }) => ({ key, ...admitAttempt(states.get(key) ?? null, now, policy) }));
    const lockedMs = Math.max(0, ...admitted.map((a) => a.lockedMs));

    if (lockedMs > 0) return { lockedMs, lockIfWrongMs: 0 };

    let lockIfWrongMs = 0;

    for (const { key, next } of admitted) {
      if (!next) continue;

      await tx.authThrottle.update({ where: { key }, data: next });
      lockIfWrongMs = Math.max(lockIfWrongMs, lockRemainingMs(next, now));
    }

    return { lockedMs: 0, lockIfWrongMs };
  });

  if (result.lockedMs > 0) throw tooManyRequests(lockedMessage(result.lockedMs, action));

  return result.lockIfWrongMs;
}

/** The admitted attempt succeeded: give its count back on these keys. */
export async function refundAttempts(keys: ThrottleKey[]) {
  await prisma.$transaction(async (tx) => {
    const states = await lockRows(tx, keys.map((k) => k.key), false);

    for (const { key, policy } of keys) {
      const state = states.get(key);

      if (state) await tx.authThrottle.update({ where: { key }, data: refundAttempt(state, policy) });
    }
  });
}

export async function clearThrottle(keys: string[]) {
  await prisma.authThrottle.deleteMany({ where: { key: { in: keys } } });
}

/** The 429 to show when a wrong password was the attempt that locked the key. */
export function lockedByThisAttempt(ms: number, action: string) {
  return tooManyRequests(lockedMessage(ms, action));
}

/**
 * Keys for one password check. The strict lock is per email *and* address, so someone who
 * only knows the email cannot lock the owner out; the email-wide and address-wide keys cap
 * guessing spread over many addresses or many accounts.
 */
export function loginKeys(email: string, ip: string) {
  const emailIp = { key: `login:email-ip:${email}:${ip}`, policy: THROTTLE_POLICIES.loginEmailIp };
  const emailWide = { key: `login:email:${email}`, policy: THROTTLE_POLICIES.loginEmail };
  const address = { key: `login:ip:${ip}`, policy: THROTTLE_POLICIES.loginIp };

  return { emailIp, email: emailWide, ip: address, all: [emailIp, emailWide, address] };
}
