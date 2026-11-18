#!/usr/bin/env node
/**
 * 로컬 DB의 매장 데이터를 전부 지운다. 계정(User·Organization·Store)은 남긴다.
 * 로그인은 그대로 되고, 각 매장은 빈 상태가 된다.
 *
 *   node scripts/reset-data.mjs --yes
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

if (!process.argv.includes("--yes")) {
  console.log("매장 데이터를 전부 지웁니다(계정은 유지). 실행하려면 --yes 를 붙이세요.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  // Children before parents: several FKs are Restrict.
  const steps = [
    ["알림", () => prisma.alert.deleteMany()],
    ["주간 점검", () => prisma.weeklySnapshot.deleteMany()],
    ["분석 기록", () => prisma.analysisRun.deleteMany()],
    ["원가 스냅샷", () => prisma.costBasisSnapshot.deleteMany()],
    ["실사용 기간", () => prisma.actualUsagePeriod.deleteMany()],
    ["판매 기간", () => prisma.salesPeriod.deleteMany()],
    ["매입", () => prisma.purchaseRecord.deleteMany()],
    ["고정비", () => prisma.fixedCostItem.deleteMany()],
    ["시뮬레이션", () => prisma.simulationScenario.deleteMany()],
    ["가격 이력", () => prisma.ingredientPriceHistory.deleteMany()],
    ["레시피", () => prisma.recipeLine.deleteMany()],
    ["메뉴", () => prisma.menuItem.deleteMany()],
    ["반제품", () => prisma.prepRecipe.deleteMany()],
    ["식재료", () => prisma.ingredient.deleteMany()],
    ["판매 채널", () => prisma.salesChannel.deleteMany()],
  ];

  for (const [label, run] of steps) {
    const { count } = await run();

    console.log(`- ${label}: ${count}개 삭제`);
  }

  console.log(`계정 ${await prisma.user.count()}개, 매장 ${await prisma.store.count()}개는 그대로 둠.`);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
