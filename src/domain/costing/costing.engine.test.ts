import { describe, expect, it } from "vitest";
import {
  calculateChannelCost,
  calculateChannelCostBreakdown,
  calculateContribution,
  calculateContributionMargin,
  calculateMenuIngredientCost,
  calculateMenuProfitability,
  calculatePrepUnitCost,
  calculateRequiredSellingPrice,
  calculateUnitCost,
  calculateUnitCostFromPurchase,
  calculateVariableCost,
  convertQuantity,
  DomainError,
} from "@/domain";
import type { IngredientRef, PrepRef, RecipeLineInput } from "@/domain";

describe("unit cost (G1)", () => {
  it("computes purchasePrice / qty", () => {
    expect(calculateUnitCost(25000, 10000)).toBe(2.5);
  });

  it("converts KG purchase to G base", () => {
    const result = calculateUnitCostFromPurchase({
      purchasePrice: 25000,
      purchaseQty: 10,
      purchaseUnit: "KG",
      baseUnit: "G",
    });

    expect(result.purchaseQtyInBase).toBe(10000);
    expect(result.unitCost).toBe(2.5);
  });
});

describe("unit conversion", () => {
  it("converts L to ML", () => {
    expect(convertQuantity(2, "L", "ML")).toBe(2000);
  });

  it("rejects cross-family conversion", () => {
    expect(() => convertQuantity(1, "KG", "ML")).toThrow(DomainError);
  });

  it("rejects incompatible purchase unit vs baseUnit", () => {
    expect(() =>
      calculateUnitCostFromPurchase({
        purchasePrice: 1000,
        purchaseQty: 1,
        purchaseUnit: "L",
        baseUnit: "G",
      }),
    ).toThrow(DomainError);
  });
});

describe("prep + menu ingredient cost (G2/G3)", () => {
  const ingredients = new Map<string, IngredientRef>([
    ["chili", { id: "chili", unitCost: 12, baseUnit: "G" }],
    ["syrup", { id: "syrup", unitCost: 3, baseUnit: "G" }],
    ["riceCake", { id: "riceCake", unitCost: 4, baseUnit: "G" }],
    ["onion", { id: "onion", unitCost: 2.5, baseUnit: "G" }],
  ]);

  const sauce: PrepRef = {
    id: "sauce",
    yieldQty: 93,
    yieldUnit: "G",
    lines: [
      { componentType: "INGREDIENT", ingredientId: "chili", qty: 8, unit: "G" },
      { componentType: "INGREDIENT", ingredientId: "syrup", qty: 15, unit: "G" },
    ],
  };

  const preps = new Map<string, PrepRef>([["sauce", sauce]]);

  it("computes prep unit cost ≈ 1.516129", () => {
    const unit = calculatePrepUnitCost(sauce, ingredients, preps);
    expect(unit).toBeCloseTo(141 / 93, 6);
  });

  it("computes menu theoretical ingredient cost ≈ 827", () => {
    const lines: RecipeLineInput[] = [
      { componentType: "INGREDIENT", ingredientId: "riceCake", qty: 150, unit: "G" },
      { componentType: "PREP", componentPrepId: "sauce", qty: 100, unit: "G" },
      { componentType: "INGREDIENT", ingredientId: "onion", qty: 30, unit: "G" },
    ];

    const { totalCost } = calculateMenuIngredientCost(lines, ingredients, preps);
    // 600 + 100*(141/93) + 75 ≈ 826.129 → roundMoney 826
    expect(totalCost).toBe(roundExpectation(600 + (100 * 141) / 93 + 75));
  });

  it("detects prep cycles", () => {
    const a: PrepRef = {
      id: "a",
      yieldQty: 1,
      yieldUnit: "G",
      lines: [{ componentType: "PREP", componentPrepId: "b", qty: 1, unit: "G" }],
    };

    const b: PrepRef = {
      id: "b",
      yieldQty: 1,
      yieldUnit: "G",
      lines: [{ componentType: "PREP", componentPrepId: "a", qty: 1, unit: "G" }],
    };

    const map = new Map([
      ["a", a],
      ["b", b],
    ]);

    expect(() => calculatePrepUnitCost(a, ingredients, map)).toThrow(DomainError);
  });
});

function roundExpectation(value: number) {
  return Math.round(value + Number.EPSILON);
}

