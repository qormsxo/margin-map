import {
  METRIC_TYPE_CONTRIBUTION,
  calculateMenuIngredientCost,
  calculatePriceImpactMenus,
  effectiveUnitCost,
  expandRecipeToIngredients,
} from "@/domain";
import { notFound, validationError } from "@/lib/errors";
import { isMappableError, toAppError } from "@/lib/domain-map";
import { prisma } from "@/lib/prisma";
import {
  loadCostingContext,
  resolveFees,
  toRecipeLineInput,
} from "@/server/costing-context";
import { n } from "@/server/decimal";
import { requireSession } from "@/server/store-service";

export async function listIngredientPriceHistory(ingredientId: string) {
  const session = await requireSession();

  const ingredient = await prisma.ingredient.findFirst({
    where: { id: ingredientId, storeId: session.storeId },
  });

  if (!ingredient) throw notFound("식재료를 찾을 수 없습니다.");

  const rows = await prisma.ingredientPriceHistory.findMany({
    where: { ingredientId },
    orderBy: { effectiveAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    previousUnitCost: n(row.previousUnitCost),
    newUnitCost: n(row.newUnitCost),
    previousPurchasePrice: row.previousPurchasePrice
      ? n(row.previousPurchasePrice)
      : null,
    newPurchasePrice: row.newPurchasePrice ? n(row.newPurchasePrice) : null,
    effectiveAt: row.effectiveAt.toISOString(),
    recordedAt: row.recordedAt.toISOString(),
    source: row.source,
  }));
}

export async function getIngredientPriceImpact(
  ingredientId: string,
  historyId?: string,
) {
  const session = await requireSession();

  const ingredient = await prisma.ingredient.findFirst({
    where: { id: ingredientId, storeId: session.storeId },
  });

  if (!ingredient) throw notFound("식재료를 찾을 수 없습니다.");

  const history = historyId
    ? await prisma.ingredientPriceHistory.findFirst({
        where: { id: historyId, ingredientId },
      })
    : await prisma.ingredientPriceHistory.findFirst({
        where: { ingredientId },
        orderBy: { effectiveAt: "desc" },
      });

  if (!history) {
    throw notFound("가격 변경 이력이 없습니다.");
  }

  const analysisAsOf = historyId ? ("HISTORY" as const) : ("LATEST" as const);
  // History stores purchase unit cost; recipes use usable qty → apply current yield.
  const yieldRate = n(ingredient.yieldRate);
  const previousUnitCost = effectiveUnitCost(n(history.previousUnitCost), yieldRate);
  const newUnitCost = effectiveUnitCost(n(history.newUnitCost), yieldRate);

  const { ingredients, preps } = await loadCostingContext(session.storeId);

  const menus = await prisma.menuItem.findMany({
    where: { storeId: session.storeId, isActive: true },
    include: { lines: true },
  });

  const impactInputs = [];
  const feesCache = new Map<string, Awaited<ReturnType<typeof resolveFees>>>();

  for (const menu of menus) {
    const lines = menu.lines.map(toRecipeLineInput);
    const expanded = expandRecipeToIngredients(lines, preps);
    const usageQty = expanded.get(ingredientId) ?? 0;

    if (usageQty <= 0) continue;

    const feeKey = menu.defaultChannelId ?? "__default__";
    let resolved = feesCache.get(feeKey);

    if (!resolved) {
      resolved = await resolveFees(session.storeId, menu.defaultChannelId);
      feesCache.set(feeKey, resolved);
    }

    const { fees } = resolved;

    // Cost before = current master with this ingredient forced to previousUnitCost
    const ingredientsBefore = new Map(ingredients);
    const current = ingredientsBefore.get(ingredientId);

    if (!current) {
      throw validationError("식재료 단가 컨텍스트를 찾을 수 없습니다.");
    }

    ingredientsBefore.set(ingredientId, {
      ...current,
      unitCost: previousUnitCost,
    });

    try {
      const before = calculateMenuIngredientCost(
        lines,
        ingredientsBefore,
        preps,
      );

      impactInputs.push({
        menuItemId: menu.id,
        name: menu.name,
        sellingPrice: n(menu.sellingPrice),
        usageQty,
        ingredientCostBefore: before.totalCost,
        fees,
      });
    } catch (error) {
      if (isMappableError(error)) throw toAppError(error);
      throw error;
    }
  }

  const impacted = calculatePriceImpactMenus({
    previousUnitCost,
    newUnitCost,
    menus: impactInputs,
  });

  return {
    ingredientId,
    historyId: history.id,
    previousUnitCost,
    newUnitCost,
    metricType: METRIC_TYPE_CONTRIBUTION,
    analysisAsOf,
    menus: impacted,
  };
}

const won = (v: number) => `${Math.round(v).toLocaleString("ko-KR")}원`;

/** Monday (UTC date) of the week containing `date`. */
function mondayOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));

  return d;
}

/**
 * Raise an alert right when an ingredient's purchase price goes up, listing the
 * menus whose cost rose. Owners expect this at the moment of the price change,
 * not after a weekly check.
 */
export async function createPriceRiseAlert(input: {
  storeId: string;
  ingredientId: string;
  ingredientName: string;
  historyId: string;
  previousPurchasePrice: number;
  newPurchasePrice: number;
}) {
  let menus: Array<{ name: string; deltaCost: number; contributionAfter: number }> = [];

  try {
    const impact = await getIngredientPriceImpact(input.ingredientId, input.historyId);

    menus = impact.menus
      .map((m) => ({ name: m.name, deltaCost: m.deltaCost, contributionAfter: m.contributionAfter }))
      .sort((a, b) => b.deltaCost - a.deltaCost);
  } catch {
    // No sales channel yet etc.: still tell the owner the price went up.
  }

  const rate =
    input.previousPurchasePrice > 0
      ? ((input.newPurchasePrice - input.previousPurchasePrice) / input.previousPurchasePrice) * 100
      : null;

  const head = `${input.ingredientName} 구매가 ${won(input.previousPurchasePrice)} → ${won(input.newPurchasePrice)}${
    rate === null ? "" : ` (+${rate.toFixed(1)}%)`
  }.`;

  const shown = menus.slice(0, 3).map((m) => `${m.name} +${won(m.deltaCost)}`);
  const rest = menus.length - shown.length;

  const body =
    menus.length === 0
      ? `${head} 이 재료를 쓰는 메뉴 레시피가 없거나 아직 계산할 수 없습니다.`
      : `${head} 1개당 원가가 오른 메뉴: ${shown.join(", ")}${rest > 0 ? ` 외 ${rest}개` : ""}.`;

  await prisma.alert.create({
    data: {
      storeId: input.storeId,
      weekStart: mondayOf(new Date()),
      ruleId: "PRICE_UP",
      severity: "WARN",
      title: `식재료 가격 상승: ${input.ingredientName}`,
      body,
      entityType: "INGREDIENT",
      entityId: input.ingredientId,
      evidenceJson: { historyId: input.historyId, menus },
    },
  });
}
