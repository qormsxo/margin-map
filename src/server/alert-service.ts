import { notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/store-service";

function serializeAlert(row: {
  id: string;
  weekStart: Date;
  ruleId: string;
  severity: "INFO" | "WARN";
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  evidenceJson: unknown;
  acknowledgedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    weekStart: row.weekStart.toISOString().slice(0, 10),
    ruleId: row.ruleId,
    severity: row.severity,
    title: row.title,
    body: row.body,
    entityType: row.entityType,
    entityId: row.entityId,
    evidence: row.evidenceJson,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listAlerts(input: { acknowledged?: boolean }) {
  const session = await requireSession();

  const rows = await prisma.alert.findMany({
    where: {
      storeId: session.storeId,
      ...(input.acknowledged === false
        ? { acknowledgedAt: null }
        : input.acknowledged === true
          ? { acknowledgedAt: { not: null } }
          : {}),
    },
    orderBy: [{ weekStart: "desc" }, { createdAt: "desc" }],
  });

  return rows.map(serializeAlert);
}

export async function acknowledgeAlert(id: string) {
  const session = await requireSession();

  const existing = await prisma.alert.findFirst({
    where: { id, storeId: session.storeId },
  });

  if (!existing) throw notFound("알림을 찾을 수 없습니다.");

  const row = await prisma.alert.update({
    where: { id },
    data: { acknowledgedAt: existing.acknowledgedAt ?? new Date() },
  });

  return {
    id: row.id,
    acknowledgedAt: row.acknowledgedAt!.toISOString(),
  };
}

export async function getDashboardAlerts() {
  const session = await requireSession();

  const rows = await prisma.alert.findMany({
    where: { storeId: session.storeId, acknowledgedAt: null },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return {
    metricType: "CONTRIBUTION" as const,
    count: rows.length,
    items: rows.map(serializeAlert),
  };
}
