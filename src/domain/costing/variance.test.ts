import { describe, expect, it } from "vitest";
import {
  calculateVarianceRun,
  summarizeVariancePeriod,
} from "@/domain";

describe("calculateVarianceRun (DF-A)", () => {
  const onionLine = {
    ingredientId: "onion",
    theoQty: 5000,
    unitCost: 2.5,
    actual: { kind: "QTY" as const, actualQty: 5800 },
  };

  it("G5: no actual usage → INSUFFICIENT_DATA", () => {
    const result = calculateVarianceRun({
      hasSales: true,
      hasActualUsage: false,
      hasRecipes: true,
      lines: [onionLine],
    });

    expect(result.status).toBe("INSUFFICIENT_DATA");

    if (result.status === "INSUFFICIENT_DATA") {
      expect(result.insufficientReason).toBe("NO_ACTUAL_USAGE");
      expect(result.results).toEqual([]);
    }
  });

  it("no sales → INSUFFICIENT_DATA", () => {
    const result = calculateVarianceRun({
      hasSales: false,
      hasActualUsage: true,
      hasRecipes: true,
      lines: [onionLine],
    });

    expect(result.status).toBe("INSUFFICIENT_DATA");

    if (result.status === "INSUFFICIENT_DATA") {
      expect(result.insufficientReason).toBe("NO_SALES");
    }
  });

  it("no recipes → INSUFFICIENT_DATA", () => {
    const result = calculateVarianceRun({
      hasSales: true,
      hasActualUsage: true,
      hasRecipes: false,
      lines: [],
    });

    expect(result.status).toBe("INSUFFICIENT_DATA");

    if (result.status === "INSUFFICIENT_DATA") {
      expect(result.insufficientReason).toBe("NO_RECIPES");
    }
  });

  it("qty actual: varianceQty/Amt/Rate (docs example)", () => {
    const result = calculateVarianceRun({
      hasSales: true,
      hasActualUsage: true,
      hasRecipes: true,
      lines: [onionLine],
    });

    expect(result.status).toBe("COMPLETED");

    if (result.status !== "COMPLETED") return;

    const row = result.results[0]!;
    expect(row.varianceQty).toBe(800);
    expect(row.varianceAmt).toBe(2000);
    expect(row.varianceRate).toBeCloseTo(0.16, 4);
    expect(row.status).toBe("COMPARED");
  });

  it("cost actual: varianceAmt = actualCost - theoAmt", () => {
    const result = calculateVarianceRun({
      hasSales: true,
      hasActualUsage: true,
      hasRecipes: true,
      lines: [
        {
          ingredientId: "onion",
          theoQty: 5000,
          unitCost: 2.5,
          actual: { kind: "COST", actualCost: 14000 },
        },
      ],
    });

    expect(result.status).toBe("COMPLETED");

    if (result.status !== "COMPLETED") return;

    const row = result.results[0]!;
    expect(row.theoAmt).toBe(12500);
    expect(row.varianceAmt).toBe(1500);
    expect(row.varianceQty).toBeNull();
  });

  it("partial actual: missing stays without invented variance", () => {
    const result = calculateVarianceRun({
      hasSales: true,
      hasActualUsage: true,
      hasRecipes: true,
      lines: [
        onionLine,
        {
          ingredientId: "chili",
          theoQty: 100,
          unitCost: 12,
          actual: null,
        },
      ],
    });

    expect(result.status).toBe("COMPLETED");

    if (result.status !== "COMPLETED") return;

    const chili = result.results.find((r) => r.ingredientId === "chili")!;
    expect(chili.status).toBe("MISSING_ACTUAL");
    expect(chili.varianceAmt).toBeNull();
    expect(chili.theoAmt).toBe(1200);
  });

  it("theoAmt=0 → varianceRate null", () => {
    const result = calculateVarianceRun({
      hasSales: true,
      hasActualUsage: true,
      hasRecipes: true,
      lines: [
        {
          ingredientId: "x",
          theoQty: 0,
          unitCost: 2.5,
          actual: { kind: "QTY", actualQty: 10 },
        },
      ],
    });

    expect(result.status).toBe("COMPLETED");

    if (result.status !== "COMPLETED") return;

    expect(result.results[0]!.varianceRate).toBeNull();
  });
});

describe("summarizeVariancePeriod", () => {
  it("aggregates compared lines only into variance total", () => {
    const summary = summarizeVariancePeriod([
      {
        ingredientId: "onion",
        theoQty: 5000,
        theoAmt: 12500,
        actualQty: 5800,
        actualCost: null,
        actualAmt: 14500,
        varianceQty: 800,
        varianceAmt: 2000,
        varianceRate: 0.16,
        unitCostUsed: 2.5,
        status: "COMPARED",
      },
      {
        ingredientId: "chili",
        theoQty: 100,
        theoAmt: 1200,
        actualQty: null,
        actualCost: null,
        actualAmt: null,
        varianceQty: null,
        varianceAmt: null,
        varianceRate: null,
        unitCostUsed: 12,
        status: "MISSING_ACTUAL",
      },
    ]);

    expect(summary.comparedCount).toBe(1);
    expect(summary.missingActualCount).toBe(1);
    expect(summary.totalTheoAmt).toBe(13700);
    expect(summary.totalVarianceAmt).toBe(2000);
  });
});
