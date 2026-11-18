import { roundRate } from "./money";

export const WEEKLY_BASIS_VERSION = "weekly-rules-v1";

export const WEEKLY_RULES_V1 = {
  /** E1: ingredient cost WoW increase threshold (ratio). */
  e1CostIncreaseRate: 0.05,
  /** E2: contribution margin drop in percentage points (absolute). */
  e2MarginDropPp: 0.03,
  /** E3: variance rate worsening in percentage points. */
  e3VarianceRateWorsenPp: 0.05,
} as const;

export type WeeklyRuleId = "E1" | "E2" | "E3" | "E4";

export type WeeklyMenuMetric = {
  menuItemId: string;
  name: string;
  ingredientCost: number;
  contributionMargin: number | null;
};

export type WeeklyVarianceMetric = {
  ingredientId: string;
  name: string;
  varianceRate: number;
};

export type WeeklyPriceShock = {
  ingredientId: string;
  historyId: string;
  previousUnitCost: number;
  newUnitCost: number;
  affectedMenuIds: string[];
};

export type WeeklyAlertCandidate = {
  ruleId: WeeklyRuleId;
  severity: "INFO" | "WARN";
  title: string;
  body: string;
  entityType: "MENU" | "INGREDIENT" | null;
  entityId: string | null;
  evidence: {
    currentValue: number;
    priorValue: number | null;
    threshold: number;
    relatedHistoryId?: string;
  };
};

export type WeeklyEvaluationResult =
  | {
      dataSufficient: false;
      insufficientReason: string;
      alerts: [];
    }
  | {
      dataSufficient: true;
      insufficientReason: null;
      alerts: WeeklyAlertCandidate[];
    };

/**
 * Rule-based weekly anomaly detection (DF-E).
 * Requires a prior week comparable snapshot; otherwise returns no alerts.
 */
export function evaluateWeeklyRules(input: {
  hasPriorWeek: boolean;
  currentMenus: WeeklyMenuMetric[];
  priorMenus: WeeklyMenuMetric[];
  currentVariances: WeeklyVarianceMetric[];
  priorVariances: WeeklyVarianceMetric[];
  priceShocks: WeeklyPriceShock[];
  thresholds?: Partial<typeof WEEKLY_RULES_V1>;
}): WeeklyEvaluationResult {
  if (!input.hasPriorWeek) {
    return {
      dataSufficient: false,
      insufficientReason: "NEED_PRIOR_WEEK",
      alerts: [],
    };
  }

  const t = { ...WEEKLY_RULES_V1, ...input.thresholds };
  const alerts: WeeklyAlertCandidate[] = [];

  const priorByMenu = new Map(
    input.priorMenus.map((m) => [m.menuItemId, m] as const),
  );

  const priorVarByIng = new Map(
    input.priorVariances.map((v) => [v.ingredientId, v] as const),
  );

  for (const current of input.currentMenus) {
    const prior = priorByMenu.get(current.menuItemId);

    if (!prior) continue;

    if (prior.ingredientCost > 0) {
      const wow = current.ingredientCost / prior.ingredientCost - 1;

      if (wow >= t.e1CostIncreaseRate) {
        alerts.push({
          ruleId: "E1",
          severity: "WARN",
          title: "메뉴 식재료원가 상승",
          body: `${current.name} 식재료원가가 전주 대비 ${(wow * 100).toFixed(1)}% 상승했습니다.`,
          entityType: "MENU",
          entityId: current.menuItemId,
          evidence: {
            currentValue: current.ingredientCost,
            priorValue: prior.ingredientCost,
            threshold: t.e1CostIncreaseRate,
          },
        });
      }
    }

    if (
      current.contributionMargin !== null &&
      prior.contributionMargin !== null
    ) {
      const drop = current.contributionMargin - prior.contributionMargin;

      if (drop <= -t.e2MarginDropPp) {
        alerts.push({
          ruleId: "E2",
          severity: "WARN",
          title: "공헌이익률 하락",
          body: `${current.name} 공헌이익률이 전주 대비 ${(Math.abs(drop) * 100).toFixed(1)}%p 하락했습니다.`,
          entityType: "MENU",
          entityId: current.menuItemId,
          evidence: {
            currentValue: current.contributionMargin,
            priorValue: prior.contributionMargin,
            threshold: t.e2MarginDropPp,
          },
        });
      }
    }
  }

  for (const current of input.currentVariances) {
    const prior = priorVarByIng.get(current.ingredientId);

    if (!prior) continue;

    const worsen = current.varianceRate - prior.varianceRate;

    if (worsen >= t.e3VarianceRateWorsenPp) {
      alerts.push({
        ruleId: "E3",
        severity: "WARN",
        title: "이론–실제 차이 확대",
        body: `${current.name} 차이율이 전주 대비 ${(worsen * 100).toFixed(1)}%p 악화했습니다.`,
        entityType: "INGREDIENT",
        entityId: current.ingredientId,
        evidence: {
          currentValue: current.varianceRate,
          priorValue: prior.varianceRate,
          threshold: t.e3VarianceRateWorsenPp,
        },
      });
    }
  }

  for (const shock of input.priceShocks) {
    if (shock.newUnitCost <= shock.previousUnitCost) continue;

    for (const menuItemId of shock.affectedMenuIds) {
      const menu = input.currentMenus.find((m) => m.menuItemId === menuItemId);

      const deltaRate =
        shock.previousUnitCost === 0
          ? null
          : roundRate(
              (shock.newUnitCost - shock.previousUnitCost) /
                shock.previousUnitCost,
            );

      alerts.push({
        ruleId: "E4",
        severity: "INFO",
        title: "식재료 가격 상승 영향",
        body: menu
          ? `${menu.name}이(가) 단가 상승 재료의 영향을 받습니다.`
          : `메뉴 ${menuItemId}이(가) 단가 상승 재료의 영향을 받습니다.`,
        entityType: "MENU",
        entityId: menuItemId,
        evidence: {
          currentValue: shock.newUnitCost,
          priorValue: shock.previousUnitCost,
          threshold: deltaRate ?? 0,
          relatedHistoryId: shock.historyId,
        },
      });
    }
  }

  return {
    dataSufficient: true,
    insufficientReason: null,
    alerts,
  };
}

/** Monday 00:00 UTC date helper for ISO week starts (YYYY-MM-DD). */
export function assertIsoMonday(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);

  if (!match) {
    throw new Error(`weekStart must be YYYY-MM-DD, got ${dateStr}`);
  }

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(Date.UTC(y, m - 1, d));

  if (date.getUTCDay() !== 1) {
    throw new Error(`weekStart must be an ISO Monday, got ${dateStr}`);
  }

  return dateStr;
}

export function priorIsoMonday(weekStart: string): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  date.setUTCDate(date.getUTCDate() - 7);

  return date.toISOString().slice(0, 10);
}

export function weekEndFromStart(weekStart: string): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  date.setUTCDate(date.getUTCDate() + 6);

  return date.toISOString().slice(0, 10);
}
