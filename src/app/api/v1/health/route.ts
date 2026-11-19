import { prisma } from "@/lib/prisma";
import { runApi, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  return runApi(async () => {
    await prisma.$queryRaw`SELECT 1`;

    // Called daily by Vercel Cron: also drop login/signup attempt records older than a day.
    await prisma.authThrottle.deleteMany({
      where: { updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });

    return ok({
      status: "ok",
      service: "margin-map",
      database: "up",
      timestamp: new Date().toISOString(),
    });
  });
}
