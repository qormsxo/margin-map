import { describe, expect, it } from "vitest";
import {
  assertIsoMonday,
  evaluateWeeklyRules,
  priorIsoMonday,
  weekEndFromStart,
  WEEKLY_BASIS_VERSION,
} from "@/domain";

describe("evaluateWeeklyRules (DF-E)", () => {
  it("G6: no prior week → dataSufficient false, empty alerts", () => {
    const result = evaluateWeeklyRules({
      hasPriorWeek: false,
      currentMenus: [
        {
          menuItemId: "m1",
          name: "메뉴",
          ingredientCost: 1000,
          contributionMargin: 0.8,
        },
      ],
      priorMenus: [],
      currentVariances: [],
      priorVariances: [],
      priceShocks: [],
    });

    expect(result.dataSufficient).toBe(false);
    expect(result.alerts).toEqual([]);
  });

  it("E1 fires on +5% ingredient cost", () => {
    const result = evaluateWeeklyRules({
      hasPriorWeek: true,
      currentMenus: [
        {
          menuItemId: "m1",
          name: "메뉴",
          ingredientCost: 110,
          contributionMargin: 0.8,
        },
      ],
      priorMenus: [
        {
          menuItemId: "m1",
          name: "메뉴",
          ingredientCost: 100,
          contributionMargin: 0.8,
        },
      ],
      currentVariances: [],
      priorVariances: [],
      priceShocks: [],
    });

    expect(result.dataSufficient).toBe(true);
    expect(result.alerts.some((a) => a.ruleId === "E1")).toBe(true);
  });

  it("E1 boundary: exactly +5% fires", () => {
    const result = evaluateWeeklyRules({
      hasPriorWeek: true,
      currentMenus: [
        {
          menuItemId: "m1",
          name: "메뉴",
          ingredientCost: 105,
          contributionMargin: 0.8,
        },
      ],
      priorMenus: [
        {
          menuItemId: "m1",
          name: "메뉴",
          ingredientCost: 100,
          contributionMargin: 0.8,
        },
      ],
      currentVariances: [],
      priorVariances: [],
      priceShocks: [],
    });

    expect(result.alerts.some((a) => a.ruleId === "E1")).toBe(true);
  });

  it("E1 below threshold does not fire", () => {
    const result = evaluateWeeklyRules({
      hasPriorWeek: true,
      currentMenus: [
        {
          menuItemId: "m1",
          name: "메뉴",
          ingredientCost: 104,
          contributionMargin: 0.8,
        },
      ],
      priorMenus: [
        {
          menuItemId: "m1",
          name: "메뉴",
          ingredientCost: 100,
          contributionMargin: 0.8,
        },
      ],
      currentVariances: [],
      priorVariances: [],
      priceShocks: [],
    });

    expect(result.alerts.some((a) => a.ruleId === "E1")).toBe(false);
  });

  it("E2 fires on -3pp contribution margin", () => {
    const result = evaluateWeeklyRules({
      hasPriorWeek: true,
      currentMenus: [
        {
          menuItemId: "m1",
          name: "메뉴",
          ingredientCost: 100,
          contributionMargin: 0.75,
        },
      ],
      priorMenus: [
        {
          menuItemId: "m1",
          name: "메뉴",
          ingredientCost: 100,
          contributionMargin: 0.8,
        },
      ],
      currentVariances: [],
      priorVariances: [],
      priceShocks: [],
    });

    expect(result.alerts.some((a) => a.ruleId === "E2")).toBe(true);
  });

  it("E3 only with actual variance data both weeks", () => {
    const result = evaluateWeeklyRules({
      hasPriorWeek: true,
      currentMenus: [],
      priorMenus: [],
      currentVariances: [
        { ingredientId: "onion", name: "양파", varianceRate: 0.2 },
      ],
      priorVariances: [
        { ingredientId: "onion", name: "양파", varianceRate: 0.1 },
      ],
      priceShocks: [],
    });

    expect(result.alerts.some((a) => a.ruleId === "E3")).toBe(true);
  });

  it("E3 skipped when prior variance missing", () => {
    const result = evaluateWeeklyRules({
      hasPriorWeek: true,
      currentMenus: [],
      priorMenus: [],
      currentVariances: [
        { ingredientId: "onion", name: "양파", varianceRate: 0.2 },
      ],
      priorVariances: [],
      priceShocks: [],
    });

    expect(result.alerts.some((a) => a.ruleId === "E3")).toBe(false);
  });

  it("E4 fires for menus using price-increased ingredients", () => {
    const result = evaluateWeeklyRules({
      hasPriorWeek: true,
      currentMenus: [
        {
          menuItemId: "m1",
          name: "메뉴",
          ingredientCost: 100,
          contributionMargin: 0.8,
        },
      ],
      priorMenus: [
        {
          menuItemId: "m1",
          name: "메뉴",
          ingredientCost: 100,
          contributionMargin: 0.8,
        },
      ],
      currentVariances: [],
      priorVariances: [],
      priceShocks: [
        {
          ingredientId: "onion",
          historyId: "h1",
          previousUnitCost: 2.5,
          newUnitCost: 3.0,
          affectedMenuIds: ["m1"],
        },
      ],
    });

    const e4 = result.alerts.find((a) => a.ruleId === "E4");
    expect(e4).toBeDefined();
    expect(e4!.evidence.relatedHistoryId).toBe("h1");
  });

  it("no anomalies → sufficient with empty alerts", () => {
    const result = evaluateWeeklyRules({
      hasPriorWeek: true,
      currentMenus: [
        {
          menuItemId: "m1",
          name: "메뉴",
          ingredientCost: 100,
          contributionMargin: 0.8,
        },
      ],
      priorMenus: [
        {
          menuItemId: "m1",
          name: "메뉴",
          ingredientCost: 100,
          contributionMargin: 0.8,
        },
      ],
      currentVariances: [],
      priorVariances: [],
      priceShocks: [],
    });

    expect(result.dataSufficient).toBe(true);
    expect(result.alerts).toEqual([]);
  });
});

describe("ISO week helpers", () => {
  it("accepts Monday and rejects other days", () => {
    expect(assertIsoMonday("2026-11-16")).toBe("2026-11-16");
    expect(() => assertIsoMonday("2026-11-17")).toThrow();
  });

  it("computes prior Monday and week end", () => {
    expect(priorIsoMonday("2026-11-16")).toBe("2026-11-09");
    expect(weekEndFromStart("2026-11-16")).toBe("2026-11-22");
  });

  it("exports basis version", () => {
    expect(WEEKLY_BASIS_VERSION).toBe("weekly-rules-v1");
  });
});
