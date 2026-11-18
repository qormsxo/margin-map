import { assertNonNegative } from "./money";

/**
 * Per-order delivery fee for a channel and period.
 * The fee is charged once per order, so it must not be multiplied by item count
 * (a cola add-on does not cost a second delivery).
 */
export function orderDeliveryCost(orderCount: number, deliveryFeePerOrder: number): number {
  assertNonNegative(orderCount, "orderCount");
  assertNonNegative(deliveryFeePerOrder, "deliveryFeePerOrder");

  return orderCount * deliveryFeePerOrder;
}

/**
 * Split `total` across keys in proportion to their revenue.
 * Keys with zero revenue get 0. If all revenue is 0, nothing is allocated.
 */
export function allocateByRevenue(
  total: number,
  revenueByKey: Map<string, number>,
): Map<string, number> {
  assertNonNegative(total, "total");

  const sum = [...revenueByKey.values()].reduce((acc, v) => acc + v, 0);
  const out = new Map<string, number>();

  for (const [key, revenue] of revenueByKey) {
    assertNonNegative(revenue, "revenue");
    out.set(key, sum > 0 ? (total * revenue) / sum : 0);
  }

  return out;
}
