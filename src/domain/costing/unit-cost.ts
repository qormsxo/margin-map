import {
  assertNonNegative,
  assertPositive,
  roundUnitCost,
} from "./money";
import { type BaseUnit, type PurchaseUnit, toBaseUnitQty } from "./units";

export type UnitCostFromPurchase = {
  purchaseQtyInBase: number;
  unitCost: number;
};

/**
 * unitCost = purchasePrice / purchaseQtyInBaseUnit
 */
export function calculateUnitCost(
  purchasePrice: number,
  purchaseQtyInBaseUnit: number,
): number {
  assertNonNegative(purchasePrice, "purchasePrice");
  assertPositive(purchaseQtyInBaseUnit, "purchaseQty");

  return roundUnitCost(purchasePrice / purchaseQtyInBaseUnit);
}

/**
 * Accept purchase in KG/L/etc., convert to baseUnit, then compute unit cost.
 */
export function calculateUnitCostFromPurchase(input: {
  purchasePrice: number;
  purchaseQty: number;
  purchaseUnit: PurchaseUnit;
  baseUnit: BaseUnit;
}): UnitCostFromPurchase {
  const purchaseQtyInBase = toBaseUnitQty(
    input.purchaseQty,
    input.purchaseUnit,
    input.baseUnit,
  );

  const result: UnitCostFromPurchase = {
    purchaseQtyInBase,
    unitCost: calculateUnitCost(input.purchasePrice, purchaseQtyInBase),
  };

  return result;
}
