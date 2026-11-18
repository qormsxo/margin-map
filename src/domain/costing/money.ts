import { MONEY_DECIMALS, RATE_PRECISION, UNIT_COST_PRECISION } from "./rules";
import { DomainError } from "./domain-error";

export function assertFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new DomainError("INVALID_INPUT", `${label} must be a finite number`);
  }

  return value;
}

export function assertNonNegative(value: number, label: string): number {
  assertFiniteNumber(value, label);

  if (value < 0) {
    throw new DomainError("INVALID_INPUT", `${label} must be >= 0`);
  }

  return value;
}

export function assertPositive(value: number, label: string): number {
  assertFiniteNumber(value, label);

  if (value <= 0) {
    throw new DomainError("INVALID_INPUT", `${label} must be > 0`);
  }

  return value;
}

export function assertRate(value: number, label: string): number {
  assertFiniteNumber(value, label);

  if (value < 0 || value > 1) {
    throw new DomainError("INVALID_INPUT", `${label} must be between 0 and 1`);
  }

  return value;
}

/** KRW: round half-up to 0 decimal places. */
export function roundMoney(value: number): number {
  assertFiniteNumber(value, "money");
  const factor = 10 ** MONEY_DECIMALS;

  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function roundUnitCost(value: number): number {
  assertFiniteNumber(value, "unitCost");
  const factor = 10 ** UNIT_COST_PRECISION;

  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function roundRate(value: number): number {
  assertFiniteNumber(value, "rate");
  const factor = 10 ** RATE_PRECISION;

  return Math.round((value + Number.EPSILON) * factor) / factor;
}
