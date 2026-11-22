import bcrypt from "bcryptjs";
import { THROTTLE_POLICIES } from "@/domain/auth/throttle";
import { clearSessionCookie } from "@/lib/auth/session";
import { tooManyRequests, unauthorized, validationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertNotLocked, clearThrottle, lockedMessage, recordFailures } from "@/server/auth-throttle";
import { requireSession } from "@/server/store-service";

/**
 * Delete the signed-in owner's account and every record of their store.
 *
 * Confirmation: the current password (so a borrowed, unlocked phone is not enough) and the
 * store name typed out (so it is never a misclick). Wrong passwords count toward the same
 * per-email lock as login, so this cannot be used to guess passwords.
 */
export async function deleteAccount(input: { password: string; storeName: string }) {
  const session = await requireSession();

  const user = await prisma.user.findUnique({ where: { id: session.userId } });

  if (!user) throw unauthorized();

  const emailKey = { key: `login:email:${user.email}`, policy: THROTTLE_POLICIES.loginEmail };

  await assertNotLocked([emailKey], "비밀번호 확인");

  if (!(await bcrypt.compare(input.password, user.passwordHash))) {
    const lockedMs = await recordFailures([emailKey]);

    if (lockedMs > 0) throw tooManyRequests(lockedMessage(lockedMs, "비밀번호 확인"));

    throw unauthorized("비밀번호가 올바르지 않습니다.");
  }

  const store = await prisma.store.findFirst({
    where: { id: session.storeId, organizationId: session.organizationId },
  });

  if (!store) throw unauthorized();

  if (input.storeName.trim() !== store.name.trim()) {
    throw validationError("매장 이름이 일치하지 않습니다. 탈퇴하려면 매장 이름을 그대로 입력하세요.");
  }

  const storeId = store.id;

  await prisma.$transaction(async (tx) => {
    // Children before parents: several foreign keys are RESTRICT and are checked immediately,
    // so cascading from Store alone would fail (same order as scripts/reset-data.mjs).
    await tx.alert.deleteMany({ where: { storeId } });
    await tx.weeklySnapshot.deleteMany({ where: { storeId } });
    await tx.analysisRun.deleteMany({ where: { storeId } });
    await tx.costBasisSnapshot.deleteMany({ where: { storeId } });
    await tx.actualUsagePeriod.deleteMany({ where: { storeId } });
    await tx.salesPeriod.deleteMany({ where: { storeId } });
    await tx.purchaseRecord.deleteMany({ where: { storeId } });
    await tx.fixedCostItem.deleteMany({ where: { storeId } });
    await tx.simulationScenario.deleteMany({ where: { storeId } });
    await tx.ingredientPriceHistory.deleteMany({ where: { ingredient: { storeId } } });
    await tx.recipeLine.deleteMany({
      where: { OR: [{ menuItem: { storeId } }, { prepRecipe: { storeId } }] },
    });
    await tx.menuItem.deleteMany({ where: { storeId } });
    await tx.prepRecipe.deleteMany({ where: { storeId } });
    await tx.ingredient.deleteMany({ where: { storeId } });
    await tx.salesChannel.deleteMany({ where: { storeId } });
    await tx.store.delete({ where: { id: storeId } });

    // One owner per organization in this version; remove it once it has no stores left.
    const remainingStores = await tx.store.count({ where: { organizationId: session.organizationId } });

    if (remainingStores === 0) {
      await tx.organization.delete({ where: { id: session.organizationId } });
    }

    const remainingMemberships = await tx.organizationMember.count({ where: { userId: user.id } });

    if (remainingMemberships === 0) {
      await tx.user.delete({ where: { id: user.id } });
    }
  });

  await clearThrottle(emailKey.key);
  await clearSessionCookie();

  return { deleted: true };
}
