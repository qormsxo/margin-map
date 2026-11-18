import { DomainError } from "./domain-error";
import { assertPositive } from "./money";
import { type PrepRef, type RecipeLineInput } from "./recipe-cost";
import { assertSameUnitFamily } from "./units";

/**
 * Flatten a recipe into leaf ingredient quantities in each ingredient's base unit.
 * Prep lines scale child ingredients by (lineQty / prep.yieldQty).
 */
export function expandRecipeToIngredients(
  lines: RecipeLineInput[],
  preps: Map<string, PrepRef>,
  stack: string[] = [],
): Map<string, number> {
  const totals = new Map<string, number>();

  addExpandedLines(lines, preps, stack, 1, totals);

  return totals;
}

function addExpandedLines(
  lines: RecipeLineInput[],
  preps: Map<string, PrepRef>,
  stack: string[],
  scale: number,
  totals: Map<string, number>,
) {
  for (const line of lines) {
    assertPositive(line.qty, "recipe line qty");
    const scaledQty = line.qty * scale;

    if (line.componentType === "INGREDIENT") {
      const prev = totals.get(line.ingredientId) ?? 0;
      totals.set(line.ingredientId, prev + scaledQty);
      continue;
    }

    const prep = preps.get(line.componentPrepId);

    if (!prep) {
      throw new DomainError(
        "MISSING_DATA",
        `Prep not found: ${line.componentPrepId}`,
      );
    }

    if (stack.includes(prep.id)) {
      throw new DomainError(
        "CYCLE_DETECTED",
        `Prep recipe cycle detected: ${[...stack, prep.id].join(" -> ")}`,
      );
    }

    assertPositive(prep.yieldQty, "yieldQty");
    assertSameUnitFamily(line.unit, prep.yieldUnit, "prep line");

    const childScale = scaledQty / prep.yieldQty;
    addExpandedLines(
      prep.lines,
      preps,
      [...stack, prep.id],
      childScale,
      totals,
    );
  }
}

/** Scale a per-portion ingredient map by menu sales quantity. */
export function scaleIngredientQty(
  perPortion: Map<string, number>,
  salesQty: number,
): Map<string, number> {
  assertPositive(salesQty, "salesQty");
  const out = new Map<string, number>();

  for (const [ingredientId, qty] of perPortion) {
    out.set(ingredientId, qty * salesQty);
  }

  return out;
}

/** Sum several ingredient quantity maps. */
export function mergeIngredientQty(
  maps: ReadonlyArray<Map<string, number>>,
): Map<string, number> {
  const out = new Map<string, number>();

  for (const map of maps) {
    for (const [ingredientId, qty] of map) {
      out.set(ingredientId, (out.get(ingredientId) ?? 0) + qty);
    }
  }

  return out;
}
