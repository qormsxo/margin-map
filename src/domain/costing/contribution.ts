import {
  assertNonNegative,
  assertRate,
  roundMoney,
} from "./money";
import {
  type ChannelFeesInput,
  calculateChannelCost,
  validateChannelFees,
} from "./channel-cost";
import { DomainError } from "./domain-error";
import { METRIC_TYPE_CONTRIBUTION } from "./rules";

/** 공헌이익 = 판매가 − 식재료원가 − 채널비용 (순이익 아님) */
export function calculateContribution(
  sellingPrice: number,
  ingredientCost: number,
  channelCost: number,
): number {
  assertNonNegative(sellingPrice, "sellingPrice");
  assertNonNegative(ingredientCost, "ingredientCost");
  assertNonNegative(channelCost, "channelCost");

  return sellingPrice - ingredientCost - channelCost;
}

export function calculateContributionMargin(
  contribution: number,
  sellingPrice: number,
): number | null {
  if (sellingPrice === 0) return null;
  assertNonNegative(sellingPrice, "sellingPrice");

  return contribution / sellingPrice;
}

/** 메뉴당 변동비용 = 식재료원가 + 채널·결제·배달 비용 */
export function calculateVariableCost(
  ingredientCost: number,
  channelCost: number,
): number {
  assertNonNegative(ingredientCost, "ingredientCost");
  assertNonNegative(channelCost, "channelCost");

  return ingredientCost + channelCost;
}

/**
 * P* = (ingredientCost + deliveryFeeFixed) / (1 - feeRates - targetCM)
 */
export function calculateRequiredSellingPrice(input: {
  ingredientCost: number;
  targetContributionMargin: number;
  fees: ChannelFeesInput;
}): number {
  assertNonNegative(input.ingredientCost, "ingredientCost");

  const t = assertRate(
    input.targetContributionMargin,
    "targetContributionMargin",
  );

  const f = validateChannelFees(input.fees);
  const r = f.channelFeeRate + f.paymentFeeRate + f.deliveryFeeRate;
  const denominator = 1 - r - t;

  if (denominator <= 0) {
    throw new DomainError(
      "INFEASIBLE_TARGET",
      `Infeasible target: 1 - feeRates(${r}) - target(${t}) must be > 0`,
    );
  }

  return roundMoney((input.ingredientCost + f.deliveryFeeFixed) / denominator);
}

export function buildContributionResult(input: {
  sellingPrice: number;
  ingredientCost: number;
  fees: ChannelFeesInput;
}) {
  const channelCost = calculateChannelCost(input.sellingPrice, input.fees);
  const variableCost = calculateVariableCost(input.ingredientCost, channelCost);

  const contribution = calculateContribution(
    input.sellingPrice,
    input.ingredientCost,
    channelCost,
  );

  const contributionMargin = calculateContributionMargin(
    contribution,
    input.sellingPrice,
  );

  return {
    metricType: METRIC_TYPE_CONTRIBUTION,
    sellingPrice: input.sellingPrice,
    ingredientCost: input.ingredientCost,
    channelCost,
    variableCost,
    contribution,
    contributionMargin,
  };
}
