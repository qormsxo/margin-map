import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { conflict, unauthorized, validationError } from "@/lib/errors";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth/session";

export async function registerUser(input: {
  email: string;
  password: string;
  storeName: string;
  organizationName?: string;
}) {
  const email = input.email.trim().toLowerCase();

  if (!email || input.password.length < 8) {
    throw validationError("이메일과 8자 이상 비밀번호가 필요합니다.");
  }

  if (!input.storeName.trim()) {
    throw validationError("매장명이 필요합니다.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw conflict("이미 등록된 이메일입니다.");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const orgName = input.organizationName?.trim() || `${input.storeName.trim()} 조직`;

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash },
    });

    const organization = await tx.organization.create({
      data: { name: orgName },
    });

    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    const store = await tx.store.create({
      data: {
        organizationId: organization.id,
        name: input.storeName.trim(),
        currency: "KRW",
      },
    });

    return { user, organization, store };
  });

  await setSessionCookie({
    userId: result.user.id,
    storeId: result.store.id,
    organizationId: result.organization.id,
  });

  return {
    user: { id: result.user.id, email: result.user.email },
    organization: { id: result.organization.id, name: result.organization.name },
    store: {
      id: result.store.id,
      name: result.store.name,
      currency: result.store.currency,
    },
  };
}

export async function loginUser(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw unauthorized("이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);

  if (!valid) {
    throw unauthorized("이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: {
      organization: {
        include: { stores: { take: 1, orderBy: { createdAt: "asc" } } },
      },
    },
  });

  const store = membership?.organization.stores[0];

  if (!membership || !store) {
    throw unauthorized("연결된 매장이 없습니다.");
  }

  await setSessionCookie({
    userId: user.id,
    storeId: store.id,
    organizationId: membership.organizationId,
  });

  return {
    user: { id: user.id, email: user.email },
    store: { id: store.id, name: store.name, currency: store.currency },
  };
}

export async function logoutUser() {
  await clearSessionCookie();
}

/**
 * MVP: one store per organization. Reject additional stores.
 */
export async function assertSingleStoreLimit(organizationId: string) {
  const count = await prisma.store.count({ where: { organizationId } });

  if (count >= 1) {
    const { notImplementedMvp } = await import("@/lib/errors");
    throw notImplementedMvp("MVP에서는 계정당 매장 1개만 지원합니다.");
  }
}
