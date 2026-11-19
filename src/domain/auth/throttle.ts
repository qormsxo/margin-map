/**
 * Brute-force protection rules (pure). Storage lives in the server layer.
 *
 * A key (an email, an IP) may fail `maxFailures` times within `windowMs`;
 * the next failure that reaches the limit locks it for `lockMs`.
 */
export type ThrottlePolicy = { maxFailures: number; windowMs: number; lockMs: number };

export type ThrottleState = { failures: number; windowStart: Date; lockedUntil: Date | null };

/** Milliseconds until the key may try again; 0 when it is not locked. */
export function lockRemainingMs(state: ThrottleState | null, now: Date): number {
  if (!state?.lockedUntil) return 0;

  return Math.max(0, state.lockedUntil.getTime() - now.getTime());
}

/** State after one more failure (or one more counted attempt) at `now`. */
export function recordFailure(state: ThrottleState | null, now: Date, policy: ThrottlePolicy): ThrottleState {
  const lockExpired = state?.lockedUntil != null && state.lockedUntil.getTime() <= now.getTime();
  const windowExpired = state != null && now.getTime() - state.windowStart.getTime() > policy.windowMs;

  if (!state || lockExpired || windowExpired) {
    return { failures: 1, windowStart: now, lockedUntil: null };
  }

  const failures = state.failures + 1;

  if (failures >= policy.maxFailures) {
    return { failures, windowStart: state.windowStart, lockedUntil: new Date(now.getTime() + policy.lockMs) };
  }

  return { failures, windowStart: state.windowStart, lockedUntil: null };
}

const MINUTE = 60_000;

export const THROTTLE_POLICIES = {
  /** One account: 5 wrong passwords in 15 minutes → 15-minute lock. */
  loginEmail: { maxFailures: 5, windowMs: 15 * MINUTE, lockMs: 15 * MINUTE },
  /** One address trying many accounts: 20 failures in 15 minutes → 15-minute lock. */
  loginIp: { maxFailures: 20, windowMs: 15 * MINUTE, lockMs: 15 * MINUTE },
  /** Signups from one address: 5 per hour. */
  registerIp: { maxFailures: 5, windowMs: 60 * MINUTE, lockMs: 60 * MINUTE },
} satisfies Record<string, ThrottlePolicy>;
