import {
  METRIC_TYPE_CONTRIBUTION,
  calculateMenuProfitability,
  type ContributionSalesRow,
} from "@/domain";
import { prisma } from "@/lib/prisma";
import { getContributionAnalysis } from "@/server/contribution-analysis-service";
import {
  loadCostingContext,
  resolveFees,
  toRecipeLineInput,
} from "@/server/costing-context";
import { n } from "@/server/decimal";
import { requireSession } from "@/server/store-service";
import { isMappableError, toAppError } from "@/lib/domain-map";

export async function getIntegratedDashboard(input?: {
  channelId?: string;
  salesPeriodId?: string;
}) {
  const session = await requireSession();

  const { channelId } = await resolveFees(
    session.storeId,
    input?.channelId,
  );

  const empty = (message: string, requiredInput: string) => ({
    available: false as const,
    message,
    requiredInput,
  });

  // 1) Menu profitability (current master)
  const { ingredients, preps } = await loadCostingContext(session.storeId);
  const { fees } = await resolveFees(session.storeId, channelId);

  const menus = await prisma.menuItem.findMany({
    where: { storeId: session.storeId, isActive: true },
    include: { lines: true },
  });

  const profitabilityMenus = [];

  for (const menu of menus) {
    if (menu.lines.length === 0) continue;

    try {
      const result = calculateMenuProfitability({
        sellingPrice: n(menu.sellingPrice),
        lines: menu.lines.map(toRecipeLineInput),
        ingredients,
        preps,
        fees,
      });

      profitabilityMenus.push({
        menuItemId: menu.id,
        name: menu.name,
        sellingPrice: result.sellingPrice,
        ingredientCost: result.ingredientCost,
        contribution: result.contribution,
        contributionMargin: result.contributionMargin,
      });
    } catch (error) {
      if (isMappableError(error)) throw toAppError(error);
      throw error;
    }
  }

  const profitability =
    profitabilityMenus.length === 0
      ? {
          ...empty(
            "메뉴 레시피가 없어 공헌이익을 표시할 수 없습니다.",
            "메뉴와 레시피를 등록하세요.",
          ),
          items: [],
        }
      : {
          available: true as const,
          costAsOf: "CURRENT_MASTER" as const,
          channelId,
          metricType: METRIC_TYPE_CONTRIBUTION,
          items: profitabilityMenus,
        };

  // 2) Latest price impact (most recent history across ingredients)
  const latestHistory = await prisma.ingredientPriceHistory.findMany({
    where: { ingredient: { storeId: session.storeId } },
    orderBy: { effectiveAt: "desc" },
    take: 5,
    include: { ingredient: true },
  });

  const priceImpact =
    latestHistory.length === 0
      ? empty(
          "식재료 가격 변경 이력이 없습니다.",
          "식재료 구매가를 변경하면 영향 분석이 표시됩니다.",
        )
      : {
          available: true as const,
          metricType: METRIC_TYPE_CONTRIBUTION,
          items: latestHistory.map((h) => ({
            historyId: h.id,
            ingredientId: h.ingredientId,
            ingredientName: h.ingredient.name,
            previousUnitCost: n(h.previousUnitCost),
            newUnitCost: n(h.newUnitCost),
            previousPurchasePrice: h.previousPurchasePrice ? n(h.previousPurchasePrice) : null,
            newPurchasePrice: h.newPurchasePrice ? n(h.newPurchasePrice) : null,
            effectiveAt: h.effectiveAt.toISOString(),
            impactPath: `/api/v1/ingredients/${h.ingredientId}/price-impact?historyId=${h.id}`,
          })),
        };

  // 3) Latest variance run
  const latestVariance = await prisma.analysisRun.findFirst({
    where: {
      storeId: session.storeId,
      type: "VARIANCE",
    },
    orderBy: { createdAt: "desc" },
    include: { varianceResults: true },
  });

  const variance =
    !latestVariance
      ? empty(
          "이론–실제 차이 분석이 없습니다.",
          "판매량과 실제 사용량을 입력하면 레시피대로 썼는지 비교해 드립니다.",
        )
      : latestVariance.status === "INSUFFICIENT_DATA"
        ? {
            available: false as const,
            message: "최근 차이 분석에 데이터가 부족합니다.",
            requiredInput:
              latestVariance.insufficientReason === "NO_SALES"
                ? "이 기간 판매량을 입력하세요."
                : latestVariance.insufficientReason === "NO_ACTUAL_USAGE"
                  ? "이 기간 실제 사용량을 입력하세요."
                  : latestVariance.insufficientReason === "NO_RECIPES"
                    ? "메뉴 레시피를 등록하세요."
                    : "판매량·실제 사용량·레시피를 확인하세요.",
            analysisRunId: latestVariance.id,
            status: latestVariance.status,
            periodStart: latestVariance.periodStart
              ?.toISOString()
              .slice(0, 10) ?? null,
            periodEnd: latestVariance.periodEnd
              ?.toISOString()
              .slice(0, 10) ?? null,
          }
        : {
            available: true as const,
            analysisRunId: latestVariance.id,
            status: latestVariance.status,
            periodStart: latestVariance.periodStart
              ?.toISOString()
              .slice(0, 10) ?? null,
            periodEnd: latestVariance.periodEnd
              ?.toISOString()
              .slice(0, 10) ?? null,
            metricType: METRIC_TYPE_CONTRIBUTION,
            comparedCount: latestVariance.varianceResults.filter(
              (r) => r.varianceAmt !== null,
            ).length,
            totalVarianceAmt: latestVariance.varianceResults.reduce(
              (sum, r) => sum + (r.varianceAmt ? n(r.varianceAmt) : 0),
              0,
            ),
          };

  // 4) Weekly alerts (unacknowledged)
  const alerts = await prisma.alert.findMany({
    where: { storeId: session.storeId, acknowledgedAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const weekly =
    alerts.length === 0
      ? empty(
          "확인이 필요한 주간 이상 징후가 없습니다.",
          "알림 화면에서 주간 점검을 하면 지난주와 비교해 알려 드립니다.",
        )
      : {
          available: true as const,
          count: alerts.length,
          items: alerts.map((a) => ({
            id: a.id,
            ruleId: a.ruleId,
            title: a.title,
            body: a.body,
            weekStart: a.weekStart.toISOString().slice(0, 10),
            severity: a.severity,
            evidence: a.evidenceJson,
          })),
        };

  // 5) Contribution by sales (optional period)
  type ContributionSection =
    | {
        available: false;
        message: string;
        requiredInput: string;
        periodId?: string;
        periodStart?: string;
        periodEnd?: string;
      }
    | {
        available: true;
        status: "COMPLETED";
        periodId: string;
        periodStart: string;
        periodEnd: string;
        costAsOf: "CURRENT_MASTER";
        metricType: typeof METRIC_TYPE_CONTRIBUTION;
        menus: ContributionSalesRow[];
        highSalesLowContrib: ContributionSalesRow[];
        lowSalesHighContrib: ContributionSalesRow[];
        excludedMenuCount: number;
        evidence: {
          periodStart: string;
          periodEnd: string;
          salesLineCount: number;
          basis: "CURRENT_MASTER";
          metricType: typeof METRIC_TYPE_CONTRIBUTION;
          channelId?: string;
        };
      };

  let contribution: ContributionSection;

  const period =
    input?.salesPeriodId
      ? await prisma.salesPeriod.findFirst({
          where: { id: input.salesPeriodId, storeId: session.storeId },
        })
      : await prisma.salesPeriod.findFirst({
          where: { storeId: session.storeId },
          orderBy: { periodStart: "desc" },
        });

  if (!period) {
    contribution = empty(
      "판매 기간이 없습니다.",
      "판매 기간과 메뉴별 판매량을 입력하면 어떤 메뉴가 돈을 버는지 보여 드립니다.",
    );
  } else {
    const analysis = await getContributionAnalysis({
      periodId: period.id,
      channelId,
    });

    const periodStart = period.periodStart.toISOString().slice(0, 10);
    const periodEnd = period.periodEnd.toISOString().slice(0, 10);

    if (analysis.status === "INSUFFICIENT_DATA") {
      contribution = {
        available: false,
        message: analysis.emptyState.message,
        requiredInput: analysis.emptyState.requiredInput,
        periodId: period.id,
        periodStart,
        periodEnd,
      };
    } else {
      contribution = {
        available: true,
        status: "COMPLETED",
        periodId: analysis.periodId,
        periodStart,
        periodEnd,
        costAsOf: "CURRENT_MASTER",
        metricType: METRIC_TYPE_CONTRIBUTION,
        menus: analysis.menus,
        highSalesLowContrib: analysis.highSalesLowContrib,
        lowSalesHighContrib: analysis.lowSalesHighContrib,
        excludedMenuCount: analysis.excludedMenuCount,
        evidence: analysis.evidence,
      };
    }
  }

  return {
    metricType: METRIC_TYPE_CONTRIBUTION,
    generatedAt: new Date().toISOString(),
    channelId,
    sections: {
      profitability,
      priceImpact,
      variance,
      weekly,
      contribution,
    },
  };
}
