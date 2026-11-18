import { FactSource, PeriodGrain, Prisma } from "@prisma/client";
import { conflict, notFound, validationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { dateOnly } from "@/server/cost-basis-service";
import { d, n } from "@/server/decimal";
import { requireSession } from "@/server/store-service";

function serializePeriod(row: {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  grain: PeriodGrain;
  lines: Array<{
    id: string;
    menuItemId: string;
    salesChannelId: string | null;
    qty: Prisma.Decimal;
    source: FactSource;
  }>;
  orderCounts: Array<{ salesChannelId: string; orderCount: number }>;
}) {
  return {
    id: row.id,
    periodStart: row.periodStart.toISOString().slice(0, 10),
    periodEnd: row.periodEnd.toISOString().slice(0, 10),
    grain: row.grain,
    lines: row.lines.map((line) => ({
      id: line.id,
      menuItemId: line.menuItemId,
      salesChannelId: line.salesChannelId,
      qty: n(line.qty),
      source: line.source,
    })),
    orderCounts: row.orderCounts.map((c) => ({
      salesChannelId: c.salesChannelId,
      orderCount: c.orderCount,
    })),
  };
}

export async function listSalesPeriods() {
  const session = await requireSession();

  const rows = await prisma.salesPeriod.findMany({
    where: { storeId: session.storeId },
    include: { lines: true, orderCounts: true },
    orderBy: { periodStart: "desc" },
  });

  return rows.map(serializePeriod);
}

export async function getSalesPeriod(id: string) {
  const session = await requireSession();

  const row = await prisma.salesPeriod.findFirst({
    where: { id, storeId: session.storeId },
    include: { lines: true, orderCounts: true },
  });

  if (!row) throw notFound("판매 기간을 찾을 수 없습니다.");

  return serializePeriod(row);
}

export async function createSalesPeriod(input: {
  periodStart: string;
  periodEnd: string;
  grain: PeriodGrain;
}) {
  const session = await requireSession();
  const periodStart = dateOnly(input.periodStart);
  const periodEnd = dateOnly(input.periodEnd);

  if (periodEnd < periodStart) {
    throw validationError("periodEnd는 periodStart 이후여야 합니다.");
  }

  try {
    const row = await prisma.salesPeriod.create({
      data: {
        storeId: session.storeId,
        periodStart,
        periodEnd,
        grain: input.grain,
      },
      include: { lines: true, orderCounts: true },
    });

    return serializePeriod(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflict("같은 기간의 판매 기록이 이미 있습니다.");
    }

    throw error;
  }
}

export async function replaceSalesLines(
  periodId: string,
  input: {
    lines: Array<{
      menuItemId: string;
      qty: number;
      salesChannelId?: string;
    }>;
    source: FactSource;
  },
) {
  const session = await requireSession();

  const period = await prisma.salesPeriod.findFirst({
    where: { id: periodId, storeId: session.storeId },
  });

  if (!period) throw notFound("판매 기간을 찾을 수 없습니다.");

  for (const line of input.lines) {
    if (!(line.qty > 0)) {
      throw validationError("판매량은 0보다 커야 합니다.");
    }
  }

  const menuIds = [...new Set(input.lines.map((l) => l.menuItemId))];

  const menus = await prisma.menuItem.findMany({
    where: { storeId: session.storeId, id: { in: menuIds } },
    select: { id: true },
  });

  if (menus.length !== menuIds.length) {
    throw validationError("존재하지 않는 메뉴가 포함되어 있습니다.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.salesLine.deleteMany({ where: { periodId } });

    if (input.lines.length === 0) return;

    await tx.salesLine.createMany({
      data: input.lines.map((line) => ({
        periodId,
        menuItemId: line.menuItemId,
        salesChannelId: line.salesChannelId ?? null,
        qty: d(line.qty),
        source: input.source,
      })),
    });
  });

  return getSalesPeriod(periodId);
}

/** Replace per-channel order counts for a period (used for per-order delivery fees). */
export async function replaceOrderCounts(
  periodId: string,
  input: { counts: Array<{ salesChannelId: string; orderCount: number }> },
) {
  const session = await requireSession();

  const period = await prisma.salesPeriod.findFirst({
    where: { id: periodId, storeId: session.storeId },
  });

  if (!period) throw notFound("판매 기간을 찾을 수 없습니다.");

  const channelIds = [...new Set(input.counts.map((c) => c.salesChannelId))];

  const channels = await prisma.salesChannel.findMany({
    where: { storeId: session.storeId, id: { in: channelIds } },
    select: { id: true },
  });

  if (channels.length !== channelIds.length) {
    throw validationError("존재하지 않는 판매 채널이 포함되어 있습니다.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.salesOrderCount.deleteMany({ where: { periodId } });

    const rows = input.counts.filter((c) => c.orderCount > 0);

    if (rows.length === 0) return;

    await tx.salesOrderCount.createMany({
      data: rows.map((c) => ({
        periodId,
        salesChannelId: c.salesChannelId,
        orderCount: c.orderCount,
        source: "MANUAL" as const,
      })),
    });
  });

  return getSalesPeriod(periodId);
}
