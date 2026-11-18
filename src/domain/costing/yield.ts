import { DomainError } from "./domain-error";
import { assertFiniteNumber, assertNonNegative, roundUnitCost } from "./money";

/**
 * Trim yield (손질 수율): share of the purchased quantity that is usable
 * after trimming/peeling. 1 = no loss. Recipe quantities are usable quantities.
 */
export function assertYieldRate(value: number, label = "yieldRate"): number {
  assertFiniteNumber(value, label);

  if (value <= 0 || value > 1) {
    throw new DomainError("INVALID_INPUT", `${label} must be > 0 and <= 1`);
  }

  return value;
}

/** Cost per usable base unit = purchase unit cost / yieldRate. */
export function effectiveUnitCost(unitCost: number, yieldRate: number): number {
  assertNonNegative(unitCost, "unitCost");
  assertYieldRate(yieldRate);

  return roundUnitCost(unitCost / yieldRate);
}

/** Raw (purchased) quantity needed to get `usableQty` after trimming. */
export function rawQtyFromUsable(usableQty: number, yieldRate: number): number {
  assertNonNegative(usableQty, "usableQty");
  assertYieldRate(yieldRate);

  return usableQty / yieldRate;
}
