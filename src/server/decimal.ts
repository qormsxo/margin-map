import { Prisma } from "@prisma/client";

export function d(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/** Convert Prisma Decimal / number / numeric string to JS number at the DB boundary. */
export function n(value: Prisma.Decimal | number | string): number {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  return Number(value);
}
