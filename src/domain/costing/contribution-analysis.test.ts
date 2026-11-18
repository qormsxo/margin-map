import { describe, expect, it } from "vitest";
import { analyzeContributionBySales } from "@/domain";

describe("analyzeContributionBySales (DF-C)", () => {
  it("NO_SALES → insufficient, empty menus", () => {
    const result = analyzeContributionBySales([]);

    expect(result.status).toBe("INSUFFICIENT_DATA");

    if (result.status === "INSUFFICIENT_DATA") {
      expect(result.menus).toEqual([]);
      expect(result.reason).toBe("NO_SALES");
    }
  });

  it("totalContribution = contribution × salesQty", () => {
    const result = analyzeContributionBySales([
      {
        menuItemId: "a",
        name: "A",
        salesQty: 10,
        contributionPerUnit: 7363,
      },
    ]);

    expect(result.status).toBe("COMPLETED");

    if (result.status !== "COMPLETED") return;

    expect(result.menus[0]!.totalContribution).toBe(73630);
  });

  it("identifies high-sales/low-contrib and low-sales/high-contrib", () => {
    const result = analyzeContributionBySales([
      {
        menuItemId: "popular",
        name: "잘팔림저마진",
        salesQty: 100,
        contributionPerUnit: 1000,
      },
      {
        menuItemId: "niche",
        name: "안팔림고마진",
        salesQty: 5,
        contributionPerUnit: 8000,
      },
      {
        menuItemId: "mid",
        name: "중간",
        salesQty: 40,
        contributionPerUnit: 4000,
      },
    ]);

    expect(result.status).toBe("COMPLETED");

    if (result.status !== "COMPLETED") return;

    const popular = result.menus.find((m) => m.menuItemId === "popular")!;
    const niche = result.menus.find((m) => m.menuItemId === "niche")!;

    expect(popular.quadrant).toBe("HIGH_SALES_LOW_CONTRIB");
    expect(niche.quadrant).toBe("LOW_SALES_HIGH_CONTRIB");
  });

  it("sorts by totalContribution desc", () => {
    const result = analyzeContributionBySales([
      {
        menuItemId: "low",
        name: "L",
        salesQty: 1,
        contributionPerUnit: 100,
      },
      {
        menuItemId: "high",
        name: "H",
        salesQty: 10,
        contributionPerUnit: 100,
      },
    ]);

    expect(result.status).toBe("COMPLETED");

    if (result.status !== "COMPLETED") return;

    expect(result.menus[0]!.menuItemId).toBe("high");
  });
});
