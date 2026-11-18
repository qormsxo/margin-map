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
  | "LOW_SALES_LOW_CONTRIB";

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

function classifyQuadrant(
  salesQty: number,
  contributionPerUnit: number,
  salesMedian: number,
  contribMedian: number,
): ContributionQuadrant {
  const highSales = salesQty >= salesMedian;
  const highContrib = contributionPerUnit >= contribMedian;

  if (highSales && !highContrib) return "HIGH_SALES_LOW_CONTRIB";

  if (!highSales && highContrib) return "LOW_SALES_HIGH_CONTRIB";

  if (highSales && highContrib) return "HIGH_SALES_HIGH_CONTRIB";

  return "LOW_SALES_LOW_CONTRIB";
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
      quadrant: classifyQuadrant(
        row.salesQty,
        row.contributionPerUnit,
        salesMedian,
        contribMedian,
      ),
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
