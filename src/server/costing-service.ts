import {
  calculateMenuProfitability,
  calculateRequiredSellingPrice,
  type RecipeLineInput,
} from "@/domain";
import { dataInsufficient, notFound } from "@/lib/errors";
import { isMappableError, toAppError } from "@/lib/domain-map";
import { prisma } from "@/lib/prisma";
import {
  loadCostingContext,
  resolveFees,
  toRecipeLineInput,
} from "@/server/costing-context";
import { n } from "@/server/decimal";
import { requireSession } from "@/server/store-service";

export async function getMenuCosting(menuId: string, channelId?: string) {
  const session = await requireSession();

  const menu = await prisma.menuItem.findFirst({
    where: { id: menuId, storeId: session.storeId },
    include: { lines: true },
  });

  if (!menu) throw notFound("메뉴를 찾을 수 없습니다.");

  // No recipe → cost would be a fake 0 and margin ~100%. Refuse instead.
  if (menu.lines.length === 0) {
    throw dataInsufficient("레시피가 없어 재료비를 계산할 수 없습니다.");
  }

  const { ingredients, preps } = await loadCostingContext(session.storeId);

  const { channelId: resolvedChannelId, fees } = await resolveFees(
    session.storeId,
    channelId ?? menu.defaultChannelId,
  );

  const lines: RecipeLineInput[] = menu.lines.map(toRecipeLineInput);

  try {
    const result = calculateMenuProfitability({
      sellingPrice: n(menu.sellingPrice),
      lines,
      ingredients,
      preps,
      fees,
    });

    return {
      menuItemId: menu.id,
      name: menu.name,
      channelId: resolvedChannelId,
      ...result,
    };
  } catch (error) {
    if (isMappableError(error)) throw toAppError(error);
    throw error;
  }
}

export async function getRequiredPrice(input: {
  menuItemId: string;
  channelId?: string;
  targetContributionMargin: number;
}) {
  const session = await requireSession();

  const menu = await prisma.menuItem.findFirst({
    where: { id: input.menuItemId, storeId: session.storeId },
    include: { lines: true },
  });

  if (!menu) throw notFound("메뉴를 찾을 수 없습니다.");

  const { ingredients, preps } = await loadCostingContext(session.storeId);

  const { channelId, fees } = await resolveFees(
    session.storeId,
    input.channelId ?? menu.defaultChannelId,
  );

  const lines: RecipeLineInput[] = menu.lines.map(toRecipeLineInput);

  try {
    const ingredient = (
      await import("@/domain")
    ).calculateMenuIngredientCost(lines, ingredients, preps);

    const requiredSellingPrice = calculateRequiredSellingPrice({
      ingredientCost: ingredient.totalCost,
      targetContributionMargin: input.targetContributionMargin,
      fees,
    });

    return {
      menuItemId: menu.id,
      channelId,
      metricType: "CONTRIBUTION" as const,
      ingredientCost: ingredient.totalCost,
      targetContributionMargin: input.targetContributionMargin,
      requiredSellingPrice,
    };
  } catch (error) {
    if (isMappableError(error)) throw toAppError(error);
    throw error;
  }
}
