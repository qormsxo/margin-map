import { BaseUnit, Prisma, TaxType } from "@prisma/client";
import {
  assertYieldRate,
  calculateUnitCostFromPurchase,
  effectiveUnitCost,
  type PurchaseUnit,
} from "@/domain";
import { conflict, notFound, validationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { isMappableError, toAppError } from "@/lib/domain-map";
import { requireSession } from "@/server/store-service";
import { d, n } from "@/server/decimal";
import { createPriceRiseAlert } from "@/server/price-impact-service";

function parsePurchaseUnit(value: string): PurchaseUnit {
  if (
    value === "G" ||
    value === "ML" ||
    value === "EA" ||
    value === "KG" ||
    value === "L"
  ) {
    return value;
  }

  throw validationError("지원하지 않는 구매 단위입니다.");
}

function parseYieldRate(value: number): number {
  try {
    return assertYieldRate(value);
  } catch {
    throw validationError("수율은 0 초과 100% 이하여야 합니다.");
  }
}

function serializeIngredient(row: {
  id: string;
  name: string;
  baseUnit: BaseUnit;
  purchaseQty: Prisma.Decimal;
  purchasePrice: Prisma.Decimal;
  taxType: TaxType;
  currentUnitCost: Prisma.Decimal;
  yieldRate: Prisma.Decimal;
  notes: string | null;
}) {
  const yieldRate = n(row.yieldRate);

  return {
    id: row.id,
    name: row.name,
    baseUnit: row.baseUnit,
    purchaseQty: n(row.purchaseQty),
    purchasePrice: n(row.purchasePrice),
    taxType: row.taxType,
    currentUnitCost: n(row.currentUnitCost),
    yieldRate,
    /** Cost per usable base unit after trim loss. */
    effectiveUnitCost: effectiveUnitCost(n(row.currentUnitCost), yieldRate),
    notes: row.notes,
  };
}

export async function listIngredients() {
  const session = await requireSession();

  const rows = await prisma.ingredient.findMany({
    where: { storeId: session.storeId },
    orderBy: { name: "asc" },
  });

  return rows.map(serializeIngredient);
}

export async function getIngredient(id: string) {
  const session = await requireSession();

  const row = await prisma.ingredient.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!row) throw notFound("식재료를 찾을 수 없습니다.");

  return serializeIngredient(row);
}

export async function createIngredient(input: {
  name: string;
  baseUnit: BaseUnit;
  purchaseQty: number;
  purchaseUnit?: PurchaseUnit;
  purchasePrice: number;
  taxType: TaxType;
  yieldRate?: number;
  notes?: string;
}) {
  const session = await requireSession();
  const name = input.name.trim();

  if (!name) throw validationError("식재료명이 필요합니다.");

  const yieldRate = parseYieldRate(input.yieldRate ?? 1);

  const purchaseUnit = parsePurchaseUnit(input.purchaseUnit ?? input.baseUnit);

  let purchaseQtyInBase: number;
  let unitCost: number;

  try {
    const computed = calculateUnitCostFromPurchase({
      purchasePrice: input.purchasePrice,
      purchaseQty: input.purchaseQty,
      purchaseUnit,
      baseUnit: input.baseUnit,
    });

    purchaseQtyInBase = computed.purchaseQtyInBase;
    unitCost = computed.unitCost;
  } catch (error) {
    if (isMappableError(error)) throw toAppError(error);
    throw error;
  }

  try {
    const row = await prisma.ingredient.create({
      data: {
        storeId: session.storeId,
        name,
        baseUnit: input.baseUnit,
        purchaseQty: d(purchaseQtyInBase),
        purchasePrice: d(input.purchasePrice),
        taxType: input.taxType,
        currentUnitCost: d(unitCost),
        yieldRate: d(yieldRate),
        notes: input.notes ?? null,
      },
    });

    return serializeIngredient(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflict("같은 이름의 식재료가 이미 있습니다.");
    }

    throw error;
  }
}

