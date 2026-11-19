import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return { ok: true as const, message: "PostgreSQL 연결 정상" };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "DB 연결 실패",
    };
  }
}

export default async function HealthPage() {
  const db = await checkDatabase();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">시스템 상태</h1>
      <div
        className={`rounded-xl border p-5 ${
          db.ok
            ? "border-gain/30 bg-gain-soft text-gain"
            : "border-loss/30 bg-loss-soft text-loss"
        }`}
      >
        <p className="text-sm opacity-80">서버 연결</p>
        <p className="mt-2 text-lg font-medium">{db.message}</p>
      </div>
    </div>
  );
}
