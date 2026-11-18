import { assertNonNegative, roundMoney, roundRate } from "./money";

export type VarianceInsufficientReason =
  | "NO_SALES"
  | "NO_ACTUAL_USAGE"
  | "NO_RECIPES";

export type ActualUsageInput =
  | { kind: "QTY"; actualQty: number }
  | { kind: "COST"; actualCost: number };

export type VarianceLineInput = {
  ingredientId: string;
  theoQty: number;
  unitCost: number;
  actual: ActualUsageInput | null;
};

export type VarianceLineResult = {
  ingredientId: string;
  theoQty: number;
  theoAmt: number;
  actualQty: number | null;
  actualCost: number | null;
  actualAmt: number | null;
  varianceQty: number | null;
  varianceAmt: number | null;
  varianceRate: number | null;
  unitCostUsed: number;
  status: "COMPARED" | "MISSING_ACTUAL";
};

export type VarianceRunResult =
  | {
      status: "COMPLETED";
      results: VarianceLineResult[];
    }
  | {
      status: "INSUFFICIENT_DATA";
      insufficientReason: VarianceInsufficientReason;
      results: [];
    };

/**
 * Compare theoretical vs actual usage. Never invents actuals.
 * Only lines with actual input get variance numbers; others stay MISSING_ACTUAL.
 */
export function calculateVarianceRun(input: {
  hasSales: boolean;
  hasActualUsage: boolean;
  hasRecipes: boolean;
  lines: VarianceLineInput[];
}): VarianceRunResult {
  if (!input.hasRecipes) {
    return {
      status: "INSUFFICIENT_DATA",
      insufficientReason: "NO_RECIPES",
      results: [],
    };
  }

  if (!input.hasSales) {
    return {
      status: "INSUFFICIENT_DATA",
      insufficientReason: "NO_SALES",
      results: [],
    };
  }

  if (!input.hasActualUsage) {
    return {
      status: "INSUFFICIENT_DATA",
      insufficientReason: "NO_ACTUAL_USAGE",
      results: [],
    };
  }

  const results = input.lines.map(compareLine);

  return { status: "COMPLETED", results };
}

function compareLine(line: VarianceLineInput): VarianceLineResult {
  assertNonNegative(line.theoQty, "theoQty");
  assertNonNegative(line.unitCost, "unitCost");

  const theoAmt = roundMoney(line.theoQty * line.unitCost);

  if (line.actual === null) {
    return {
      ingredientId: line.ingredientId,
      theoQty: line.theoQty,
      theoAmt,
      actualQty: null,
      actualCost: null,
      actualAmt: null,
      varianceQty: null,
      varianceAmt: null,
      varianceRate: null,
      unitCostUsed: line.unitCost,
      status: "MISSING_ACTUAL",
    };
  }

  if (line.actual.kind === "QTY") {
    assertNonNegative(line.actual.actualQty, "actualQty");
    const varianceQty = line.actual.actualQty - line.theoQty;
    const varianceAmt = roundMoney(varianceQty * line.unitCost);
    const actualAmt = roundMoney(line.actual.actualQty * line.unitCost);

    return {
      ingredientId: line.ingredientId,
      theoQty: line.theoQty,
      theoAmt,
      actualQty: line.actual.actualQty,
      actualCost: null,
      actualAmt,
      varianceQty,
      varianceAmt,
      varianceRate: rateOrNull(varianceAmt, theoAmt),
      unitCostUsed: line.unitCost,
      status: "COMPARED",
    };
  }

  assertNonNegative(line.actual.actualCost, "actualCost");
  const varianceAmt = roundMoney(line.actual.actualCost - theoAmt);

  return {
    ingredientId: line.ingredientId,
    theoQty: line.theoQty,
    theoAmt,
    actualQty: null,
    actualCost: line.actual.actualCost,
    actualAmt: line.actual.actualCost,
    varianceQty: null,
    varianceAmt,
    varianceRate: rateOrNull(varianceAmt, theoAmt),
    unitCostUsed: line.unitCost,
    status: "COMPARED",
  };
}

function rateOrNull(varianceAmt: number, theoAmt: number): number | null {
  if (theoAmt === 0) return null;

  return roundRate(varianceAmt / theoAmt);
}

export type VariancePeriodSummary = {
  comparedCount: number;
  missingActualCount: number;
  totalTheoAmt: number;
  totalVarianceAmt: number;
  overallVarianceRate: number | null;
};

/** Aggregate completed period totals for trend charts. */
export function summarizeVariancePeriod(
  results: VarianceLineResult[],
): VariancePeriodSummary {
  let comparedCount = 0;
  let missingActualCount = 0;
  let totalTheoAmt = 0;
  let totalVarianceAmt = 0;

  for (const row of results) {
    totalTheoAmt += row.theoAmt;

    if (row.status === "MISSING_ACTUAL") {
      missingActualCount += 1;
      continue;
    }

    comparedCount += 1;

    if (row.varianceAmt !== null) {
      totalVarianceAmt += row.varianceAmt;
    }
  }

  const summary: VariancePeriodSummary = {
    comparedCount,
    missingActualCount,
    totalTheoAmt: roundMoney(totalTheoAmt),
    totalVarianceAmt: roundMoney(totalVarianceAmt),
    overallVarianceRate: rateOrNull(totalVarianceAmt, totalTheoAmt),
  };

  return summary;
}
