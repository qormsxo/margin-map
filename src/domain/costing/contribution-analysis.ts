import { assertNonNegative, roundMoney } from "./money";

export type ContributionSalesInput = {
  menuItemId: string;
  name: string;
  salesQty: number;
  contributionPerUnit: number;
};

export type ContributionQuadrant =
  | "HIGH_SALES_LOW_CONTRIB"
  | "LOW_SALES_HIGH_CONTRIB"
  | "HIGH_SALES_HIGH_CONTRIB"
  | "LOW_SALES_LOW_CONTRIB"
  /** Too few menus to compare, or too close to the median to call either way. */
  | "BALANCED";

/** A median split needs something to split: fewer menus than this are never labelled. */
export const MIN_MENUS_FOR_QUADRANT = 3;

/** A menu counts as high/low only when it is at least this far (relative) from the median. */
export const QUADRANT_TOLERANCE = 0.1;

export type ContributionSalesRow = {
  menuItemId: string;
  name: string;
  salesQty: number;
  contributionPerUnit: number;
  totalContribution: number;
  quadrant: ContributionQuadrant;
};

export type ContributionAnalysisResult =
  | {
      status: "COMPLETED";
      menus: ContributionSalesRow[];
      medians: { salesQty: number; contributionPerUnit: number };
    }
  | {
      status: "INSUFFICIENT_DATA";
      reason: "NO_SALES";
      menus: [];
    };

function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }

  return sorted[mid]!;
}

function side(value: number, median: number): "HIGH" | "LOW" | "MID" {
  const margin = Math.abs(median) * QUADRANT_TOLERANCE;

  if (value > median + margin) return "HIGH";

  if (value < median - margin) return "LOW";

  return "MID";
}

function classifyQuadrant(
  salesQty: number,
  contributionPerUnit: number,
  salesMedian: number,
  contribMedian: number,
): ContributionQuadrant {
  const sales = side(salesQty, salesMedian);
  const contrib = side(contributionPerUnit, contribMedian);

  if (sales === "MID" || contrib === "MID") return "BALANCED";

  if (sales === "HIGH") return contrib === "HIGH" ? "HIGH_SALES_HIGH_CONTRIB" : "HIGH_SALES_LOW_CONTRIB";

  return contrib === "HIGH" ? "LOW_SALES_HIGH_CONTRIB" : "LOW_SALES_LOW_CONTRIB";
}

/**
 * Combine unit contribution with entered sales qty (DF-C).
 * Never invents sales — empty input → INSUFFICIENT_DATA.
 */
export function analyzeContributionBySales(
  rows: ContributionSalesInput[],
): ContributionAnalysisResult {
  if (rows.length === 0) {
    return { status: "INSUFFICIENT_DATA", reason: "NO_SALES", menus: [] };
  }

  const salesMedian = median(rows.map((r) => r.salesQty));
  const contribMedian = median(rows.map((r) => r.contributionPerUnit));

  const menus = rows.map((row) => {
    assertNonNegative(row.salesQty, "salesQty");

    const totalContribution = roundMoney(
      row.contributionPerUnit * row.salesQty,
    );

    return {
      menuItemId: row.menuItemId,
      name: row.name,
      salesQty: row.salesQty,
      contributionPerUnit: roundMoney(row.contributionPerUnit),
      totalContribution,
      quadrant:
        rows.length < MIN_MENUS_FOR_QUADRANT
          ? ("BALANCED" as const)
          : classifyQuadrant(row.salesQty, row.contributionPerUnit, salesMedian, contribMedian),
    };
  });

  menus.sort((a, b) => b.totalContribution - a.totalContribution);

  return {
    status: "COMPLETED",
    menus,
    medians: {
      salesQty: salesMedian,
      contributionPerUnit: contribMedian,
    },
  };
}