describe("fees and contribution (G3)", () => {
  const fees = {
    channelFeeRate: 0.06,
    paymentFeeRate: 0.03,
    deliveryFeeRate: 0,
    deliveryFeeFixed: 0,
  };

  it("applies each fee once (no double counting)", () => {
    const breakdown = calculateChannelCostBreakdown(9000, fees);
    expect(breakdown.channelFeeAmount).toBe(540);
    expect(breakdown.paymentFeeAmount).toBe(270);
    expect(breakdown.channelCost).toBe(810);
    // Sum of parts equals total — proves single application
    expect(
      breakdown.channelFeeAmount +
        breakdown.paymentFeeAmount +
        breakdown.deliveryRateAmount +
        breakdown.deliveryFeeFixed,
    ).toBe(breakdown.channelCost);
  });

  it("includes restaurant-borne delivery fixed cost once", () => {
    const withDelivery = calculateChannelCost(10000, {
      ...fees,
      deliveryFeeRate: 0.02,
      deliveryFeeFixed: 500,
    });

    // 10000*(0.06+0.03+0.02)+500 = 1100+500 = 1600
    expect(withDelivery).toBe(1600);
  });

  it("computes contribution and margin", () => {
    const channelCost = 810;
    const ingredientCost = 827;
    const contribution = calculateContribution(9000, ingredientCost, channelCost);
    expect(contribution).toBe(7363);
    expect(calculateContributionMargin(contribution, 9000)).toBeCloseTo(0.8181, 4);
    expect(calculateVariableCost(ingredientCost, channelCost)).toBe(1637);
  });

  it("shows contribution loss when variable cost exceeds price", () => {
    const contribution = calculateContribution(1000, 800, 400);
    expect(contribution).toBe(-200);
    expect(calculateContributionMargin(contribution, 1000)).toBe(-0.2);
  });
});

describe("invalid inputs", () => {
  it("rejects negative purchase price", () => {
    expect(() => calculateUnitCost(-1, 10)).toThrow(DomainError);
  });

  it("rejects zero purchase qty", () => {
    expect(() => calculateUnitCost(100, 0)).toThrow(DomainError);
  });

  it("rejects fee rate > 1", () => {
    expect(() =>
      calculateChannelCost(1000, {
        channelFeeRate: 1.2,
        paymentFeeRate: 0,
        deliveryFeeRate: 0,
        deliveryFeeFixed: 0,
      }),
    ).toThrow(DomainError);
  });

  it("returns null margin when selling price is 0", () => {
    expect(calculateContributionMargin(0, 0)).toBeNull();
  });
});

describe("decimal precision", () => {
  it("rounds unit cost to 6 dp", () => {
    // 10/3 = 3.333333...
    expect(calculateUnitCost(10, 3)).toBe(3.333333);
  });

  it("rounds required price to whole KRW", () => {
    const price = calculateRequiredSellingPrice({
      ingredientCost: 827,
      targetContributionMargin: 0.7,
      fees: {
        channelFeeRate: 0.06,
        paymentFeeRate: 0.03,
        deliveryFeeRate: 0,
        deliveryFeeFixed: 0,
      },
    });

    expect(price).toBe(3938);
    expect(Number.isInteger(price)).toBe(true);
  });
});

describe("target contribution margin → required price", () => {
  it("matches formula example", () => {
    expect(
      calculateRequiredSellingPrice({
        ingredientCost: 827,
        targetContributionMargin: 0.7,
        fees: {
          channelFeeRate: 0.06,
          paymentFeeRate: 0.03,
          deliveryFeeRate: 0,
          deliveryFeeFixed: 0,
        },
      }),
    ).toBe(3938);
  });

  it("rejects infeasible target when 1-r-t <= 0", () => {
    expect(() =>
      calculateRequiredSellingPrice({
        ingredientCost: 827,
        targetContributionMargin: 0.95,
        fees: {
          channelFeeRate: 0.06,
          paymentFeeRate: 0.03,
          deliveryFeeRate: 0,
          deliveryFeeFixed: 0,
        },
      }),
    ).toThrow(DomainError);
  });
});

describe("full menu profitability", () => {
  it("returns CONTRIBUTION metric (never net profit)", () => {
    const ingredients = new Map<string, IngredientRef>([
      ["onion", { id: "onion", unitCost: 2.5, baseUnit: "G" }],
    ]);

    const result = calculateMenuProfitability({
      sellingPrice: 5000,
      lines: [
        { componentType: "INGREDIENT", ingredientId: "onion", qty: 100, unit: "G" },
      ],
      ingredients,
      preps: new Map(),
      fees: {
        channelFeeRate: 0.05,
        paymentFeeRate: 0.02,
        deliveryFeeRate: 0,
        deliveryFeeFixed: 0,
      },
    });

    expect(result.metricType).toBe("CONTRIBUTION");
    expect(result.ingredientCost).toBe(250);
    expect(result.channelCost).toBe(350);
    expect(result.contribution).toBe(4400);
    expect(result).not.toHaveProperty("netProfit");
  });
});
