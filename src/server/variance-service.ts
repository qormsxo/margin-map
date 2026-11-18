import {
  METRIC_TYPE_CONTRIBUTION,
  calculateVarianceRun,
  expandRecipeToIngredients,
  mergeIngredientQty,
  rawQtyFromUsable,
  scaleIngredientQty,
  summarizeVariancePeriod,
  type ActualUsageInput,
  type VarianceLineInput,
} from "@/domain";
import { notFound } from "@/lib/errors";
import { isMappableError, toAppError } from "@/lib/domain-map";
import { prisma } from "@/lib/prisma";
import {
  createCostBasisSnapshot,
  dateOnly,
  decimalOrNull,
} from "@/server/cost-basis-service";
import {
  loadCostingContext,
  toRecipeLineInput,
} from "@/server/costing-context";
import { d, n } from "@/server/decimal";
import { requireSession } from "@/server/store-service";

export async function runVarianceAnalysis(input: {
  actualUsagePeriodId: string;
  salesPeriodId: string;
  channelId?: string;
  asOfAt?: string;
}) {
  const session = await requireSession();

  const [salesPeriod, actualPeriod] = await Promise.all([
    prisma.salesPeriod.findFirst({
      where: { id: input.salesPeriodId, storeId: session.storeId },
      include: { lines: true },
    }),
    prisma.actualUsagePeriod.findFirst({
      where: { id: input.actualUsagePeriodId, storeId: session.storeId },
      include: { lines: true },
    }),
  ]);

  if (!salesPeriod) throw notFound("판매 기간을 찾을 수 없습니다.");

  if (!actualPeriod) throw notFound("실사용 기간을 찾을 수 없습니다.");

  const { preps, ingredientRows } = await loadCostingContext(
    session.storeId,
  );

  const menus = await prisma.menuItem.findMany({
    where: { storeId: session.storeId },
    include: { lines: true },
  });

  const menuById = new Map(menus.map((m) => [m.id, m] as const));
  const menusWithSales = new Set<string>();
  const theoMaps: Array<Map<string, number>> = [];

  let recipeLineCount = 0;

  for (const sale of salesPeriod.lines) {
    const menu = menuById.get(sale.menuItemId);

    if (!menu) continue;

    menusWithSales.add(menu.id);
    recipeLineCount += menu.lines.length;

    try {
      const lines = menu.lines.map(toRecipeLineInput);
      const perPortion = expandRecipeToIngredients(lines, preps);
      theoMaps.push(scaleIngredientQty(perPortion, n(sale.qty)));
    } catch (error) {
      if (isMappableError(error)) throw toAppError(error);
      throw error;
    }
  }

  const theoQtyByIngredient = mergeIngredientQty(theoMaps);

  const actualByIngredient = new Map(
    actualPeriod.lines.map((line) => [line.ingredientId, line] as const),
  );

  const ingredientIds = new Set([
    ...theoQtyByIngredient.keys(),
    ...actualByIngredient.keys(),
  ]);

  const varianceLines: VarianceLineInput[] = [];

  const rowById = new Map(ingredientRows.map((r) => [r.id, r] as const));

  for (const ingredientId of ingredientIds) {
    // Actual usage is counted in purchased (raw) units, so compare raw vs raw:
    // theoretical raw qty = usable qty / yieldRate, priced at purchase unit cost.
    const row = rowById.get(ingredientId);
    const yieldRate = row ? n(row.yieldRate) : 1;
    const unitCost = row ? n(row.currentUnitCost) : 0;

    const theoQty = rawQtyFromUsable(
      theoQtyByIngredient.get(ingredientId) ?? 0,
      yieldRate,
    );

    const actualRow = actualByIngredient.get(ingredientId);
    let actual: ActualUsageInput | null = null;

    if (actualRow?.actualQty != null) {
      actual = { kind: "QTY", actualQty: n(actualRow.actualQty) };
    } else if (actualRow?.actualCost != null) {
      actual = { kind: "COST", actualCost: n(actualRow.actualCost) };
    }

    varianceLines.push({
      ingredientId,
      theoQty,
      unitCost,
      actual,
    });
  }

  const nameById = new Map(ingredientRows.map((r) => [r.id, r.name] as const));

  const evidence = {
    salesLineCount: salesPeriod.lines.length,
    actualLineCount: actualPeriod.lines.length,
    menusWithSales: menusWithSales.size,
    menusExcludedNoSales: menus.filter((m) => m.isActive).length - menusWithSales.size,
  };

  const computed = calculateVarianceRun({
    hasSales: salesPeriod.lines.length > 0,
    hasActualUsage: actualPeriod.lines.length > 0,
    hasRecipes: recipeLineCount > 0 || menus.some((m) => m.lines.length > 0),
    lines: varianceLines,
  });

  const asOfAt = input.asOfAt
    ? new Date(input.asOfAt)
    : salesPeriod.periodEnd;

  if (computed.status === "INSUFFICIENT_DATA") {
    const run = await prisma.analysisRun.create({
      data: {
        storeId: session.storeId,
        type: "VARIANCE",
        periodStart: salesPeriod.periodStart,
        periodEnd: salesPeriod.periodEnd,
        salesPeriodId: salesPeriod.id,
        actualUsagePeriodId: actualPeriod.id,
        status: "INSUFFICIENT_DATA",
        insufficientReason: computed.insufficientReason,
        evidenceJson: evidence,
      },
    });

    return {
      analysisRunId: run.id,
      status: "INSUFFICIENT_DATA" as const,
      costBasisSnapshotId: null,
      metricType: METRIC_TYPE_CONTRIBUTION,
      results: [] as const,
      insufficientReason: computed.insufficientReason,
      evidence,
    };
  }

  const snapshot = await createCostBasisSnapshot({
    storeId: session.storeId,
    basisType: "PERIOD_END",
    asOfAt,
    periodStart: salesPeriod.periodStart,
    periodEnd: salesPeriod.periodEnd,
    channelId: input.channelId ?? null,
    basisVersion: "variance-v1",
    label: `variance ${salesPeriod.periodStart.toISOString().slice(0, 10)}`,
  });

  const run = await prisma.analysisRun.create({
    data: {
      storeId: session.storeId,
      type: "VARIANCE",
      periodStart: salesPeriod.periodStart,
      periodEnd: salesPeriod.periodEnd,
      costBasisSnapshotId: snapshot.id,
      salesPeriodId: salesPeriod.id,
      actualUsagePeriodId: actualPeriod.id,
      status: "COMPLETED",
      evidenceJson: evidence,
      varianceResults: {
        create: computed.results.map((row) => ({
          ingredientId: row.ingredientId,
          theoQty: d(row.theoQty),
          theoAmt: d(row.theoAmt),
          actualQty: decimalOrNull(row.actualQty),
          actualCost: decimalOrNull(row.actualCost),
          actualAmt: decimalOrNull(row.actualAmt),
          varianceQty: decimalOrNull(row.varianceQty),
          varianceAmt: decimalOrNull(row.varianceAmt),
          varianceRate: decimalOrNull(row.varianceRate),
          unitCostUsed: d(row.unitCostUsed),
        })),
      },
    },
    include: { varianceResults: true },
  });

  return {
    analysisRunId: run.id,
    status: "COMPLETED" as const,
    costBasisSnapshotId: snapshot.id,
    metricType: METRIC_TYPE_CONTRIBUTION,
    results: computed.results.map((row) => ({
      ...row,
      name: nameById.get(row.ingredientId) ?? row.ingredientId,
    })),
    evidence,
  };
}

