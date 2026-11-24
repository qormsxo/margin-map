/**
 * Brute-force protection rules (pure). Storage lives in the server layer.
 *
 * A key (an email, an IP) may fail `maxFailures` times within `windowMs`;
 * the next failure that reaches the limit locks it for `lockMs`.
 *
 * Attempts are counted before the password is checked (`admitAttempt`), so parallel
 * requests cannot all slip past the check; a correct password gives its count back
 * (`refundAttempt`).
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

/** `lockedMs > 0`: refused, nothing counted. Otherwise `next` is the state to store. */
export type AttemptDecision = { lockedMs: number; next: ThrottleState | null };

/**
 * One attempt arriving at `now`: refused while the key is locked (nothing is counted),
 * otherwise admitted and counted as a failure until proven otherwise.
 */
export function admitAttempt(
  state: ThrottleState | null,
  now: Date,
  policy: ThrottlePolicy,
): AttemptDecision {
  const lockedMs = lockRemainingMs(state, now);

  if (lockedMs > 0) return { lockedMs, next: null };

  return { lockedMs: 0, next: recordFailure(state, now, policy) };
}

/** State after an admitted attempt turned out to be a success: uncount it, and drop a lock it alone caused. */
export function refundAttempt(state: ThrottleState, policy: ThrottlePolicy): ThrottleState {
  const failures = Math.max(0, state.failures - 1);

  return { ...state, failures, lockedUntil: failures < policy.maxFailures ? null : state.lockedUntil };
}

const MINUTE = 60_000;

export const THROTTLE_POLICIES = {
  /** One account from one address: 5 wrong passwords in 15 minutes → 15-minute lock. */
  loginEmailIp: { maxFailures: 5, windowMs: 15 * MINUTE, lockMs: 15 * MINUTE },
  /**
   * One account from anywhere: a looser ceiling, so a stranger who only knows the email
   * cannot lock the owner out from one address, while spread-out guessing stays capped.
   */
  loginEmail: { maxFailures: 30, windowMs: 60 * MINUTE, lockMs: 30 * MINUTE },
  /** One address trying many accounts: 20 failures in 15 minutes → 15-minute lock. */
  loginIp: { maxFailures: 20, windowMs: 15 * MINUTE, lockMs: 15 * MINUTE },
  /** Signups from one address: 5 per hour. */
  registerIp: { maxFailures: 5, windowMs: 60 * MINUTE, lockMs: 60 * MINUTE },
} satisfies Record<string, ThrottlePolicy>;
