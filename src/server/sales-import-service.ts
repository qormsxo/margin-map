import { notFound, validationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { csvHeaderIndex, parseCsv } from "@/server/csv";
import { d } from "@/server/decimal";
import { requireSession } from "@/server/store-service";

export async function importSalesCsv(periodId: string, csvText: string) {
  const session = await requireSession();

  const period = await prisma.salesPeriod.findFirst({
    where: { id: periodId, storeId: session.storeId },
  });

  if (!period) throw notFound("판매 기간을 찾을 수 없습니다.");

  const rows = parseCsv(csvText);

  if (rows.length < 2) {
    throw validationError("CSV에 헤더와 데이터 행이 필요합니다.");
  }

  const header = rows[0]!;
  const menuIdIdx = csvHeaderIndex(header, ["menu_id", "menuid"]);
  const menuNameIdx = csvHeaderIndex(header, ["menu_name", "name", "메뉴"]);
  const qtyIdx = csvHeaderIndex(header, ["qty", "quantity", "판매량"]);

  const channelNameIdx = csvHeaderIndex(header, [
    "channel_name",
    "channel",
    "채널",
  ]);

  if (qtyIdx === null) {
    throw validationError("CSV에 qty 컬럼이 필요합니다.");
  }

  if (menuIdIdx === null && menuNameIdx === null) {
    throw validationError("CSV에 menu_id 또는 menu_name 컬럼이 필요합니다.");
  }

  const menus = await prisma.menuItem.findMany({
    where: { storeId: session.storeId },
  });

  const channels = await prisma.salesChannel.findMany({
    where: { storeId: session.storeId },
  });

  const byId = new Map(menus.map((m) => [m.id, m] as const));

  const byName = new Map(
    menus.map((m) => [m.name.trim().toLowerCase(), m] as const),
  );

  const channelByName = new Map(
    channels.map((c) => [c.name.trim().toLowerCase(), c] as const),
  );

  const skipped: Array<{ line: number; reason: string }> = [];

  const toCreate: Array<{
    menuItemId: string;
    qty: number;
    salesChannelId: string | null;
  }> = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i]!;
    const lineNo = i + 1;
    const qtyRaw = row[qtyIdx] ?? "";
    const qty = Number(qtyRaw);

    if (!(qty > 0)) {
      skipped.push({ line: lineNo, reason: "qty must be > 0" });
      continue;
    }

    let menu =
      menuIdIdx !== null ? byId.get(row[menuIdIdx] ?? "") : undefined;

    if (!menu && menuNameIdx !== null) {
      menu = byName.get((row[menuNameIdx] ?? "").trim().toLowerCase());
    }

    if (!menu) {
      skipped.push({ line: lineNo, reason: "menu not found" });
      continue;
    }

    let salesChannelId: string | null = null;

    if (channelNameIdx !== null && row[channelNameIdx]) {
      const channel = channelByName.get(
        row[channelNameIdx]!.trim().toLowerCase(),
      );

      if (!channel) {
        skipped.push({ line: lineNo, reason: "channel not found" });
        continue;
      }

      salesChannelId = channel.id;
    }

    toCreate.push({
      menuItemId: menu.id,
      qty,
      salesChannelId,
    });
  }

  // Replace-all with imported rows only (no invented fills for missing menus)
  await prisma.$transaction(async (tx) => {
    await tx.salesLine.deleteMany({ where: { periodId } });

    if (toCreate.length === 0) return;

    await tx.salesLine.createMany({
      data: toCreate.map((line) => ({
        periodId,
        menuItemId: line.menuItemId,
        salesChannelId: line.salesChannelId,
        qty: d(line.qty),
        source: "CSV_IMPORT",
      })),
    });
  });

  return {
    imported: toCreate.length,
    skipped,
    source: "CSV_IMPORT" as const,
  };
}
