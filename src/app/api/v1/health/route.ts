import { prisma } from "@/lib/prisma";
import { runApi, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  return runApi(async () => {
    await prisma.$queryRaw`SELECT 1`;

    return ok({
      status: "ok",
      service: "margin-map",
      database: "up",
      timestamp: new Date().toISOString(),
    });
  });
}
