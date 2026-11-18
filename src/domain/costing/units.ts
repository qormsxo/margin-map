import { DomainError } from "./domain-error";
import { assertPositive } from "./money";

/** Canonical recipe / storage units (matches Prisma BaseUnit). */
export type BaseUnit = "G" | "ML" | "EA";

/** Units accepted on purchase input before conversion to BaseUnit. */
export type PurchaseUnit = BaseUnit | "KG" | "L";

export type UnitFamily = "MASS" | "VOLUME" | "COUNT";

const FAMILY: Record<PurchaseUnit, UnitFamily> = {
  G: "MASS",
  KG: "MASS",
  ML: "VOLUME",
  L: "VOLUME",
  EA: "COUNT",
};

/** Factor to convert 1 unit into the family's base (G, ML, or EA). */
const TO_FAMILY_BASE: Record<PurchaseUnit, number> = {
  G: 1,
  KG: 1000,
  ML: 1,
  L: 1000,
  EA: 1,
};

export function unitFamily(unit: PurchaseUnit): UnitFamily {
  const family = FAMILY[unit];

  if (!family) {
    throw new DomainError("UNIT_CONVERSION", `Unsupported unit: ${unit}`);
  }

  return family;
}

/**
 * Convert quantity from `from` to `to`.
 * Same family only (e.g. KG→G, L→ML). EA only converts to EA.
 */
export function convertQuantity(
  qty: number,
  from: PurchaseUnit,
  to: PurchaseUnit,
): number {
  assertPositive(qty, "qty");
  const fromFamily = unitFamily(from);
  const toFamily = unitFamily(to);

  if (fromFamily !== toFamily) {
    throw new DomainError(
      "UNIT_CONVERSION",
      `Cannot convert ${from} (${fromFamily}) to ${to} (${toFamily})`,
    );
  }

  const inFamilyBase = qty * TO_FAMILY_BASE[from];

  return inFamilyBase / TO_FAMILY_BASE[to];
}

/** Normalize purchase qty into the ingredient's baseUnit. */
export function toBaseUnitQty(
  qty: number,
  purchaseUnit: PurchaseUnit,
  baseUnit: BaseUnit,
): number {
  if (unitFamily(purchaseUnit) !== unitFamily(baseUnit)) {
    throw new DomainError(
      "UNIT_CONVERSION",
      `Purchase unit ${purchaseUnit} is incompatible with baseUnit ${baseUnit}`,
    );
  }

  return convertQuantity(qty, purchaseUnit, baseUnit);
}

export function assertSameUnitFamily(
  a: BaseUnit,
  b: BaseUnit,
  context: string,
) {
  if (unitFamily(a) !== unitFamily(b)) {
    throw new DomainError(
      "UNIT_CONVERSION",
      `${context}: unit mismatch (${a} vs ${b})`,
    );
  }
}
