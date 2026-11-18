import {
  type ChannelFeesInput,
  calculateChannelCost,
  validateChannelFees,
} from "./channel-cost";
import { calculateContribution, calculateContributionMargin } from "./contribution";
import {
  calculateMenuIngredientCost,
  type IngredientRef,
  type PrepRef,
  type RecipeLineInput,
} from "./recipe-cost";
import { assertNonNegative, roundMoney } from "./money";
import { METRIC_TYPE_CONTRIBUTION } from "./rules";

export type SimulationMenuSnapshot = {
  sellingPrice: number;
  ingredientCost: number;
  channelCost: number;
  contribution: number;
  contributionMargin: number | null;
};

export type SimulationMenuCompare = {
  menuItemId: string;
  name: string;
  before: SimulationMenuSnapshot;
  after: SimulationMenuSnapshot;
};

export type SimulationOverrides = {
  menuPrices?: Record<string, number>;
  ingredientUnitCosts?: Record<string, number>;
  channelFees?: Partial<ChannelFeesInput>;
};

function snapshot(
  sellingPrice: number,
  ingredientCost: number,
  fees: ChannelFeesInput,
): SimulationMenuSnapshot {
  assertNonNegative(sellingPrice, "sellingPrice");
  assertNonNegative(ingredientCost, "ingredientCost");
  const channelCost = calculateChannelCost(sellingPrice, fees);

  const contribution = calculateContribution(
    sellingPrice,
    ingredientCost,
    channelCost,
  );

  return {
    sellingPrice: roundMoney(sellingPrice),
    ingredientCost: roundMoney(ingredientCost),
    channelCost: roundMoney(channelCost),
    contribution: roundMoney(contribution),
    contributionMargin: calculateContributionMargin(contribution, sellingPrice),
  };
}

/**
 * Pure before/after preview. Does not persist anything.
 */
export type SimulationPreviewResult = {
  persisted: false;
  metricType: typeof METRIC_TYPE_CONTRIBUTION;
  menus: SimulationMenuCompare[];
};

export function previewSimulation(input: {
  menus: Array<{
    menuItemId: string;
    name: string;
    sellingPrice: number;
    lines: RecipeLineInput[];
  }>;
  ingredients: Map<string, IngredientRef>;
  preps: Map<string, PrepRef>;
  fees: ChannelFeesInput;
  overrides: SimulationOverrides;
}): SimulationPreviewResult {
  const baseFees = validateChannelFees(input.fees);

  const afterFees = validateChannelFees({
    ...baseFees,
    ...input.overrides.channelFees,
  });

  const ingredientsAfter = new Map(input.ingredients);

  if (input.overrides.ingredientUnitCosts) {
    for (const [id, unitCost] of Object.entries(
      input.overrides.ingredientUnitCosts,
    )) {
      const current = ingredientsAfter.get(id);

      if (!current) continue;

      ingredientsAfter.set(id, { ...current, unitCost });
    }
  }

  const menus: SimulationMenuCompare[] = [];

  for (const menu of input.menus) {
    const beforeCost = calculateMenuIngredientCost(
      menu.lines,
      input.ingredients,
      input.preps,
    );

    const afterCost = calculateMenuIngredientCost(
      menu.lines,
      ingredientsAfter,
      input.preps,
    );

    const afterPrice =
      input.overrides.menuPrices?.[menu.menuItemId] ?? menu.sellingPrice;

    menus.push({
      menuItemId: menu.menuItemId,
      name: menu.name,
      before: snapshot(menu.sellingPrice, beforeCost.totalCost, baseFees),
      after: snapshot(afterPrice, afterCost.totalCost, afterFees),
    });
  }

  const result: SimulationPreviewResult = {
    persisted: false,
    metricType: METRIC_TYPE_CONTRIBUTION,
    menus,
  };

  return result;
}
