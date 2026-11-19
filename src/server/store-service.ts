import { CHANNEL_PRESETS, findBusinessType } from "@/lib/business-types";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { notFound, unauthorized } from "@/lib/errors";

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    throw unauthorized();
  }

  return session;
}

export async function getCurrentStore() {
  const session = await requireSession();

  const store = await prisma.store.findFirst({
    where: {
      id: session.storeId,
      organizationId: session.organizationId,
    },
  });

  if (!store) {
    throw notFound("매장을 찾을 수 없습니다.");
  }

  return store;
}

export async function updateCurrentStore(input: { name: string }) {
  const session = await requireSession();
  const name = input.name.trim();

  if (!name) {
    const { validationError } = await import("@/lib/errors");
    throw validationError("매장명이 필요합니다.");
  }

  return prisma.store.update({
    where: { id: session.storeId },
    data: { name },
  });
}

export async function getMe() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true },
  });

  const organization = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { id: true, name: true },
  });

  const store = await getCurrentStore();

  if (!user || !organization) {
    throw notFound("사용자 또는 조직을 찾을 수 없습니다.");
  }

  return {
    user,
    organization,
    store: {
      id: store.id,
      name: store.name,
      currency: store.currency,
    },
  };
}

/** What the owner has entered so far (drives the dashboard setup checklist). */
export async function getSetupStatus() {
  const session = await requireSession();
  const storeId = session.storeId;

  const [ingredients, menus, channels, menusWithRecipe, salesPeriods, fixedCosts] =
    await Promise.all([
      prisma.ingredient.count({ where: { storeId } }),
      prisma.menuItem.count({ where: { storeId, isActive: true } }),
      prisma.salesChannel.count({ where: { storeId } }),
      prisma.menuItem.count({ where: { storeId, isActive: true, lines: { some: {} } } }),
      prisma.salesPeriod.count({ where: { storeId, lines: { some: {} } } }),
      prisma.fixedCostItem.count({ where: { storeId } }),
    ]);

  return { ingredients, menus, channels, menusWithRecipe, salesPeriods, fixedCosts };
}

/**
 * First-run setup: remember the business type and create the chosen sales channels
 * from fee presets, so profit can be computed without a separate channel step.
 * Safe to run again: existing channels are kept.
 */
export async function completeOnboarding(input: { businessType: string; channels: string[] }) {
  const session = await requireSession();
  const { validationError } = await import("@/lib/errors");

  if (!findBusinessType(input.businessType)) {
    throw validationError("업종을 선택하세요.");
  }

  const presets = CHANNEL_PRESETS.filter((p) => input.channels.includes(p.name));

  if (presets.length === 0) {
    throw validationError("판매 채널을 하나 이상 고르세요.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.store.update({
      where: { id: session.storeId },
      data: { businessType: input.businessType },
    });

    const existing = await tx.salesChannel.findMany({
      where: { storeId: session.storeId },
      select: { name: true, isDefault: true },
    });

    const existingNames = new Set(existing.map((c) => c.name));
    let hasDefault = existing.some((c) => c.isDefault);

    for (const preset of presets) {
      if (existingNames.has(preset.name)) continue;

      await tx.salesChannel.create({
        data: {
          storeId: session.storeId,
          name: preset.name,
          channelFeeRate: preset.channelFeeRate,
          paymentFeeRate: preset.paymentFeeRate,
          deliveryFeeRate: 0,
          deliveryFeeFixed: preset.deliveryFeeFixed,
          isDefault: !hasDefault,
        },
      });

      hasDefault = true;
    }
  });

  return { businessType: input.businessType };
}
