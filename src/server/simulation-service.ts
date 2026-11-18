import {
  METRIC_TYPE_CONTRIBUTION,
  calculateRequiredSellingPrice,
  previewSimulation,
  type SimulationOverrides,
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
import {
  isSimulationDraft,
  type SimulationDraft,
} from "@/server/simulation-draft";
import { requireSession } from "@/server/store-service";

export async function previewMenuSimulation(input: {
  channelId: string;
  menuIds?: string[];
  overrides: SimulationOverrides;
}) {
  const session = await requireSession();
  const { fees } = await resolveFees(session.storeId, input.channelId);
  const { ingredients, preps } = await loadCostingContext(session.storeId);

  const menus = input.menuIds
    ? await prisma.menuItem.findMany({
        where: {
          storeId: session.storeId,
          isActive: true,
          id: { in: input.menuIds },
        },
        include: { lines: true },
      })
    : await prisma.menuItem.findMany({
        where: {
          storeId: session.storeId,
          isActive: true,
        },
        include: { lines: true },
      });

  try {
    const result = previewSimulation({
      menus: menus
        .filter((m) => m.lines.length > 0)
        .map((menu) => ({
          menuItemId: menu.id,
          name: menu.name,
          sellingPrice: n(menu.sellingPrice),
          lines: menu.lines.map(toRecipeLineInput),
        })),
      ingredients,
      preps,
      fees,
      overrides: input.overrides,
    });

    return result;
  } catch (error) {
    if (isMappableError(error)) throw toAppError(error);
    throw error;
  }
}

export async function listSimulationScenarios() {
  const session = await requireSession();

  const rows = await prisma.simulationScenario.findMany({
    where: { storeId: session.storeId },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    draft: row.draft,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function createSimulationScenario(input: {
  name: string;
  draft: SimulationDraft;
}) {
  const session = await requireSession();
  const name = input.name.trim();

  if (!name) throw validationError("시나리오명이 필요합니다.");

  // Validate draft by running preview (no persist of overrides to master)
  await previewMenuSimulation(input.draft);

  const row = await prisma.simulationScenario.create({
    data: {
      storeId: session.storeId,
      name,
      draft: input.draft,
      status: "DRAFT",
    },
  });

  return {
    id: row.id,
    name: row.name,
    status: row.status,
    draft: row.draft,
    persistedOperational: false,
  };
}

export async function getSimulationScenario(id: string) {
  const session = await requireSession();

  const row = await prisma.simulationScenario.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!row) throw notFound("시나리오를 찾을 수 없습니다.");

  if (!isSimulationDraft(row.draft)) {
    throw validationError("시나리오 draft 형식이 올바르지 않습니다.");
  }

  const preview = await previewMenuSimulation(row.draft);

  return {
    id: row.id,
    name: row.name,
    status: row.status,
    draft: row.draft,
    preview,
    persistedOperational: false,
  };
}

export async function compareSimulationScenarios(ids: string[]) {
  const session = await requireSession();

  if (ids.length < 2) {
    throw validationError("비교하려면 시나리오가 2개 이상 필요합니다.");
  }

  const rows = await prisma.simulationScenario.findMany({
    where: { storeId: session.storeId, id: { in: ids } },
  });

  if (rows.length !== ids.length) {
    throw notFound("일부 시나리오를 찾을 수 없습니다.");
  }

  const comparisons = [];

  for (const row of rows) {
    if (!isSimulationDraft(row.draft)) {
      throw validationError("시나리오 draft 형식이 올바르지 않습니다.");
    }

    const preview = await previewMenuSimulation(row.draft);

    comparisons.push({
      scenarioId: row.id,
      name: row.name,
      preview,
    });
  }

  return {
    metricType: METRIC_TYPE_CONTRIBUTION,
    persistedOperational: false,
    scenarios: comparisons,
  };
}

export async function requiredPricePreview(input: {
  menuItemId: string;
  channelId: string;
  targetContributionMargin: number;
  ingredientCostOverride?: number;
}) {
  const session = await requireSession();
  const { getRequiredPrice } = await import("@/server/costing-service");

  if (input.ingredientCostOverride === undefined) {
    return getRequiredPrice(input);
  }

  const { fees } = await resolveFees(session.storeId, input.channelId);

  try {
    const requiredSellingPrice = calculateRequiredSellingPrice({
      ingredientCost: input.ingredientCostOverride,
      targetContributionMargin: input.targetContributionMargin,
      fees,
    });

    return {
      menuItemId: input.menuItemId,
      channelId: input.channelId,
      metricType: METRIC_TYPE_CONTRIBUTION,
      ingredientCost: input.ingredientCostOverride,
      targetContributionMargin: input.targetContributionMargin,
      requiredSellingPrice,
      persistedOperational: false,
    };
  } catch (error) {
    if (isMappableError(error)) throw toAppError(error);
    throw error;
  }
}
