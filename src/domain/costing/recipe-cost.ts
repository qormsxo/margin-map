import { DomainError } from "./domain-error";
import { assertPositive, roundMoney, roundUnitCost } from "./money";
import { type BaseUnit, assertSameUnitFamily } from "./units";

export type IngredientRef = {
  id: string;
  unitCost: number;
  baseUnit: BaseUnit;
};

export type PrepRef = {
  id: string;
  yieldQty: number;
  yieldUnit: BaseUnit;
  lines: RecipeLineInput[];
};

export type RecipeLineInput =
  | {
      componentType: "INGREDIENT";
      ingredientId: string;
      qty: number;
      unit: BaseUnit;
    }
  | {
      componentType: "PREP";
      componentPrepId: string;
      qty: number;
      unit: BaseUnit;
    };

export type RecipeCostLineResult = {
  componentType: "INGREDIENT" | "PREP";
  refId: string;
  qty: number;
  unit: BaseUnit;
  unitCost: number;
  lineCost: number;
};

export type RecipeCostResult = {
  totalCost: number;
  lines: RecipeCostLineResult[];
};

/**
 * Prep unit cost = sum(line costs) / yieldQty.
 * yieldQty is output quantity only — no trim/yield-loss factor.
 */
export function calculatePrepUnitCost(
  prep: PrepRef,
  ingredients: Map<string, IngredientRef>,
  preps: Map<string, PrepRef>,
  stack: string[] = [],
): number {
  if (stack.includes(prep.id)) {
    throw new DomainError(
      "CYCLE_DETECTED",
      `Prep recipe cycle detected: ${[...stack, prep.id].join(" -> ")}`,
    );
  }

  assertPositive(prep.yieldQty, "yieldQty");
  const nextStack = [...stack, prep.id];
  const total = costLines(prep.lines, ingredients, preps, nextStack).totalCost;

  return roundUnitCost(total / prep.yieldQty);
}

export function calculateMenuIngredientCost(
  lines: RecipeLineInput[],
  ingredients: Map<string, IngredientRef>,
  preps: Map<string, PrepRef>,
): RecipeCostResult {
  const result = costLines(lines, ingredients, preps, []);

  const priced: RecipeCostResult = {
    totalCost: roundMoney(result.totalCost),
    lines: result.lines,
  };

  return priced;
}

function costLines(
  lines: RecipeLineInput[],
  ingredients: Map<string, IngredientRef>,
  preps: Map<string, PrepRef>,
  stack: string[],
): RecipeCostResult {
  const detailed: RecipeCostLineResult[] = [];
  let totalCost = 0;

  for (const line of lines) {
    assertPositive(line.qty, "recipe line qty");

    if (line.componentType === "INGREDIENT") {
      const ingredient = ingredients.get(line.ingredientId);

      if (!ingredient) {
        throw new DomainError(
          "MISSING_DATA",
          `Ingredient not found: ${line.ingredientId}`,
        );
      }

      assertSameUnitFamily(line.unit, ingredient.baseUnit, "ingredient line");
      const lineCost = line.qty * ingredient.unitCost;
      totalCost += lineCost;
      detailed.push({
        componentType: "INGREDIENT",
        refId: ingredient.id,
        qty: line.qty,
        unit: line.unit,
        unitCost: ingredient.unitCost,
        lineCost,
      });
      continue;
    }

    const prep = preps.get(line.componentPrepId);

    if (!prep) {
      throw new DomainError(
        "MISSING_DATA",
        `Prep not found: ${line.componentPrepId}`,
      );
    }

    assertSameUnitFamily(line.unit, prep.yieldUnit, "prep line");
    const prepUnit = calculatePrepUnitCost(prep, ingredients, preps, stack);
    const lineCost = line.qty * prepUnit;
    totalCost += lineCost;
    detailed.push({
      componentType: "PREP",
      refId: prep.id,
      qty: line.qty,
      unit: line.unit,
      unitCost: prepUnit,
      lineCost,
    });
  }

  const result: RecipeCostResult = { totalCost, lines: detailed };

  return result;
}
