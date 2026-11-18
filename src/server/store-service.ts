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
