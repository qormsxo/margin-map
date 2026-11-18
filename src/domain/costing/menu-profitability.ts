import { buildContributionResult } from "./contribution";
import type { ChannelFeesInput } from "./channel-cost";
import { calculateChannelCostBreakdown } from "./channel-cost";
import {
  calculateMenuIngredientCost,
  type IngredientRef,
  type PrepRef,
  type RecipeLineInput,
} from "./recipe-cost";
import { calculateRequiredSellingPrice } from "./contribution";
import { roundMoney } from "./money";
import { METRIC_TYPE_CONTRIBUTION } from "./rules";

export function calculateMenuProfitability(input: {
  sellingPrice: number;
  lines: RecipeLineInput[];
  ingredients: Map<string, IngredientRef>;
  preps: Map<string, PrepRef>;
  fees: ChannelFeesInput;
}) {
  const ingredient = calculateMenuIngredientCost(
    input.lines,
    input.ingredients,
    input.preps,
  );

  const fees = calculateChannelCostBreakdown(input.sellingPrice, input.fees);

  const contribution = buildContributionResult({
    sellingPrice: input.sellingPrice,
    ingredientCost: ingredient.totalCost,
    fees: input.fees,
  });

  return {
    ...contribution,
    ingredientCost: roundMoney(ingredient.totalCost),
    channelCost: roundMoney(fees.channelCost),
    variableCost: roundMoney(contribution.variableCost),
    contribution: roundMoney(contribution.contribution),
    feeBreakdown: {
      paymentFeeAmount: roundMoney(fees.paymentFeeAmount),
      channelFeeAmount: roundMoney(fees.channelFeeAmount),
      deliveryRateAmount: roundMoney(fees.deliveryRateAmount),
      deliveryFeeFixed: roundMoney(fees.deliveryFeeFixed),
    },
    lines: ingredient.lines.map((line) => ({
      ...line,
      lineCost: roundMoney(line.lineCost),
    })),
    costAsOf: "CURRENT_MASTER" as const,
    metricType: METRIC_TYPE_CONTRIBUTION,
  };
}

export function requiredPriceForMenu(input: {
  lines: RecipeLineInput[];
  ingredients: Map<string, IngredientRef>;
  preps: Map<string, PrepRef>;
  fees: ChannelFeesInput;
  targetContributionMargin: number;
}) {
  const { totalCost } = calculateMenuIngredientCost(
    input.lines,
    input.ingredients,
    input.preps,
  );

  const requiredSellingPrice = calculateRequiredSellingPrice({
    ingredientCost: totalCost,
    targetContributionMargin: input.targetContributionMargin,
    fees: input.fees,
  });

  return {
    metricType: METRIC_TYPE_CONTRIBUTION,
    ingredientCost: roundMoney(totalCost),
    targetContributionMargin: input.targetContributionMargin,
    requiredSellingPrice,
  };
}
