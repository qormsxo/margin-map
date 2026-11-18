import { describe, expect, it } from "vitest";
import {
  calculateRequiredSellingPrice,
  previewSimulation,
  type IngredientRef,
  type PrepRef,
  type RecipeLineInput,
} from "@/domain";

const fees = {
  channelFeeRate: 0.06,
  paymentFeeRate: 0.03,
  deliveryFeeRate: 0,
  deliveryFeeFixed: 0,
};

describe("previewSimulation (DF-D)", () => {
  const ingredients = new Map<string, IngredientRef>([
    ["onion", { id: "onion", unitCost: 2.5, baseUnit: "G" }],
    ["riceCake", { id: "riceCake", unitCost: 4, baseUnit: "G" }],
  ]);

  const preps = new Map<string, PrepRef>();

  const lines: RecipeLineInput[] = [
    {
      componentType: "INGREDIENT",
      ingredientId: "riceCake",
      qty: 150,
      unit: "G",
    },
    { componentType: "INGREDIENT", ingredientId: "onion", qty: 30, unit: "G" },
  ];

  it("does not persist and compares before/after price override", () => {
    const result = previewSimulation({
      menus: [
        {
          menuItemId: "m1",
          name: "떡볶이",
          sellingPrice: 9000,
          lines,
        },
      ],
      ingredients,
      preps,
      fees,
      overrides: { menuPrices: { m1: 9500 } },
    });

    expect(result.persisted).toBe(false);
    expect(result.menus[0]!.before.sellingPrice).toBe(9000);
    expect(result.menus[0]!.after.sellingPrice).toBe(9500);
    expect(result.menus[0]!.after.contribution).toBeGreaterThan(
      result.menus[0]!.before.contribution,
    );
  });

  it("applies ingredient unit cost override", () => {
    const result = previewSimulation({
      menus: [
        {
          menuItemId: "m1",
          name: "떡볶이",
          sellingPrice: 9000,
          lines,
        },
      ],
      ingredients,
      preps,
      fees,
      overrides: { ingredientUnitCosts: { onion: 3.0 } },
    });

    expect(result.menus[0]!.after.ingredientCost).toBe(
      result.menus[0]!.before.ingredientCost + 15,
    );
    expect(result.menus[0]!.after.contribution).toBe(
      result.menus[0]!.before.contribution - 15,
    );
  });

  it("applies channel fee override", () => {
    const result = previewSimulation({
      menus: [
        {
          menuItemId: "m1",
          name: "떡볶이",
          sellingPrice: 9000,
          lines,
        },
      ],
      ingredients,
      preps,
      fees,
      overrides: {
        channelFees: { channelFeeRate: 0.1, paymentFeeRate: 0.03 },
      },
    });

    expect(result.menus[0]!.after.channelCost).toBeGreaterThan(
      result.menus[0]!.before.channelCost,
    );
  });
});

describe("required selling price (already in engine)", () => {
  it("G3 target 70% → ~3938 when C=827", () => {
    expect(
      calculateRequiredSellingPrice({
        ingredientCost: 827,
        targetContributionMargin: 0.7,
        fees,
      }),
    ).toBe(3938);
  });
});
