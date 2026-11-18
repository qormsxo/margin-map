import { describe, expect, it } from "vitest";
import {
  DomainError,
  calculateOperatingProfit,
  calculatePurchaseVariance,
  effectiveUnitCost,
  inclusiveDays,
  prorateMonthlyCost,
  rankCountPriorities,
  rawQtyFromUsable,
} from "@/domain";

describe("trim yield", () => {
  it("raises cost per usable unit", () => {
    // onion 2.5원/g, 85% usable → 2.941176원/usable g
    expect(effectiveUnitCost(2.5, 0.85)).toBe(2.941176);
  });

  it("yield 1 keeps the purchase unit cost", () => {
    expect(effectiveUnitCost(2.5, 1)).toBe(2.5);
  });

  it("converts usable qty back to raw purchased qty", () => {
    expect(rawQtyFromUsable(850, 0.85)).toBeCloseTo(1000, 9);
  });

  it("rejects yield outside (0, 1]", () => {
    expect(() => effectiveUnitCost(1, 0)).toThrow(DomainError);
    expect(() => effectiveUnitCost(1, 1.2)).toThrow(DomainError);
  });
});

describe("operating profit (fixed costs)", () => {
  it("prorates monthly cost by days (365/12 per month)", () => {
    expect(prorateMonthlyCost(3_000_000, 365 / 12)).toBe(3_000_000);
    expect(prorateMonthlyCost(3_041_667, 7)).toBe(700_000);
  });

  it("recognizes whole calendar months", async () => {
    const { wholeMonths } = await import("@/domain");

    expect(wholeMonths(new Date(Date.UTC(2026, 9, 1)), new Date(Date.UTC(2026, 9, 31)))).toBe(1);
    expect(wholeMonths(new Date(Date.UTC(2026, 10, 1)), new Date(Date.UTC(2026, 10, 30)))).toBe(1);
    expect(wholeMonths(new Date(Date.UTC(2026, 9, 1)), new Date(Date.UTC(2026, 10, 30)))).toBe(2);
    expect(wholeMonths(new Date(Date.UTC(2026, 9, 1)), new Date(Date.UTC(2026, 9, 7)))).toBeNull();
    expect(wholeMonths(new Date(Date.UTC(2026, 9, 5)), new Date(Date.UTC(2026, 10, 4)))).toBeNull();
  });

  it("counts inclusive days", () => {
    const start = new Date(Date.UTC(2026, 10, 2));
    const end = new Date(Date.UTC(2026, 10, 8));
    expect(inclusiveDays(start, end)).toBe(7);
  });

  it("profit, break-even and safety margin", () => {
    const result = calculateOperatingProfit({
      revenue: 10_000_000,
      totalContribution: 4_000_000,
      fixedCosts: 3_000_000,
    });

    expect(result.operatingProfit).toBe(1_000_000);
    expect(result.contributionMarginRatio).toBe(0.4);
    expect(result.breakEvenRevenue).toBe(7_500_000);
    expect(result.safetyMarginRate).toBe(0.25);
  });

  it("loss when fixed costs exceed contribution", () => {
    const result = calculateOperatingProfit({
      revenue: 5_000_000,
      totalContribution: 2_000_000,
      fixedCosts: 3_000_000,
    });

    expect(result.operatingProfit).toBe(-1_000_000);
    expect(result.breakEvenRevenue).toBe(7_500_000);
    expect(result.safetyMarginRate).toBe(-0.5);
  });

  it("no break-even when contribution is not positive", () => {
    const result = calculateOperatingProfit({
      revenue: 1_000_000,
      totalContribution: -10_000,
      fixedCosts: 500_000,
    });

    expect(result.breakEvenRevenue).toBeNull();
    expect(result.safetyMarginRate).toBeNull();
  });
});

describe("purchase-based variance", () => {
  it("insufficient without sales or purchases", () => {
    expect(
      calculatePurchaseVariance({
        hasSales: false,
        theoreticalCost: 0,
        purchaseCount: 3,
        purchasesTotal: 100,
      }),
    ).toEqual({ status: "INSUFFICIENT_DATA", insufficientReason: "NO_SALES" });

    expect(
      calculatePurchaseVariance({
        hasSales: true,
        theoreticalCost: 100,
        purchaseCount: 0,
        purchasesTotal: 0,
      }),
    ).toEqual({ status: "INSUFFICIENT_DATA", insufficientReason: "NO_PURCHASES" });
  });

  it("purchases only (approximate)", () => {
    const result = calculatePurchaseVariance({
      hasSales: true,
      theoreticalCost: 3_120_000,
      purchaseCount: 12,
      purchasesTotal: 3_580_000,
    });

    expect(result).toMatchObject({
      status: "COMPLETED",
      basis: "PURCHASES_ONLY",
      actualCost: 3_580_000,
      varianceAmt: 460_000,
      varianceRate: 0.1474,
    });
  });

  it("applies inventory only when both opening and closing are given", () => {
    const half = calculatePurchaseVariance({
      hasSales: true,
      theoreticalCost: 1_000_000,
      purchaseCount: 1,
      purchasesTotal: 1_100_000,
      openingInventory: 300_000,
      closingInventory: null,
    });

    expect(half).toMatchObject({ basis: "PURCHASES_ONLY", actualCost: 1_100_000 });

    const full = calculatePurchaseVariance({
      hasSales: true,
      theoreticalCost: 1_000_000,
      purchaseCount: 1,
      purchasesTotal: 1_100_000,
      openingInventory: 300_000,
      closingInventory: 350_000,
    });

    expect(full).toMatchObject({
      basis: "PURCHASES_WITH_INVENTORY",
      actualCost: 1_050_000,
      varianceAmt: 50_000,
      varianceRate: 0.05,
    });
  });
});

describe("count priorities", () => {
  it("picks top items until 80% of theoretical cost", () => {
    const result = rankCountPriorities(
      new Map([
        ["pork", 500],
        ["cheese", 300],
        ["onion", 100],
        ["salt", 50],
        ["sauce", 50],
      ]),
    );

    expect(result.map((r) => r.ingredientId)).toEqual(["pork", "cheese"]);
    expect(result[1]!.cumulativeShare).toBe(0.8);
  });

  it("caps at maxItems and ignores zero cost", () => {
    const result = rankCountPriorities(
      new Map([
        ["a", 10],
        ["b", 10],
        ["c", 10],
        ["d", 0],
      ]),
      { maxItems: 2 },
    );

    expect(result.map((r) => r.ingredientId)).toEqual(["a", "b"]);
  });
});

describe("channel delivery cost per order", () => {
  it("charges delivery once per order, not per item", async () => {
    const { orderDeliveryCost } = await import("@/domain");

    // 380 chickens + 260 colas in 380 orders → 380 deliveries, not 640
    expect(orderDeliveryCost(380, 2900)).toBe(1_102_000);
  });

  it("allocates channel cost to menus by revenue share", async () => {
    const { allocateByRevenue } = await import("@/domain");

    const out = allocateByRevenue(
      1000,
      new Map([
        ["chicken", 7600],
        ["cola", 400],
      ]),
    );

    expect(out.get("chicken")).toBe(950);
    expect(out.get("cola")).toBe(50);
  });

  it("allocates nothing when there is no revenue", async () => {
    const { allocateByRevenue } = await import("@/domain");

    expect(allocateByRevenue(500, new Map([["a", 0]])).get("a")).toBe(0);
  });
});
