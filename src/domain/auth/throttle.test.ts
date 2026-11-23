import { describe, expect, it } from "vitest";
import { admitAttempt, lockRemainingMs, recordFailure, refundAttempt, type ThrottlePolicy } from "./throttle";

const policy: ThrottlePolicy = { maxFailures: 5, windowMs: 15 * 60_000, lockMs: 15 * 60_000 };
const t0 = new Date("2026-11-19T10:00:00Z");
const at = (minutes: number) => new Date(t0.getTime() + minutes * 60_000);

describe("login throttle", () => {
  it("starts a window on the first failure", () => {
    const s = recordFailure(null, t0, policy);

    expect(s).toEqual({ failures: 1, windowStart: t0, lockedUntil: null });
    expect(lockRemainingMs(s, t0)).toBe(0);
  });

  it("locks after max failures inside the window", () => {
    let s = recordFailure(null, t0, policy);

    for (let i = 1; i < 5; i++) s = recordFailure(s, at(i), policy);

    expect(s.lockedUntil).toEqual(at(4 + 15));
    expect(lockRemainingMs(s, at(10))).toBe(9 * 60_000);
    expect(lockRemainingMs(s, at(19))).toBe(0);
  });

  it("does not lock when failures are spread beyond the window", () => {
    let s = recordFailure(null, t0, policy);

    for (const m of [5, 10, 14]) s = recordFailure(s, at(m), policy);

    // 16 minutes after the first failure: a fresh window starts.
    s = recordFailure(s, at(16), policy);

    expect(s.failures).toBe(1);
    expect(s.lockedUntil).toBeNull();
  });

  it("starts counting again after a lock expires", () => {
    let s = recordFailure(null, t0, policy);

    for (let i = 1; i < 5; i++) s = recordFailure(s, at(i), policy);

    const afterLock = recordFailure(s, at(30), policy);

    expect(afterLock).toEqual({ failures: 1, windowStart: at(30), lockedUntil: null });
  });
});

describe("admit before the password check", () => {
  it("counts an admitted attempt and refuses (without counting) while locked", () => {
    let s = recordFailure(null, t0, policy);

    for (let i = 1; i < 4; i++) s = recordFailure(s, at(i), policy);

    const fifth = admitAttempt(s, at(5), policy);

    expect(fifth.lockedMs).toBe(0);
    expect(fifth.next?.failures).toBe(5);
    expect(lockRemainingMs(fifth.next, at(5))).toBe(15 * 60_000);

    const sixth = admitAttempt(fifth.next, at(6), policy);

    expect(sixth).toEqual({ lockedMs: 14 * 60_000, next: null });
  });

  it("a correct password gives its count back and lifts a lock it alone caused", () => {
    let s = recordFailure(null, t0, policy);

    for (let i = 1; i < 5; i++) s = recordFailure(s, at(i), policy);

    expect(s.lockedUntil).not.toBeNull();

    const refunded = refundAttempt(s, policy);

    expect(refunded.failures).toBe(4);
    expect(refunded.lockedUntil).toBeNull();
  });

  it("keeps a lock that real failures still justify", () => {
    const locked = { failures: 7, windowStart: t0, lockedUntil: at(20) };

    expect(refundAttempt(locked, policy)).toEqual({ failures: 6, windowStart: t0, lockedUntil: at(20) });
  });
});
