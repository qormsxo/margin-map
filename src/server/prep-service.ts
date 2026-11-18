import { BaseUnit, Prisma } from "@prisma/client";
import { conflict, notFound, validationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/store-service";
import { d, n } from "@/server/decimal";
import { replaceRecipeLines } from "@/server/recipe-line-service";

function serialize(row: {
  id: string;
  name: string;
  yieldQty: Prisma.Decimal;
  yieldUnit: BaseUnit;
}) {
  return {
    id: row.id,
    name: row.name,
    yieldQty: n(row.yieldQty),
    yieldUnit: row.yieldUnit,
  };
}

export async function listPrepRecipes() {
  const session = await requireSession();

  const rows = await prisma.prepRecipe.findMany({
    where: { storeId: session.storeId },
    orderBy: { name: "asc" },
    include: { lines: true },
  });

  return rows.map((row) => ({
    ...serialize(row),
    lines: row.lines.map((line) => ({
      id: line.id,
      componentType: line.componentType,
      ingredientId: line.ingredientId,
      componentPrepId: line.componentPrepId,
      qty: n(line.qty),
      unit: line.unit,
    })),
  }));
}

export async function createPrepRecipe(input: {
  name: string;
  yieldQty: number;
  yieldUnit: BaseUnit;
}) {
  const session = await requireSession();
  const name = input.name.trim();

  if (!name) throw validationError("프렙명이 필요합니다.");

  if (input.yieldQty <= 0) throw validationError("산출량은 0보다 커야 합니다.");

  try {
    const row = await prisma.prepRecipe.create({
      data: {
        storeId: session.storeId,
        name,
        yieldQty: d(input.yieldQty),
        yieldUnit: input.yieldUnit,
      },
    });

    return serialize(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflict("같은 이름의 프렙이 이미 있습니다.");
    }

    throw error;
  }
}

export async function updatePrepRecipe(
  id: string,
  input: Partial<{ name: string; yieldQty: number; yieldUnit: BaseUnit }>,
) {
  const session = await requireSession();

  const existing = await prisma.prepRecipe.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!existing) throw notFound("프렙을 찾을 수 없습니다.");

  if (input.yieldQty !== undefined && input.yieldQty <= 0) {
    throw validationError("산출량은 0보다 커야 합니다.");
  }

  const row = await prisma.prepRecipe.update({
    where: { id },
    data: {
      name: input.name?.trim() ?? existing.name,
      yieldQty:
        input.yieldQty !== undefined ? d(input.yieldQty) : existing.yieldQty,
      yieldUnit: input.yieldUnit ?? existing.yieldUnit,
    },
  });

  return serialize(row);
}

export async function deletePrepRecipe(id: string) {
  const session = await requireSession();

  const existing = await prisma.prepRecipe.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!existing) throw notFound("프렙을 찾을 수 없습니다.");

  try {
    await prisma.prepRecipe.delete({ where: { id } });

    return { id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw conflict("다른 레시피에서 사용 중인 프렙은 삭제할 수 없습니다.");
    }

    throw error;
  }
}

export async function putPrepLines(
  id: string,
  lines: Array<
    | { ingredientId: string; qty: number; unit: BaseUnit }
    | { componentPrepId: string; qty: number; unit: BaseUnit }
  >,
) {
  const session = await requireSession();

  const existing = await prisma.prepRecipe.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!existing) throw notFound("프렙을 찾을 수 없습니다.");

  return replaceRecipeLines({
    storeId: session.storeId,
    ownerType: "PREP",
    ownerId: id,
    lines,
  });
}
