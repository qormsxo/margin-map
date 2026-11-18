import { BaseUnit } from "@prisma/client";
import { conflict, validationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { d, n } from "@/server/decimal";

type LineInput =
  | { ingredientId: string; qty: number; unit: BaseUnit }
  | { componentPrepId: string; qty: number; unit: BaseUnit };

export async function replaceRecipeLines(input: {
  storeId: string;
  ownerType: "MENU" | "PREP";
  ownerId: string;
  lines: LineInput[];
}) {
  for (const line of input.lines) {
    if (line.qty <= 0) throw validationError("레시피 투입량은 0보다 커야 합니다.");

    if ("ingredientId" in line && "componentPrepId" in line) {
      throw validationError("한 라인에는 식재료 또는 프렙 중 하나만 지정합니다.");
    }

    if (!("ingredientId" in line) && !("componentPrepId" in line)) {
      throw validationError("레시피 라인에 식재료 또는 프렙이 필요합니다.");
    }
  }

  // Validate refs belong to store
  for (const line of input.lines) {
    if ("ingredientId" in line) {
      const ingredient = await prisma.ingredient.findFirst({
        where: { id: line.ingredientId, storeId: input.storeId },
      });

      if (!ingredient) throw validationError("존재하지 않는 식재료입니다.");

      if (ingredient.baseUnit !== line.unit) {
        throw validationError(
          `식재료 단위는 ${ingredient.baseUnit} 이어야 합니다.`,
        );
      }
    } else {
      if (line.componentPrepId === input.ownerId && input.ownerType === "PREP") {
        throw conflict("프렙이 자기 자신을 참조할 수 없습니다.");
      }

      const prep = await prisma.prepRecipe.findFirst({
        where: { id: line.componentPrepId, storeId: input.storeId },
      });

      if (!prep) throw validationError("존재하지 않는 프렙입니다.");

      if (prep.yieldUnit !== line.unit) {
        throw validationError(`프렙 단위는 ${prep.yieldUnit} 이어야 합니다.`);
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    if (input.ownerType === "MENU") {
      await tx.recipeLine.deleteMany({ where: { menuItemId: input.ownerId } });
      await tx.recipeLine.createMany({
        data: input.lines.map((line) =>
          "ingredientId" in line
            ? {
                ownerType: "MENU" as const,
                menuItemId: input.ownerId,
                componentType: "INGREDIENT" as const,
                ingredientId: line.ingredientId,
                qty: d(line.qty),
                unit: line.unit,
              }
            : {
                ownerType: "MENU" as const,
                menuItemId: input.ownerId,
                componentType: "PREP" as const,
                componentPrepId: line.componentPrepId,
                qty: d(line.qty),
                unit: line.unit,
              },
        ),
      });
    } else {
      await tx.recipeLine.deleteMany({ where: { prepRecipeId: input.ownerId } });
      await tx.recipeLine.createMany({
        data: input.lines.map((line) =>
          "ingredientId" in line
            ? {
                ownerType: "PREP" as const,
                prepRecipeId: input.ownerId,
                componentType: "INGREDIENT" as const,
                ingredientId: line.ingredientId,
                qty: d(line.qty),
                unit: line.unit,
              }
            : {
                ownerType: "PREP" as const,
                prepRecipeId: input.ownerId,
                componentType: "PREP" as const,
                componentPrepId: line.componentPrepId,
                qty: d(line.qty),
                unit: line.unit,
              },
        ),
      });
    }
  });

  const lines = await prisma.recipeLine.findMany({
    where:
      input.ownerType === "MENU"
        ? { menuItemId: input.ownerId }
        : { prepRecipeId: input.ownerId },
  });

  return lines.map((line) => ({
    id: line.id,
    componentType: line.componentType,
    ingredientId: line.ingredientId,
    componentPrepId: line.componentPrepId,
    qty: n(line.qty),
    unit: line.unit,
  }));
}
