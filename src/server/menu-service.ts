import { Prisma } from "@prisma/client";
import { conflict, notFound, validationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/store-service";
import { d, n } from "@/server/decimal";
import { replaceRecipeLines } from "@/server/recipe-line-service";
import { BaseUnit } from "@prisma/client";

function serialize(row: {
  id: string;
  name: string;
  sellingPrice: Prisma.Decimal;
  vatInclusive: boolean;
  isActive: boolean;
  defaultChannelId: string | null;
}) {
  return {
    id: row.id,
    name: row.name,
    sellingPrice: n(row.sellingPrice),
    vatInclusive: row.vatInclusive,
    isActive: row.isActive,
    defaultChannelId: row.defaultChannelId,
  };
}

export async function listMenus() {
  const session = await requireSession();

  const rows = await prisma.menuItem.findMany({
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

export async function getMenu(id: string) {
  const session = await requireSession();

  const row = await prisma.menuItem.findFirst({
    where: { id, storeId: session.storeId },
    include: { lines: true },
  });

  if (!row) throw notFound("메뉴를 찾을 수 없습니다.");

  return {
    ...serialize(row),
    lines: row.lines.map((line) => ({
      id: line.id,
      componentType: line.componentType,
      ingredientId: line.ingredientId,
      componentPrepId: line.componentPrepId,
      qty: n(line.qty),
      unit: line.unit,
    })),
  };
}

export async function createMenu(input: {
  name: string;
  sellingPrice: number;
  vatInclusive?: boolean;
  defaultChannelId?: string;
  isActive?: boolean;
}) {
  const session = await requireSession();
  const name = input.name.trim();

  if (!name) throw validationError("메뉴명이 필요합니다.");

  if (input.sellingPrice < 0) throw validationError("판매가는 0 이상이어야 합니다.");

  if (input.defaultChannelId) {
    const channel = await prisma.salesChannel.findFirst({
      where: { id: input.defaultChannelId, storeId: session.storeId },
    });

    if (!channel) throw validationError("기본 채널이 올바르지 않습니다.");
  }

  try {
    const row = await prisma.menuItem.create({
      data: {
        storeId: session.storeId,
        name,
        sellingPrice: d(input.sellingPrice),
        vatInclusive: input.vatInclusive ?? true,
        isActive: input.isActive ?? true,
        defaultChannelId: input.defaultChannelId ?? null,
      },
    });

    return serialize(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflict("같은 이름의 메뉴가 이미 있습니다.");
    }

    throw error;
  }
}

export async function updateMenu(
  id: string,
  input: Partial<{
    name: string;
    sellingPrice: number;
    vatInclusive: boolean;
    defaultChannelId: string | null;
    isActive: boolean;
  }>,
) {
  const session = await requireSession();

  const existing = await prisma.menuItem.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!existing) throw notFound("메뉴를 찾을 수 없습니다.");

  if (input.sellingPrice !== undefined && input.sellingPrice < 0) {
    throw validationError("판매가는 0 이상이어야 합니다.");
  }

  const previousPrice = n(existing.sellingPrice);

  const nextPrice =
    input.sellingPrice !== undefined ? input.sellingPrice : previousPrice;

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.menuItem.update({
      where: { id },
      data: {
        name: input.name?.trim() ?? existing.name,
        sellingPrice: d(nextPrice),
        vatInclusive: input.vatInclusive ?? existing.vatInclusive,
        isActive: input.isActive ?? existing.isActive,
        defaultChannelId:
          input.defaultChannelId === undefined
            ? existing.defaultChannelId
            : input.defaultChannelId,
      },
    });

    if (input.sellingPrice !== undefined && previousPrice !== nextPrice) {
      await tx.menuPriceHistory.create({
        data: {
          menuItemId: id,
          previousPrice: d(previousPrice),
          newPrice: d(nextPrice),
          effectiveAt: new Date(),
          source: "MANUAL",
        },
      });
    }

    return updated;
  });

  return serialize(row);
}

export async function deleteMenu(id: string) {
  const session = await requireSession();

  const existing = await prisma.menuItem.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!existing) throw notFound("메뉴를 찾을 수 없습니다.");
  await prisma.menuItem.delete({ where: { id } });

  return { id };
}

export async function putMenuLines(
  id: string,
  lines: Array<
    | { ingredientId: string; qty: number; unit: BaseUnit }
    | { componentPrepId: string; qty: number; unit: BaseUnit }
  >,
) {
  const session = await requireSession();

  const existing = await prisma.menuItem.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!existing) throw notFound("메뉴를 찾을 수 없습니다.");

  return replaceRecipeLines({
    storeId: session.storeId,
    ownerType: "MENU",
    ownerId: id,
    lines,
  });
}
