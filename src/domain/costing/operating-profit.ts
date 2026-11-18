import { DomainError } from "./domain-error";
import { assertFiniteNumber, assertNonNegative, roundMoney, roundRate } from "./money";

/** Average days per month used to prorate monthly fixed costs (365 / 12). */
export const DAYS_PER_MONTH = 365 / 12;

/** Prorate a monthly fixed cost to a period of `periodDays` days. */
export function prorateMonthlyCost(monthlyAmount: number, periodDays: number): number {
  assertNonNegative(monthlyAmount, "monthlyAmount");
  assertFiniteNumber(periodDays, "periodDays");

  if (periodDays <= 0) {
    throw new DomainError("INVALID_INPUT", "periodDays must be > 0");
  }

  return roundMoney((monthlyAmount * periodDays) / DAYS_PER_MONTH);
}

/**
 * Number of whole calendar months if [start, end] is exactly 1st-of-month to
 * last-of-month (e.g. Oct 1–31 → 1, Oct 1–Nov 30 → 2); otherwise null.
 * A whole month should cost the full monthly amount, not a 30.4-day share.
 */
export function wholeMonths(start: Date, end: Date): number | null {
  const nextDay = new Date(end);

  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  if (start.getUTCDate() !== 1 || nextDay.getUTCDate() !== 1) return null;

  const months =
    (nextDay.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (nextDay.getUTCMonth() - start.getUTCMonth());

  return months > 0 ? months : null;
}

/** Inclusive day count between two UTC dates (date-only). */
export function inclusiveDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  const days = Math.round(ms / 86_400_000) + 1;

  if (days <= 0) {
    throw new DomainError("INVALID_INPUT", "period end must be >= start");
  }

  return days;
}

export type OperatingProfitResult = {
  revenue: number;
  totalContribution: number;
  fixedCosts: number;
  operatingProfit: number;
  /** totalContribution / revenue. Null when revenue is 0. */
  contributionMarginRatio: number | null;
  /** Revenue needed so that contribution covers fixed costs. Null when ratio <= 0. */
  breakEvenRevenue: number | null;
  /** (revenue - breakEven) / revenue. Null when break-even is undefined or revenue 0. */
  safetyMarginRate: number | null;
};

/**
 * Store-level profit: operating profit = total contribution - fixed costs.
 * Labor/rent are not allocated to menus; they are covered by contribution.
 * Break-even uses the actual sales mix of the period (no assumed mix).
 */
export function calculateOperatingProfit(input: {
  revenue: number;
  totalContribution: number;
  fixedCosts: number;
}): OperatingProfitResult {
  assertNonNegative(input.revenue, "revenue");
  assertFiniteNumber(input.totalContribution, "totalContribution");
  assertNonNegative(input.fixedCosts, "fixedCosts");

  const operatingProfit = roundMoney(input.totalContribution - input.fixedCosts);

  const contributionMarginRatio =
    input.revenue > 0 ? roundRate(input.totalContribution / input.revenue) : null;

  const breakEvenRevenue =
    contributionMarginRatio !== null && contributionMarginRatio > 0
      ? roundMoney(input.fixedCosts / (input.totalContribution / input.revenue))
      : null;

  const safetyMarginRate =
    breakEvenRevenue !== null && input.revenue > 0
      ? roundRate((input.revenue - breakEvenRevenue) / input.revenue)
      : null;

  return {
    revenue: roundMoney(input.revenue),
    totalContribution: roundMoney(input.totalContribution),
    fixedCosts: roundMoney(input.fixedCosts),
    operatingProfit,
    contributionMarginRatio,
    breakEvenRevenue,
    safetyMarginRate,
  };
}
