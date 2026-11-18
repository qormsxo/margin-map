import { describe, expect, it } from "vitest";
import {
  DomainError,
  expandRecipeToIngredients,
  mergeIngredientQty,
  scaleIngredientQty,
} from "@/domain";
import type { PrepRef, RecipeLineInput } from "@/domain";

describe("expandRecipeToIngredients", () => {
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

  it("flattens direct ingredients and prep children", () => {
    const lines: RecipeLineInput[] = [
      {
        componentType: "INGREDIENT",
        ingredientId: "riceCake",
        qty: 150,
        unit: "G",
      },
      { componentType: "PREP", componentPrepId: "sauce", qty: 100, unit: "G" },
      { componentType: "INGREDIENT", ingredientId: "onion", qty: 30, unit: "G" },
    ];

    const qty = expandRecipeToIngredients(lines, preps);

    expect(qty.get("riceCake")).toBe(150);
    expect(qty.get("onion")).toBe(30);
    expect(qty.get("chili")).toBeCloseTo((100 / 93) * 8, 6);
    expect(qty.get("syrup")).toBeCloseTo((100 / 93) * 15, 6);
  });

  it("sums duplicate leaf ingredients", () => {
    const lines: RecipeLineInput[] = [
      { componentType: "INGREDIENT", ingredientId: "onion", qty: 10, unit: "G" },
      { componentType: "INGREDIENT", ingredientId: "onion", qty: 20, unit: "G" },
    ];

    const qty = expandRecipeToIngredients(lines, new Map());
    expect(qty.get("onion")).toBe(30);
  });

  it("detects prep cycles", () => {
    const a: PrepRef = {
      id: "a",
      yieldQty: 1,
      yieldUnit: "G",
      lines: [
        { componentType: "PREP", componentPrepId: "b", qty: 1, unit: "G" },
      ],
    };

    const b: PrepRef = {
      id: "b",
      yieldQty: 1,
      yieldUnit: "G",
      lines: [
        { componentType: "PREP", componentPrepId: "a", qty: 1, unit: "G" },
      ],
    };

    expect(() =>
      expandRecipeToIngredients(a.lines, new Map([
        ["a", a],
        ["b", b],
      ])),
    ).toThrow(DomainError);
  });
});

describe("scale + merge ingredient qty", () => {
  it("scales per-portion by sales qty", () => {
    const per = new Map([["onion", 30]]);
    const scaled = scaleIngredientQty(per, 10);
    expect(scaled.get("onion")).toBe(300);
  });

  it("merges maps", () => {
    const merged = mergeIngredientQty([
      new Map([["onion", 100]]),
      new Map([
        ["onion", 50],
        ["chili", 8],
      ]),
    ]);

    expect(merged.get("onion")).toBe(150);
    expect(merged.get("chili")).toBe(8);
  });
});
