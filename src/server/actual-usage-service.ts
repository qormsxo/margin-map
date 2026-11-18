import { BaseUnit, FactSource, Prisma } from "@prisma/client";
import { conflict, notFound, validationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { dateOnly } from "@/server/cost-basis-service";
import { d, n } from "@/server/decimal";
import { requireSession } from "@/server/store-service";

function serializePeriod(row: {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  alignedSalesPeriodId: string | null;
  note: string | null;
  lines: Array<{
    id: string;
    ingredientId: string;
    actualQty: import("@prisma/client").Prisma.Decimal | null;
    actualCost: import("@prisma/client").Prisma.Decimal | null;
    unit: BaseUnit | null;
    source: FactSource;
  }>;
}) {
  return {
    id: row.id,
    periodStart: row.periodStart.toISOString().slice(0, 10),
    periodEnd: row.periodEnd.toISOString().slice(0, 10),
    alignedSalesPeriodId: row.alignedSalesPeriodId,
    note: row.note,
    lines: row.lines.map((line) => ({
      id: line.id,
      ingredientId: line.ingredientId,
      actualQty: line.actualQty ? n(line.actualQty) : null,
      actualCost: line.actualCost ? n(line.actualCost) : null,
      unit: line.unit,
      source: line.source,
    })),
  };
}

export async function listActualUsagePeriods() {
  const session = await requireSession();

  const rows = await prisma.actualUsagePeriod.findMany({
    where: { storeId: session.storeId },
    include: { lines: true },
    orderBy: { periodStart: "desc" },
  });

  return rows.map(serializePeriod);
}

export async function getActualUsagePeriod(id: string) {
  const session = await requireSession();

  const row = await prisma.actualUsagePeriod.findFirst({
    where: { id, storeId: session.storeId },
    include: { lines: true },
  });

  if (!row) throw notFound("실사용 기간을 찾을 수 없습니다.");

  return serializePeriod(row);
}

export async function createActualUsagePeriod(input: {
  periodStart: string;
  periodEnd: string;
  alignedSalesPeriodId?: string;
  note?: string;
}) {
  const session = await requireSession();
  const periodStart = dateOnly(input.periodStart);
  const periodEnd = dateOnly(input.periodEnd);

  if (periodEnd < periodStart) {
    throw validationError("periodEnd는 periodStart 이후여야 합니다.");
  }

  if (input.alignedSalesPeriodId) {
    const sales = await prisma.salesPeriod.findFirst({
      where: { id: input.alignedSalesPeriodId, storeId: session.storeId },
    });

    if (!sales) throw validationError("연결된 판매 기간을 찾을 수 없습니다.");
  }

  try {
    const row = await prisma.actualUsagePeriod.create({
      data: {
        storeId: session.storeId,
        periodStart,
        periodEnd,
        alignedSalesPeriodId: input.alignedSalesPeriodId ?? null,
        note: input.note ?? null,
      },
      include: { lines: true },
    });

    return serializePeriod(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflict("같은 기간의 실사용 기록이 이미 있습니다.");
    }

    throw error;
  }
}

export async function replaceActualUsageLines(
  periodId: string,
  input: {
    lines: Array<{
      ingredientId: string;
      actualQty?: number;
      actualCost?: number;
      unit?: BaseUnit;
    }>;
    source: FactSource;
  },
) {
  const session = await requireSession();

  const period = await prisma.actualUsagePeriod.findFirst({
    where: { id: periodId, storeId: session.storeId },
  });

  if (!period) throw notFound("실사용 기간을 찾을 수 없습니다.");

  for (const line of input.lines) {
    const hasQty = line.actualQty !== undefined;
    const hasCost = line.actualCost !== undefined;

    if (!hasQty && !hasCost) {
      throw validationError("actualQty 또는 actualCost가 필요합니다.");
    }

    if (hasQty && !(line.actualQty! >= 0)) {
      throw validationError("actualQty는 0 이상이어야 합니다.");
    }

    if (hasCost && !(line.actualCost! >= 0)) {
      throw validationError("actualCost는 0 이상이어야 합니다.");
    }

    if (hasQty && !line.unit) {
      throw validationError("actualQty 입력 시 unit이 필요합니다.");
    }
  }

  const ingredientIds = [
    ...new Set(input.lines.map((l) => l.ingredientId)),
  ];

  const ingredients = await prisma.ingredient.findMany({
    where: { storeId: session.storeId, id: { in: ingredientIds } },
    select: { id: true },
  });

  if (ingredients.length !== ingredientIds.length) {
    throw validationError("존재하지 않는 식재료가 포함되어 있습니다.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.actualUsageLine.deleteMany({ where: { periodId } });

    if (input.lines.length === 0) return;

    await tx.actualUsageLine.createMany({
      data: input.lines.map((line) => ({
        periodId,
        ingredientId: line.ingredientId,
        actualQty:
          line.actualQty !== undefined ? d(line.actualQty) : null,
        actualCost:
          line.actualCost !== undefined ? d(line.actualCost) : null,
        unit: line.unit ?? null,
        source: input.source,
      })),
    });
  });

  return getActualUsagePeriod(periodId);
}
