import { calculateContribution } from "./contribution";
import { assertNonNegative, roundMoney, roundRate } from "./money";
import { type ChannelFeesInput, calculateChannelCost } from "./channel-cost";

export type PriceImpactMenuInput = {
  menuItemId: string;
  name: string;
  sellingPrice: number;
  /** Expanded leaf usage of the changed ingredient (base unit). */
  usageQty: number;
  /** Full menu ingredient cost at previous unit cost of changed ingredient. */
  ingredientCostBefore: number;
  fees: ChannelFeesInput;
};

export type PriceImpactMenuResult = {
  menuItemId: string;
  name: string;
  usageQty: number;
  ingredientCostBefore: number;
  ingredientCostAfter: number;
  deltaCost: number;
  deltaCostRate: number | null;
  contributionBefore: number;
  contributionAfter: number;
  deltaContribution: number;
};

/**
 * Menu-level impact of one ingredient unit-cost change (DF-B / G4).
 * Selling price and fees are held constant.
 */
export function calculatePriceImpactMenus(input: {
  previousUnitCost: number;
  newUnitCost: number;
  menus: PriceImpactMenuInput[];
}): PriceImpactMenuResult[] {
  assertNonNegative(input.previousUnitCost, "previousUnitCost");
  assertNonNegative(input.newUnitCost, "newUnitCost");

  const deltaUnit = input.newUnitCost - input.previousUnitCost;
  const results: PriceImpactMenuResult[] = [];

  for (const menu of input.menus) {
    if (menu.usageQty <= 0) continue;

    assertNonNegative(menu.usageQty, "usageQty");
    assertNonNegative(menu.ingredientCostBefore, "ingredientCostBefore");
    assertNonNegative(menu.sellingPrice, "sellingPrice");

    const deltaCost = roundMoney(menu.usageQty * deltaUnit);

    const ingredientCostAfter = roundMoney(
      menu.ingredientCostBefore + deltaCost,
    );

    const channelCost = calculateChannelCost(menu.sellingPrice, menu.fees);

    const contributionBefore = calculateContribution(
      menu.sellingPrice,
      menu.ingredientCostBefore,
      channelCost,
    );

    const contributionAfter = calculateContribution(
      menu.sellingPrice,
      ingredientCostAfter,
      channelCost,
    );

    results.push({
      menuItemId: menu.menuItemId,
      name: menu.name,
      usageQty: menu.usageQty,
      ingredientCostBefore: roundMoney(menu.ingredientCostBefore),
      ingredientCostAfter,
      deltaCost,
      deltaCostRate:
        menu.ingredientCostBefore === 0
          ? null
          : roundRate(deltaCost / menu.ingredientCostBefore),
      contributionBefore,
      contributionAfter,
      deltaContribution: roundMoney(contributionAfter - contributionBefore),
    });
  }

  results.sort((a, b) => Math.abs(b.deltaCost) - Math.abs(a.deltaCost));

  return results;
}
