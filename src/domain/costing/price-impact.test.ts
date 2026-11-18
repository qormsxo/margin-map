import { describe, expect, it } from "vitest";
import { calculatePriceImpactMenus } from "@/domain";

const fees = {
  channelFeeRate: 0.06,
  paymentFeeRate: 0.03,
  deliveryFeeRate: 0,
  deliveryFeeFixed: 0,
};

describe("calculatePriceImpactMenus (DF-B / G4)", () => {
  it("G4: onion 30g +0.5 → deltaCost 15, contribution -15", () => {
    const menus = calculatePriceImpactMenus({
      previousUnitCost: 2.5,
      newUnitCost: 3.0,
      menus: [
        {
          menuItemId: "tteok",
          name: "매콤떡볶이",
          sellingPrice: 9000,
          usageQty: 30,
          ingredientCostBefore: 827,
          fees,
        },
      ],
    });

    expect(menus).toHaveLength(1);
    expect(menus[0]!.deltaCost).toBe(15);
    expect(menus[0]!.ingredientCostAfter).toBe(842);
    expect(menus[0]!.deltaContribution).toBe(-15);
  });

  it("skips menus with zero usage", () => {
    const menus = calculatePriceImpactMenus({
      previousUnitCost: 2.5,
      newUnitCost: 3.0,
      menus: [
        {
          menuItemId: "other",
          name: "다른메뉴",
          sellingPrice: 5000,
          usageQty: 0,
          ingredientCostBefore: 100,
          fees,
        },
      ],
    });

    expect(menus).toHaveLength(0);
  });

  it("sorts by absolute deltaCost descending", () => {
    const menus = calculatePriceImpactMenus({
      previousUnitCost: 1,
      newUnitCost: 2,
      menus: [
        {
          menuItemId: "small",
          name: "소",
          sellingPrice: 1000,
          usageQty: 5,
          ingredientCostBefore: 50,
          fees,
        },
        {
          menuItemId: "big",
          name: "대",
          sellingPrice: 1000,
          usageQty: 40,
          ingredientCostBefore: 100,
          fees,
        },
      ],
    });

    expect(menus[0]!.menuItemId).toBe("big");
    expect(menus[1]!.menuItemId).toBe("small");
  });

  it("deltaCostRate null when before cost is 0", () => {
    const menus = calculatePriceImpactMenus({
      previousUnitCost: 0,
      newUnitCost: 1,
      menus: [
        {
          menuItemId: "m",
          name: "m",
          sellingPrice: 1000,
          usageQty: 10,
          ingredientCostBefore: 0,
          fees,
        },
      ],
    });

    expect(menus[0]!.deltaCostRate).toBeNull();
  });
});
