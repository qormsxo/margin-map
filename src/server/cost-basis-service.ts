import { CostBasisType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadCostingContext } from "@/server/costing-context";
import { d } from "@/server/decimal";

export async function createCostBasisSnapshot(input: {
  storeId: string;
  basisType: CostBasisType;
  asOfAt: Date;
  periodStart?: Date;
  periodEnd?: Date;
  weekStart?: Date;
  channelId?: string | null;
  basisVersion: string;
  label?: string;
}) {
  const { ingredientRows, prepRows } = await loadCostingContext(input.storeId);

  const menuRows = await prisma.menuItem.findMany({
    where: { storeId: input.storeId },
    include: { lines: true },
  });

  return prisma.costBasisSnapshot.create({
    data: {
      storeId: input.storeId,
      label: input.label ?? null,
      basisType: input.basisType,
      asOfAt: input.asOfAt,
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
      weekStart: input.weekStart ?? null,
      channelId: input.channelId ?? null,
      basisVersion: input.basisVersion,
      ingredients: {
        create: ingredientRows.map((row) => ({
          ingredientId: row.id,
          unitCost: row.currentUnitCost,
          purchasePrice: row.purchasePrice,
          purchaseQty: row.purchaseQty,
          yieldRate: row.yieldRate,
        })),
      },
      recipeLines: {
        create: [
          ...prepRows.flatMap((prep) =>
            prep.lines.map((line) => ({
              ownerType: "PREP" as const,
              prepRecipeId: prep.id,
              menuItemId: null,
              componentType: line.componentType,
              ingredientId: line.ingredientId,
              componentPrepId: line.componentPrepId,
              qty: line.qty,
              unit: line.unit,
            })),
          ),
          ...menuRows.flatMap((menu) =>
            menu.lines.map((line) => ({
              ownerType: "MENU" as const,
              menuItemId: menu.id,
              prepRecipeId: null,
              componentType: line.componentType,
              ingredientId: line.ingredientId,
              componentPrepId: line.componentPrepId,
              qty: line.qty,
              unit: line.unit,
            })),
          ),
        ],
      },
    },
  });
}

export function dateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
      ),
    );
  }

  const [y, m, dPart] = value.split("-").map(Number);

  return new Date(Date.UTC(y!, m! - 1, dPart!));
}

export function decimalOrNull(
  value: number | null,
): Prisma.Decimal | null {
  if (value === null) return null;

  return d(value);
}
