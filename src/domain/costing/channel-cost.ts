import {
  assertNonNegative,
  assertRate,
} from "./money";

export type ChannelFeesInput = {
  channelFeeRate: number;
  paymentFeeRate: number;
  deliveryFeeRate: number;
  deliveryFeeFixed: number;
};

export function validateChannelFees(fees: ChannelFeesInput): ChannelFeesInput {
  return {
    channelFeeRate: assertRate(fees.channelFeeRate, "channelFeeRate"),
    paymentFeeRate: assertRate(fees.paymentFeeRate, "paymentFeeRate"),
    deliveryFeeRate: assertRate(fees.deliveryFeeRate, "deliveryFeeRate"),
    deliveryFeeFixed: assertNonNegative(fees.deliveryFeeFixed, "deliveryFeeFixed"),
  };
}

/**
 * Fees applied once each — never double-count the same fee.
 * channelCost = P*(channel + payment + delivery rates) + deliveryFeeFixed
 */
export function calculateChannelCostBreakdown(
  sellingPrice: number,
  fees: ChannelFeesInput,
) {
  assertNonNegative(sellingPrice, "sellingPrice");
  const f = validateChannelFees(fees);
  const rateSum = f.channelFeeRate + f.paymentFeeRate + f.deliveryFeeRate;

  const paymentFeeAmount = sellingPrice * f.paymentFeeRate;
  const channelFeeAmount = sellingPrice * f.channelFeeRate;
  const deliveryRateAmount = sellingPrice * f.deliveryFeeRate;
  const deliveryFeeFixed = f.deliveryFeeFixed;

  const channelCost =
    paymentFeeAmount + channelFeeAmount + deliveryRateAmount + deliveryFeeFixed;

  return {
    paymentFeeAmount,
    channelFeeAmount,
    deliveryRateAmount,
    deliveryFeeFixed,
    channelCost,
    rateSum,
  };
}

export function calculateChannelCost(
  sellingPrice: number,
  fees: ChannelFeesInput,
): number {
  return calculateChannelCostBreakdown(sellingPrice, fees).channelCost;
}
