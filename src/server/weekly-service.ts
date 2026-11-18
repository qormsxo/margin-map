import { z } from "zod";
import {
  METRIC_TYPE_CONTRIBUTION,
  WEEKLY_BASIS_VERSION,
  assertIsoMonday,
  calculateMenuProfitability,
  evaluateWeeklyRules,
  expandRecipeToIngredients,
  priorIsoMonday,
  weekEndFromStart,
  type WeeklyMenuMetric,
  type WeeklyPriceShock,
  type WeeklyVarianceMetric,
} from "@/domain";
import { validationError } from "@/lib/errors";
import { isMappableError, toAppError } from "@/lib/domain-map";
import { prisma } from "@/lib/prisma";
import {
  createCostBasisSnapshot,
  dateOnly,
} from "@/server/cost-basis-service";
import {
  loadCostingContext,
  resolveFees,
  toRecipeLineInput,
} from "@/server/costing-context";
import { n } from "@/server/decimal";
import { requireSession } from "@/server/store-service";

type MetricsPayload = {
  metricType: "CONTRIBUTION";
  menus: WeeklyMenuMetric[];
  variances: WeeklyVarianceMetric[];
};

const metricsPayloadSchema = z.object({
  metricType: z.literal("CONTRIBUTION"),
  menus: z.array(
    z.object({
      menuItemId: z.string(),
      name: z.string(),
      ingredientCost: z.number(),
      contributionMargin: z.number().nullable(),
    }),
  ),
  variances: z.array(
    z.object({
      ingredientId: z.string(),
      name: z.string(),
      varianceRate: z.number(),
    }),
  ),
});

function isMetricsPayload(value: unknown): value is MetricsPayload {
  return metricsPayloadSchema.safeParse(value).success;
}

async function buildCurrentMetrics(
  storeId: string,
  channelId: string,
): Promise<MetricsPayload> {
  const { ingredients, preps } = await loadCostingContext(storeId);
  const { fees } = await resolveFees(storeId, channelId);

  const menus = await prisma.menuItem.findMany({
    where: { storeId, isActive: true },
    include: { lines: true },
  });

  const menuMetrics: WeeklyMenuMetric[] = [];

  for (const menu of menus) {
    if (menu.lines.length === 0) continue;

    try {
      const lines = menu.lines.map(toRecipeLineInput);

      const result = calculateMenuProfitability({
        sellingPrice: n(menu.sellingPrice),
        lines,
        ingredients,
        preps,
        fees,
      });

      menuMetrics.push({
        menuItemId: menu.id,
        name: menu.name,
        ingredientCost: result.ingredientCost,
        contributionMargin: result.contributionMargin,
      });
    } catch (error) {
      if (isMappableError(error)) throw toAppError(error);
      throw error;
    }
  }

  return {
    metricType: METRIC_TYPE_CONTRIBUTION,
    menus: menuMetrics,
    variances: [],
  };
}

