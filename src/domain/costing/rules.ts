/**
 * MarginMap costing rules (deterministic).
 *
 * Rounding:
 * - Internal math uses full IEEE floats; money persisted/displayed with roundMoney (0 decimals, KRW).
 * - Rates kept to RATE_PRECISION (4 dp) when normalizing; display % to 1 dp separately in UI.
 *
 * Unit conversion:
 * - MASS: kg ↔ g (1 kg = 1000 g)
 * - VOLUME: L ↔ ml (1 L = 1000 ml)
 * - COUNT: ea only
 * - Cross-family conversion is rejected.
 *
 * Fees (no double application):
 * - channelCost = P * (channelFeeRate + paymentFeeRate + deliveryFeeRate) + deliveryFeeFixed
 * - Each rate/fixed applied once. Do not also embed the same fee in sellingPrice adjustments.
 *
 * Contribution (공헌이익) ≠ net profit (순이익):
 * - contribution = P - ingredientCost - channelCost
 * - Excludes labor, rent, and other fixed overhead. Never label as 순이익.
 *
 * Trim yield (손질 수율): recipe qty = usable qty; cost per usable unit = unitCost / yieldRate
 *   (see yield.ts). Theoretical raw consumption = usable qty / yieldRate.
 * Labor / rent / fixed overhead: never allocated to menus. Store-level
 *   operatingProfit = Σ contribution − fixed costs (see operating-profit.ts).
 * Per-menu cook time / labor allocation: out of scope.
 */

export const MONEY_DECIMALS = 0;
export const RATE_PRECISION = 4;
export const UNIT_COST_PRECISION = 6;

export const METRIC_TYPE_CONTRIBUTION = "CONTRIBUTION" as const;
