import { FixedCostCategory, Prisma } from "@prisma/client";
import {
  calculateOperatingProfit,
  inclusiveDays,
  prorateMonthlyCost,
  roundMoney,
  wholeMonths,
} from "@/domain";
import { conflict, notFound, validationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { d, n } from "@/server/decimal";
import { requireSession } from "@/server/store-service";

function serialize(row: {
  id: string;
  name: string;
  category: FixedCostCategory;
  monthlyAmount: Prisma.Decimal;
}) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    monthlyAmount: n(row.monthlyAmount),
  };
}

export async function listFixedCosts() {
  const session = await requireSession();

  const rows = await prisma.fixedCostItem.findMany({
    where: { storeId: session.storeId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const items = rows.map(serialize);

  return {
    items,
    monthlyTotal: items.reduce((sum, item) => sum + item.monthlyAmount, 0),
  };
}

export async function createFixedCost(input: {
  name: string;
  category: FixedCostCategory;
  monthlyAmount: number;
}) {
  const session = await requireSession();
  const name = input.name.trim();

  if (!name) throw validationError("항목명이 필요합니다.");

  try {
    const row = await prisma.fixedCostItem.create({
      data: {
        storeId: session.storeId,
        name,
        category: input.category,
        monthlyAmount: d(input.monthlyAmount),
      },
    });

    return serialize(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflict("같은 이름의 고정비 항목이 있습니다.");
    }

    throw error;
  }
}

export async function updateFixedCost(
  id: string,
  input: { name?: string; category?: FixedCostCategory; monthlyAmount?: number },
) {
  const session = await requireSession();

  const existing = await prisma.fixedCostItem.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!existing) throw notFound("고정비 항목을 찾을 수 없습니다.");

  const name = input.name?.trim() ?? existing.name;

  if (!name) throw validationError("항목명이 필요합니다.");

  try {
    const row = await prisma.fixedCostItem.update({
      where: { id },
      data: {
        name,
        category: input.category ?? existing.category,
        monthlyAmount:
          input.monthlyAmount === undefined
            ? existing.monthlyAmount
            : d(input.monthlyAmount),
      },
    });

    return serialize(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflict("같은 이름의 고정비 항목이 있습니다.");
    }

    throw error;
  }
}

export async function deleteFixedCost(id: string) {
  const session = await requireSession();

  const existing = await prisma.fixedCostItem.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!existing) throw notFound("고정비 항목을 찾을 수 없습니다.");

  await prisma.fixedCostItem.delete({ where: { id } });

  return { id };
}

/**
 * Store-level P&L for a period: contribution − prorated monthly fixed costs.
 * Returns null fixed-cost section when the store has no fixed costs registered
 * (we never assume a labor/rent amount).
 */
export async function buildProfitAndLoss(input: {
  storeId: string;
  periodStart: Date;
  periodEnd: Date;
  revenue: number;
  totalContribution: number;
}) {
  const rows = await prisma.fixedCostItem.findMany({
    where: { storeId: input.storeId },
  });

  if (rows.length === 0) {
    return {
      status: "NO_FIXED_COSTS" as const,
      emptyState: {
        message: "고정비가 없어 실제 이익(영업이익)과 손익분기점을 계산할 수 없습니다.",
        requiredInput: "인건비·임대료·공과금 등 월 고정비를 입력하세요.",
      },
    };
  }

  const periodDays = inclusiveDays(input.periodStart, input.periodEnd);
  const months = wholeMonths(input.periodStart, input.periodEnd);

  const breakdown = rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    monthlyAmount: n(row.monthlyAmount),
    // Whole calendar months: the full monthly amount. Otherwise: by days.
    periodAmount:
      months !== null
        ? roundMoney(n(row.monthlyAmount) * months)
        : prorateMonthlyCost(n(row.monthlyAmount), periodDays),
  }));

  const fixedCosts = breakdown.reduce((sum, item) => sum + item.periodAmount, 0);

  const result = calculateOperatingProfit({
    revenue: input.revenue,
    totalContribution: input.totalContribution,
    fixedCosts,
  });

  return {
    status: "COMPLETED" as const,
    periodDays,
    wholeMonths: months,
    ...result,
    /** Break-even revenue per day for the period's sales mix. */
    breakEvenRevenuePerDay:
      result.breakEvenRevenue === null
        ? null
        : Math.round(result.breakEvenRevenue / periodDays),
    breakdown,
  };
}
