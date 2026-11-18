import { Prisma } from "@prisma/client";
import { validateChannelFees } from "@/domain";
import { conflict, notFound, validationError } from "@/lib/errors";
import { isMappableError, toAppError } from "@/lib/domain-map";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/store-service";
import { d, n } from "@/server/decimal";

function serialize(row: {
  id: string;
  name: string;
  channelFeeRate: Prisma.Decimal;
  paymentFeeRate: Prisma.Decimal;
  deliveryFeeRate: Prisma.Decimal;
  deliveryFeeFixed: Prisma.Decimal;
  feeBasis: string;
  isDefault: boolean;
}) {
  return {
    id: row.id,
    name: row.name,
    channelFeeRate: n(row.channelFeeRate),
    paymentFeeRate: n(row.paymentFeeRate),
    deliveryFeeRate: n(row.deliveryFeeRate),
    deliveryFeeFixed: n(row.deliveryFeeFixed),
    feeBasis: row.feeBasis,
    isDefault: row.isDefault,
  };
}

export async function listChannels() {
  const session = await requireSession();

  const rows = await prisma.salesChannel.findMany({
    where: { storeId: session.storeId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return rows.map(serialize);
}

export async function createChannel(input: {
  name: string;
  channelFeeRate: number;
  paymentFeeRate: number;
  deliveryFeeRate: number;
  deliveryFeeFixed: number;
  isDefault?: boolean;
}) {
  const session = await requireSession();
  const name = input.name.trim();

  if (!name) throw validationError("채널명이 필요합니다.");

  try {
    validateChannelFees(input);
  } catch (error) {
    if (isMappableError(error)) throw toAppError(error);
    throw error;
  }

  try {
    const row = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.salesChannel.updateMany({
          where: { storeId: session.storeId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const count = await tx.salesChannel.count({
        where: { storeId: session.storeId },
      });

      return tx.salesChannel.create({
        data: {
          storeId: session.storeId,
          name,
          channelFeeRate: d(input.channelFeeRate),
          paymentFeeRate: d(input.paymentFeeRate),
          deliveryFeeRate: d(input.deliveryFeeRate),
          deliveryFeeFixed: d(input.deliveryFeeFixed),
          feeBasis: "PER_MENU_ITEM",
          isDefault: input.isDefault ?? count === 0,
        },
      });
    });

    return serialize(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflict("같은 이름의 판매 채널이 이미 있습니다.");
    }

    throw error;
  }
}

export async function updateChannel(
  id: string,
  input: Partial<{
    name: string;
    channelFeeRate: number;
    paymentFeeRate: number;
    deliveryFeeRate: number;
    deliveryFeeFixed: number;
    isDefault: boolean;
  }>,
) {
  const session = await requireSession();

  const existing = await prisma.salesChannel.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!existing) throw notFound("판매 채널을 찾을 수 없습니다.");

  const fees = {
    channelFeeRate: input.channelFeeRate ?? n(existing.channelFeeRate),
    paymentFeeRate: input.paymentFeeRate ?? n(existing.paymentFeeRate),
    deliveryFeeRate: input.deliveryFeeRate ?? n(existing.deliveryFeeRate),
    deliveryFeeFixed: input.deliveryFeeFixed ?? n(existing.deliveryFeeFixed),
  };

  try {
    validateChannelFees(fees);
  } catch (error) {
    if (isMappableError(error)) throw toAppError(error);
    throw error;
  }

  const row = await prisma.$transaction(async (tx) => {
    if (input.isDefault === true) {
      await tx.salesChannel.updateMany({
        where: { storeId: session.storeId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.salesChannel.update({
      where: { id },
      data: {
        name: input.name?.trim() ?? existing.name,
        channelFeeRate: d(fees.channelFeeRate),
        paymentFeeRate: d(fees.paymentFeeRate),
        deliveryFeeRate: d(fees.deliveryFeeRate),
        deliveryFeeFixed: d(fees.deliveryFeeFixed),
        isDefault: input.isDefault ?? existing.isDefault,
      },
    });
  });

  return serialize(row);
}

export async function deleteChannel(id: string) {
  const session = await requireSession();

  const existing = await prisma.salesChannel.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!existing) throw notFound("판매 채널을 찾을 수 없습니다.");
  await prisma.salesChannel.delete({ where: { id } });

  return { id };
}
