import bcrypt from "bcryptjs";
import { clearSessionCookie } from "@/lib/auth/session";
import { unauthorized, validationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  admitAttempts,
  clearThrottle,
  lockedByThisAttempt,
  loginKeys,
  refundAttempts,
} from "@/server/auth-throttle";
import { requireSession } from "@/server/store-service";

/**
 * Delete the signed-in owner's account and every record of their store.
 *
 * Confirmation: the current password (so a borrowed, unlocked phone is not enough) and the
 * store name typed out (so it is never a misclick). Password checks count toward the same
 * locks as login, so this cannot be used to guess passwords.
 */
export async function deleteAccount(input: { password: string; storeName: string }, ip = "unknown") {
  const session = await requireSession();

  const user = await prisma.user.findUnique({ where: { id: session.userId } });

  if (!user) throw unauthorized();

  const keys = loginKeys(user.email, ip);
  const lockIfWrongMs = await admitAttempts(keys.all, "비밀번호 확인");

  if (!(await bcrypt.compare(input.password, user.passwordHash))) {
    if (lockIfWrongMs > 0) throw lockedByThisAttempt(lockIfWrongMs, "비밀번호 확인");

    throw unauthorized("비밀번호가 올바르지 않습니다.");
  }

  await refundAttempts([keys.ip]);

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

  await clearThrottle([keys.emailIp.key, keys.email.key]);
  await clearSessionCookie();

  return { deleted: true };
}
