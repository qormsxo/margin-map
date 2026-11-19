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

  it("does not label menus when there are too few to compare", () => {
    // Real case: 후라이드 520개·8,578원 vs 양념 460개·8,885원 — a median split would call one
    // "바쁘기만 한 메뉴" although both margins are about the same.
    const result = analyzeContributionBySales([
      { menuItemId: "fried", name: "후라이드", salesQty: 520, contributionPerUnit: 8578 },
      { menuItemId: "sauce", name: "양념", salesQty: 460, contributionPerUnit: 8885 },
    ]);

    if (result.status !== "COMPLETED") throw new Error("expected COMPLETED");

    expect(result.menus.map((m) => m.quadrant)).toEqual(["BALANCED", "BALANCED"]);
  });

  it("keeps menus close to the median out of the warning groups", () => {
    const result = analyzeContributionBySales([
      { menuItemId: "a", name: "A", salesQty: 100, contributionPerUnit: 5000 },
      { menuItemId: "b", name: "B", salesQty: 98, contributionPerUnit: 5100 },
      { menuItemId: "c", name: "C", salesQty: 102, contributionPerUnit: 4950 },
    ]);

    if (result.status !== "COMPLETED") throw new Error("expected COMPLETED");

    expect(result.menus.every((m) => m.quadrant === "BALANCED")).toBe(true);
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
