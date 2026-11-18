import { Prisma } from "@prisma/client";
import {
  calculatePurchaseVariance,
  expandRecipeToIngredients,
  mergeIngredientQty,
  rankCountPriorities,
  roundMoney,
  scaleIngredientQty,
} from "@/domain";
import { notFound, validationError } from "@/lib/errors";
import { isMappableError, toAppError } from "@/lib/domain-map";
import { prisma } from "@/lib/prisma";
import { dateOnly } from "@/server/cost-basis-service";
import { loadCostingContext, toRecipeLineInput } from "@/server/costing-context";
import { d, n } from "@/server/decimal";
import { requireSession } from "@/server/store-service";

function serialize(row: {
  id: string;
  purchasedOn: Date;
  amount: Prisma.Decimal;
  supplier: string | null;
  note: string | null;
}) {
  return {
    id: row.id,
    purchasedOn: row.purchasedOn.toISOString().slice(0, 10),
    amount: n(row.amount),
    supplier: row.supplier,
    note: row.note,
  };
}

export async function listPurchases(input: { from?: string; to?: string }) {
  const session = await requireSession();

  const where: Prisma.PurchaseRecordWhereInput = { storeId: session.storeId };

  if (input.from || input.to) {
    const purchasedOn: Prisma.DateTimeFilter = {};

    if (input.from) purchasedOn.gte = dateOnly(input.from);

    if (input.to) purchasedOn.lte = dateOnly(input.to);

    where.purchasedOn = purchasedOn;
  }

  const rows = await prisma.purchaseRecord.findMany({
    where,
    orderBy: [{ purchasedOn: "desc" }, { createdAt: "desc" }],
  });

  return rows.map(serialize);
}

export async function createPurchase(input: {
  purchasedOn: string;
  amount: number;
  supplier?: string;
  note?: string;
}) {
  const session = await requireSession();

  const row = await prisma.purchaseRecord.create({
    data: {
      storeId: session.storeId,
      purchasedOn: dateOnly(input.purchasedOn),
      amount: d(input.amount),
      supplier: input.supplier?.trim() || null,
      note: input.note?.trim() || null,
      source: "MANUAL",
    },
  });

  return serialize(row);
}

export async function deletePurchase(id: string) {
  const session = await requireSession();

  const existing = await prisma.purchaseRecord.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!existing) throw notFound("매입 기록을 찾을 수 없습니다.");

  await prisma.purchaseRecord.delete({ where: { id } });

  return { id };
}

/**
 * Store-level theoretical vs actual food cost for a sales period, using
 * recorded purchases instead of per-ingredient stock counts.
 * Also returns which ingredients are worth counting first (80/20).
 */
export async function getPurchaseVariance(input: {
  periodId: string;
  openingInventory?: number | null;
  closingInventory?: number | null;
}) {
  const session = await requireSession();

  const period = await prisma.salesPeriod.findFirst({
    where: { id: input.periodId, storeId: session.storeId },
    include: { lines: true },
  });

  if (!period) throw notFound("판매 기간을 찾을 수 없습니다.");

  const opening = input.openingInventory ?? null;
  const closing = input.closingInventory ?? null;

  if ((opening === null) !== (closing === null)) {
    throw validationError("기초·기말 재고 금액은 둘 다 입력하거나 둘 다 비워 두세요.");
  }

  const [purchases, menus, context] = await Promise.all([
    prisma.purchaseRecord.findMany({
      where: {
        storeId: session.storeId,
        purchasedOn: { gte: period.periodStart, lte: period.periodEnd },
      },
    }),
    prisma.menuItem.findMany({
      where: { storeId: session.storeId },
      include: { lines: true },
    }),
    loadCostingContext(session.storeId),
  ]);

  const menuById = new Map(menus.map((m) => [m.id, m] as const));
  const usableQtyMaps: Array<Map<string, number>> = [];
  const menusWithoutRecipe = new Set<string>();

  for (const sale of period.lines) {
    const menu = menuById.get(sale.menuItemId);

    if (!menu) continue;

    if (menu.lines.length === 0) {
      menusWithoutRecipe.add(menu.id);
      continue;
    }

    try {
      const perPortion = expandRecipeToIngredients(
        menu.lines.map(toRecipeLineInput),
        context.preps,
      );

      usableQtyMaps.push(scaleIngredientQty(perPortion, n(sale.qty)));
    } catch (error) {
      if (isMappableError(error)) throw toAppError(error);
      throw error;
    }
  }

  const usableQty = mergeIngredientQty(usableQtyMaps);
  const theoAmtByIngredient = new Map<string, number>();

  for (const [ingredientId, qty] of usableQty) {
    const ref = context.ingredients.get(ingredientId);

    // ref.unitCost is already per usable unit (yield applied).
    theoAmtByIngredient.set(ingredientId, qty * (ref?.unitCost ?? 0));
  }

  const theoreticalCost = roundMoney(
    [...theoAmtByIngredient.values()].reduce((sum, v) => sum + v, 0),
  );

  const purchasesTotal = purchases.reduce((sum, p) => sum + n(p.amount), 0);

  const nameById = new Map(
    context.ingredientRows.map((r) => [r.id, r.name] as const),
  );

  const evidence = {
    periodStart: period.periodStart.toISOString().slice(0, 10),
    periodEnd: period.periodEnd.toISOString().slice(0, 10),
    salesLineCount: period.lines.length,
    purchaseCount: purchases.length,
    menusWithoutRecipe: menusWithoutRecipe.size,
    costAsOf: "CURRENT_MASTER" as const,
  };

  // Sales exist but no sold menu has a recipe: theoretical cost would be a fake 0.
  if (period.lines.length > 0 && usableQtyMaps.length === 0) {
    return {
      status: "INSUFFICIENT_DATA" as const,
      insufficientReason: "NO_RECIPES" as const,
      periodId: period.id,
      countPriorities: [],
      emptyState: {
        message: "팔린 메뉴에 레시피가 없어 이론 원가를 계산할 수 없습니다.",
        requiredInput: "메뉴 화면에서 ‘레시피 넣기’로 재료와 양을 넣으면 매입과 비교할 수 있습니다.",
      },
      evidence,
    };
  }

  const result = calculatePurchaseVariance({
    hasSales: period.lines.length > 0,
    theoreticalCost,
    purchaseCount: purchases.length,
    purchasesTotal,
    openingInventory: opening,
    closingInventory: closing,
  });

  const countPriorities = rankCountPriorities(theoAmtByIngredient).map((row) => ({
    ...row,
    name: nameById.get(row.ingredientId) ?? row.ingredientId,
  }));

  if (result.status === "INSUFFICIENT_DATA") {
    return {
      ...result,
      periodId: period.id,
      countPriorities,
      emptyState:
        result.insufficientReason === "NO_SALES"
          ? {
              message: "판매량이 없어 이론 원가를 만들 수 없습니다.",
              requiredInput: "이 기간 메뉴별 판매량을 입력하세요.",
            }
          : {
              message: "이 기간 매입 기록이 없습니다.",
              requiredInput: "거래명세서·영수증 기준으로 식재료 매입 금액을 입력하세요.",
            },
      evidence,
    };
  }

  return { ...result, periodId: period.id, countPriorities, evidence };
}