export async function updateIngredient(
  id: string,
  input: {
    name?: string;
    baseUnit?: BaseUnit;
    purchaseQty?: number;
    purchaseUnit?: PurchaseUnit;
    purchasePrice?: number;
    taxType?: TaxType;
    yieldRate?: number;
    notes?: string | null;
  },
) {
  const session = await requireSession();

  const existing = await prisma.ingredient.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!existing) throw notFound("식재료를 찾을 수 없습니다.");

  const baseUnit = input.baseUnit ?? existing.baseUnit;

  const purchasePrice =
    input.purchasePrice ?? n(existing.purchasePrice);

  const purchaseUnit = parsePurchaseUnit(input.purchaseUnit ?? baseUnit);

  // If only name/notes/tax change without qty/price/unit, keep qty as stored base qty.
  let purchaseQtyInBase = n(existing.purchaseQty);
  let unitCost = n(existing.currentUnitCost);

  const pricingTouched =
    input.purchaseQty !== undefined ||
    input.purchasePrice !== undefined ||
    input.purchaseUnit !== undefined ||
    input.baseUnit !== undefined;

  if (pricingTouched) {
    const qtyForCalc =
      input.purchaseQty !== undefined
        ? input.purchaseQty
        : n(existing.purchaseQty);

    const unitForCalc =
      input.purchaseQty !== undefined || input.purchaseUnit !== undefined
        ? purchaseUnit
        : baseUnit;

    try {
      const computed = calculateUnitCostFromPurchase({
        purchasePrice,
        purchaseQty: qtyForCalc,
        purchaseUnit: unitForCalc,
        baseUnit,
      });

      purchaseQtyInBase = computed.purchaseQtyInBase;
      unitCost = computed.unitCost;
    } catch (error) {
      if (isMappableError(error)) throw toAppError(error);
      throw error;
    }
  }

  const previousUnitCost = n(existing.currentUnitCost);
  const name = input.name?.trim() ?? existing.name;

  let historyId: string | null = null;

  try {
    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.ingredient.update({
        where: { id },
        data: {
          name,
          baseUnit,
          purchaseQty: d(purchaseQtyInBase),
          purchasePrice: d(purchasePrice),
          taxType: input.taxType ?? existing.taxType,
          currentUnitCost: d(unitCost),
          yieldRate:
            input.yieldRate === undefined
              ? existing.yieldRate
              : d(parseYieldRate(input.yieldRate)),
          notes: input.notes === undefined ? existing.notes : input.notes,
        },
      });

      if (pricingTouched && previousUnitCost !== unitCost) {
        const history = await tx.ingredientPriceHistory.create({
          data: {
            ingredientId: id,
            previousUnitCost: d(previousUnitCost),
            newUnitCost: d(unitCost),
            previousPurchasePrice: existing.purchasePrice,
            newPurchasePrice: d(purchasePrice),
            previousPurchaseQty: existing.purchaseQty,
            newPurchaseQty: d(purchaseQtyInBase),
            effectiveAt: new Date(),
            source: "MANUAL",
            createdByUserId: session.userId,
          },
        });

        historyId = history.id;
      }

      return updated;
    });

    if (historyId && unitCost > previousUnitCost) {
      await createPriceRiseAlert({
        storeId: session.storeId,
        ingredientId: id,
        ingredientName: row.name,
        historyId,
        previousPurchasePrice: n(existing.purchasePrice),
        newPurchasePrice: purchasePrice,
      });
    }

    return serializeIngredient(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflict("같은 이름의 식재료가 이미 있습니다.");
    }

    throw error;
  }
}

export async function deleteIngredient(id: string) {
  const session = await requireSession();

  const existing = await prisma.ingredient.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!existing) throw notFound("식재료를 찾을 수 없습니다.");

  try {
    await prisma.ingredient.delete({ where: { id } });

    return { id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw conflict("레시피에서 사용 중인 식재료는 삭제할 수 없습니다.");
    }

    throw error;
  }
}
