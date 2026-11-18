import { Prisma } from "@prisma/client";
import {
  effectiveUnitCost,
  type ChannelFeesInput,
  type IngredientRef,
  type PrepRef,
  type RecipeLineInput,
} from "@/domain";
import { dataInsufficient, validationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { n } from "@/server/decimal";

type RecipeLineRow = {
  componentType: "INGREDIENT" | "PREP";
  ingredientId: string | null;
  componentPrepId: string | null;
  qty: Prisma.Decimal;
  unit: "G" | "ML" | "EA";
};

export function toRecipeLineInput(line: RecipeLineRow): RecipeLineInput {
  const qty = n(line.qty);

  if (line.componentType === "INGREDIENT" && line.ingredientId) {
    return {
      componentType: "INGREDIENT",
      ingredientId: line.ingredientId,
      qty,
      unit: line.unit,
    };
  }

  if (line.componentType === "PREP" && line.componentPrepId) {
    return {
      componentType: "PREP",
      componentPrepId: line.componentPrepId,
      qty,
      unit: line.unit,
    };
  }

  throw validationError("잘못된 레시피 라인입니다.");
}

export async function loadCostingContext(storeId: string) {
  const [ingredientRows, prepRows] = await Promise.all([
    prisma.ingredient.findMany({ where: { storeId } }),
    prisma.prepRecipe.findMany({
      where: { storeId },
      include: { lines: true },
    }),
  ]);

  const ingredients = new Map<string, IngredientRef>();

  for (const row of ingredientRows) {
    ingredients.set(row.id, {
      id: row.id,
      // Recipe qty is usable qty → cost per usable unit (손질 수율 반영)
      unitCost: effectiveUnitCost(n(row.currentUnitCost), n(row.yieldRate)),
      baseUnit: row.baseUnit,
    });
  }

  const preps = new Map<string, PrepRef>();

  for (const row of prepRows) {
    preps.set(row.id, {
      id: row.id,
      yieldQty: n(row.yieldQty),
      yieldUnit: row.yieldUnit,
      lines: row.lines.map(toRecipeLineInput),
    });
  }

  return { ingredients, preps, ingredientRows, prepRows };
}

export async function resolveFees(
  storeId: string,
  channelId?: string | null,
): Promise<{ channelId: string; fees: ChannelFeesInput }> {
  const channel = channelId
    ? await prisma.salesChannel.findFirst({
        where: { id: channelId, storeId },
      })
    : await prisma.salesChannel.findFirst({
        where: { storeId, isDefault: true },
      });

  if (!channel) {
    throw dataInsufficient(
      "판매 채널이 없습니다. 판매량 화면에서 홀·배민 같은 판매 채널을 먼저 추가하세요.",
    );
  }

  return {
    channelId: channel.id,
    fees: {
      channelFeeRate: n(channel.channelFeeRate),
      paymentFeeRate: n(channel.paymentFeeRate),
      deliveryFeeRate: n(channel.deliveryFeeRate),
      deliveryFeeFixed: n(channel.deliveryFeeFixed),
    },
  };
}