async function loadVarianceMetricsForWeek(
  storeId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<WeeklyVarianceMetric[]> {
  const run = await prisma.analysisRun.findFirst({
    where: {
      storeId,
      type: "VARIANCE",
      status: "COMPLETED",
      periodStart: { gte: weekStart },
      periodEnd: { lte: weekEnd },
    },
    include: {
      varianceResults: { include: { ingredient: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!run) return [];

  const out: WeeklyVarianceMetric[] = [];

  for (const row of run.varianceResults) {
    if (row.varianceRate == null) continue;

    out.push({
      ingredientId: row.ingredientId,
      name: row.ingredient.name,
      varianceRate: n(row.varianceRate),
    });
  }

  return out;
}

/** Evidence stored on PRICE_UP alerts (see createPriceRiseAlert). */
const priceAlertEvidenceSchema = z.object({ historyId: z.string() });

async function loadPriceShocks(
  storeId: string,
  weekStart: Date,
  weekEndExclusive: Date,
): Promise<WeeklyPriceShock[]> {
  const { preps } = await loadCostingContext(storeId);

  const rising = await prisma.ingredientPriceHistory.findMany({
    where: {
      ingredient: { storeId },
      effectiveAt: { gte: weekStart, lt: weekEndExclusive },
    },
  });

  const menus = await prisma.menuItem.findMany({
    where: { storeId, isActive: true },
    include: { lines: true },
  });

  // Price rises already alerted the moment they were saved (PRICE_UP) are not repeated.
  const alreadyAlerted = await prisma.alert.findMany({
    where: { storeId, ruleId: "PRICE_UP" },
    select: { evidenceJson: true },
  });

  const alertedHistoryIds = new Set(
    alreadyAlerted.flatMap((a) => {
      const parsed = priceAlertEvidenceSchema.safeParse(a.evidenceJson);

      return parsed.success ? [parsed.data.historyId] : [];
    }),
  );

  const shocks: WeeklyPriceShock[] = [];

  for (const history of rising) {
    if (!(n(history.newUnitCost) > n(history.previousUnitCost))) continue;

    if (alertedHistoryIds.has(history.id)) continue;

    const affectedMenuIds: string[] = [];

    for (const menu of menus) {
      const expanded = expandRecipeToIngredients(
        menu.lines.map(toRecipeLineInput),
        preps,
      );

      if ((expanded.get(history.ingredientId) ?? 0) > 0) {
        affectedMenuIds.push(menu.id);
      }
    }

    shocks.push({
      ingredientId: history.ingredientId,
      historyId: history.id,
      previousUnitCost: n(history.previousUnitCost),
      newUnitCost: n(history.newUnitCost),
      affectedMenuIds,
    });
  }

  return shocks;
}

export async function runWeeklyAnomalyCheck(input: {
  weekStart: string;
  channelId?: string;
}) {
  const session = await requireSession();

  let weekStartStr: string;

  try {
    weekStartStr = assertIsoMonday(input.weekStart);
  } catch (error) {
    void error;

    throw validationError("점검할 주의 월요일 날짜를 선택해 주세요.");
  }

  const weekEndStr = weekEndFromStart(weekStartStr);
  const priorStartStr = priorIsoMonday(weekStartStr);
  const weekStart = dateOnly(weekStartStr);
  const weekEnd = dateOnly(weekEndStr);
  const nextDay = new Date(weekEnd);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const weekEndExclusive = dateOnly(nextDay.toISOString().slice(0, 10));

  const { channelId } = await resolveFees(
    session.storeId,
    input.channelId,
  );

  const currentMetrics = await buildCurrentMetrics(session.storeId, channelId);
  currentMetrics.variances = await loadVarianceMetricsForWeek(
    session.storeId,
    weekStart,
    weekEnd,
  );

  const priorAny = await prisma.weeklySnapshot.findFirst({
    where: {
      storeId: session.storeId,
      weekStart: dateOnly(priorStartStr),
      channelId,
      basisVersion: WEEKLY_BASIS_VERSION,
    },
  });

  const priorPayload =
    priorAny && isMetricsPayload(priorAny.metricsJson)
      ? priorAny.metricsJson
      : null;

  const hasPriorWeek = priorPayload !== null && priorPayload.menus.length > 0;

  const priceShocks = await loadPriceShocks(
    session.storeId,
    weekStart,
    weekEndExclusive,
  );

  const evaluation = evaluateWeeklyRules({
    hasPriorWeek,
    currentMenus: currentMetrics.menus,
    priorMenus: priorPayload?.menus ?? [],
    currentVariances: currentMetrics.variances,
    priorVariances: priorPayload?.variances ?? [],
    priceShocks,
  });

  const snapshot = await createCostBasisSnapshot({
    storeId: session.storeId,
    basisType: "WEEKLY",
    asOfAt: weekEnd,
    weekStart,
    periodStart: weekStart,
    periodEnd: weekEnd,
    channelId,
    basisVersion: WEEKLY_BASIS_VERSION,
    label: `weekly ${weekStartStr}`,
  });

  const weekly = await prisma.$transaction(async (tx) => {
    const existing = await tx.weeklySnapshot.findMany({
      where: {
        storeId: session.storeId,
        weekStart,
        channelId,
        basisVersion: WEEKLY_BASIS_VERSION,
      },
      select: { id: true },
    });

    if (existing.length > 0) {
      await tx.alert.deleteMany({
        where: {
          weeklySnapshotId: { in: existing.map((row) => row.id) },
        },
      });
      await tx.weeklySnapshot.deleteMany({
        where: { id: { in: existing.map((row) => row.id) } },
      });
    }

    const created = await tx.weeklySnapshot.create({
      data: {
        storeId: session.storeId,
        weekStart,
        weekEnd,
        channelId,
        costBasisSnapshotId: snapshot.id,
        priorWeekStart: hasPriorWeek ? dateOnly(priorStartStr) : null,
        priorSnapshotId: priorAny?.id ?? null,
        basisVersion: WEEKLY_BASIS_VERSION,
        dataSufficient: evaluation.dataSufficient,
        insufficientReason: evaluation.insufficientReason,
        metricsJson: currentMetrics,
      },
    });

    if (evaluation.dataSufficient && evaluation.alerts.length > 0) {
      await tx.alert.createMany({
        data: evaluation.alerts.map((alert) => ({
          storeId: session.storeId,
          weekStart,
          ruleId: alert.ruleId,
          weeklySnapshotId: created.id,
          severity: alert.severity,
          title: alert.title,
          body: alert.body,
          entityType: alert.entityType,
          entityId: alert.entityId,
          evidenceJson: alert.evidence,
        })),
      });
    }

    return created;
  });

  const alerts = await prisma.alert.findMany({
    where: { weeklySnapshotId: weekly.id },
    orderBy: { createdAt: "asc" },
  });

  return {
    weeklySnapshotId: weekly.id,
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    channelId,
    basisVersion: WEEKLY_BASIS_VERSION,
    costBasisSnapshotId: snapshot.id,
    priorWeekStart: hasPriorWeek ? priorStartStr : null,
    dataSufficient: evaluation.dataSufficient,
    insufficientReason: evaluation.insufficientReason,
    metricType: METRIC_TYPE_CONTRIBUTION,
    alerts: alerts.map((alert) => ({
      id: alert.id,
      ruleId: alert.ruleId,
      severity: alert.severity,
      title: alert.title,
      body: alert.body,
      entityType: alert.entityType,
      entityId: alert.entityId,
      evidence: alert.evidenceJson,
    })),
  };
}
