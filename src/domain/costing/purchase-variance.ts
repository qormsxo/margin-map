import { assertNonNegative, roundMoney, roundRate } from "./money";

export type PurchaseVarianceBasis =
  /** actual ≈ purchases in period (no stock count). Approximate. */
  | "PURCHASES_ONLY"
  /** actual = opening stock + purchases - closing stock. */
  | "PURCHASES_WITH_INVENTORY";

export type PurchaseVarianceResult =
  | {
      status: "COMPLETED";
      basis: PurchaseVarianceBasis;
      theoreticalCost: number;
      purchasesTotal: number;
      openingInventory: number | null;
      closingInventory: number | null;
      actualCost: number;
      varianceAmt: number;
      /** varianceAmt / theoreticalCost. Null when theoretical is 0. */
      varianceRate: number | null;
    }
  | {
      status: "INSUFFICIENT_DATA";
      insufficientReason: "NO_SALES" | "NO_PURCHASES";
    };

/**
 * Store-level theoretical vs actual food cost without per-ingredient counts.
 * Uses only recorded purchases; inventory values are applied only when both
 * opening and closing are given (never half-applied, never estimated).
 */
export function calculatePurchaseVariance(input: {
  hasSales: boolean;
  theoreticalCost: number;
  purchaseCount: number;
  purchasesTotal: number;
  openingInventory?: number | null;
  closingInventory?: number | null;
}): PurchaseVarianceResult {
  if (!input.hasSales) {
    return { status: "INSUFFICIENT_DATA", insufficientReason: "NO_SALES" };
  }

  if (input.purchaseCount === 0) {
    return { status: "INSUFFICIENT_DATA", insufficientReason: "NO_PURCHASES" };
  }

  assertNonNegative(input.theoreticalCost, "theoreticalCost");
  assertNonNegative(input.purchasesTotal, "purchasesTotal");

  const opening = input.openingInventory ?? null;
  const closing = input.closingInventory ?? null;
  const withInventory = opening !== null && closing !== null;

  if (withInventory) {
    assertNonNegative(opening, "openingInventory");
    assertNonNegative(closing, "closingInventory");
  }

  const actualCost = roundMoney(
    withInventory ? opening + input.purchasesTotal - closing : input.purchasesTotal,
  );

  const theoreticalCost = roundMoney(input.theoreticalCost);
  const varianceAmt = roundMoney(actualCost - theoreticalCost);

  return {
    status: "COMPLETED",
    basis: withInventory ? "PURCHASES_WITH_INVENTORY" : "PURCHASES_ONLY",
    theoreticalCost,
    purchasesTotal: roundMoney(input.purchasesTotal),
    openingInventory: withInventory ? opening : null,
    closingInventory: withInventory ? closing : null,
    actualCost,
    varianceAmt,
    varianceRate: theoreticalCost > 0 ? roundRate(varianceAmt / theoreticalCost) : null,
  };
}

export type CountPriority = {
  ingredientId: string;
  theoAmt: number;
  share: number;
  cumulativeShare: number;
};

/**
 * Which ingredients to stock-count first: sorted by theoretical cost, cut once
 * cumulative share reaches `targetShare` (default 80%), capped at `maxItems`.
 */
export function rankCountPriorities(
  theoAmtByIngredient: Map<string, number>,
  options: { targetShare?: number; maxItems?: number } = {},
): CountPriority[] {
  const targetShare = options.targetShare ?? 0.8;
  const maxItems = options.maxItems ?? 5;

  const entries = [...theoAmtByIngredient.entries()]
    .filter(([, amt]) => amt > 0)
    .sort((a, b) => b[1] - a[1]);

  const total = entries.reduce((sum, [, amt]) => sum + amt, 0);

  if (total === 0) return [];

  const out: CountPriority[] = [];
  let cumulative = 0;

  for (const [ingredientId, amt] of entries) {
    if (out.length >= maxItems) break;

    cumulative += amt;

    out.push({
      ingredientId,
      theoAmt: roundMoney(amt),
      share: roundRate(amt / total),
      cumulativeShare: roundRate(cumulative / total),
    });

    if (cumulative / total >= targetShare) break;
  }

  return out;
}