export async function getVarianceTrend(input: {
  from?: string;
  to?: string;
}) {
  const session = await requireSession();

  let runs;

  if (input.from && input.to) {
    runs = await prisma.analysisRun.findMany({
      where: {
        storeId: session.storeId,
        type: "VARIANCE",
        status: "COMPLETED",
        periodStart: {
          gte: dateOnly(input.from),
          lte: dateOnly(input.to),
        },
      },
      include: { varianceResults: true },
      orderBy: { periodStart: "asc" },
    });
  } else if (input.from) {
    runs = await prisma.analysisRun.findMany({
      where: {
        storeId: session.storeId,
        type: "VARIANCE",
        status: "COMPLETED",
        periodStart: { gte: dateOnly(input.from) },
      },
      include: { varianceResults: true },
      orderBy: { periodStart: "asc" },
    });
  } else if (input.to) {
    runs = await prisma.analysisRun.findMany({
      where: {
        storeId: session.storeId,
        type: "VARIANCE",
        status: "COMPLETED",
        periodStart: { lte: dateOnly(input.to) },
      },
      include: { varianceResults: true },
      orderBy: { periodStart: "asc" },
    });
  } else {
    runs = await prisma.analysisRun.findMany({
      where: {
        storeId: session.storeId,
        type: "VARIANCE",
        status: "COMPLETED",
      },
      include: { varianceResults: true },
      orderBy: { periodStart: "asc" },
    });
  }

  return runs.map((run) => {
    const results = run.varianceResults.map((row) => ({
      ingredientId: row.ingredientId,
      theoQty: n(row.theoQty ?? 0),
      theoAmt: n(row.theoAmt ?? 0),
      actualQty: row.actualQty ? n(row.actualQty) : null,
      actualCost: row.actualCost ? n(row.actualCost) : null,
      actualAmt: row.actualAmt ? n(row.actualAmt) : null,
      varianceQty: row.varianceQty ? n(row.varianceQty) : null,
      varianceAmt: row.varianceAmt ? n(row.varianceAmt) : null,
      varianceRate: row.varianceRate ? n(row.varianceRate) : null,
      unitCostUsed: n(row.unitCostUsed),
      status:
        row.varianceAmt === null && row.actualQty === null && row.actualCost === null
          ? ("MISSING_ACTUAL" as const)
          : ("COMPARED" as const),
    }));

    const summary = summarizeVariancePeriod(results);

    return {
      analysisRunId: run.id,
      periodStart: run.periodStart?.toISOString().slice(0, 10) ?? null,
      periodEnd: run.periodEnd?.toISOString().slice(0, 10) ?? null,
      metricType: METRIC_TYPE_CONTRIBUTION,
      ...summary,
    };
  });
}
