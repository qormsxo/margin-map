import {
  METRIC_TYPE_CONTRIBUTION,
  allocateByRevenue,
  analyzeContributionBySales,
  orderDeliveryCost,
  calculateMenuProfitability,
} from "@/domain";
import { notFound } from "@/lib/errors";
import { isMappableError, toAppError } from "@/lib/domain-map";
import { prisma } from "@/lib/prisma";
import {
  loadCostingContext,
  resolveFees,
  toRecipeLineInput,
} from "@/server/costing-context";
import { n } from "@/server/decimal";
import { buildProfitAndLoss } from "@/server/fixed-cost-service";
import { requireSession } from "@/server/store-service";

export async function getContributionAnalysis(input: {
  periodId: string;
  channelId?: string;
}) {
  const session = await requireSession();

  const period = await prisma.salesPeriod.findFirst({
    where: { id: input.periodId, storeId: session.storeId },
    include: { lines: true, orderCounts: true },
  });

  if (!period) throw notFound("판매 기간을 찾을 수 없습니다.");

  const activeMenus = await prisma.menuItem.findMany({
    where: { storeId: session.storeId, isActive: true },
    include: { lines: true, channelPrices: true },
  });

  const evidence = {
    periodStart: period.periodStart.toISOString().slice(0, 10),
    periodEnd: period.periodEnd.toISOString().slice(0, 10),
    salesLineCount: period.lines.length,
    basis: "CURRENT_MASTER" as const,
    metricType: METRIC_TYPE_CONTRIBUTION,
  };

  if (period.lines.length === 0) {
    return {
      status: "INSUFFICIENT_DATA" as const,
      insufficientReason: "NO_SALES" as const,
      periodId: period.id,
      metricType: METRIC_TYPE_CONTRIBUTION,
      costAsOf: "CURRENT_MASTER" as const,
      costBasisSnapshotId: null,
      menus: [] as const,
      excludedMenuCount: activeMenus.length,
      emptyState: {
        message: "판매량 데이터가 없어 기여도 분석을 만들 수 없습니다.",
        requiredInput: "메뉴별 판매량을 입력하세요.",
      },
      evidence,
    };
  }

  // Lines without a channel use the requested (or default) channel's fees.
  const fallback = await resolveFees(session.storeId, input.channelId);
  const channelId = fallback.channelId;

  const channels = await prisma.salesChannel.findMany({
    where: { storeId: session.storeId },
  });

  const channelById = new Map(channels.map((c) => [c.id, c] as const));

  const feesFor = (lineChannelId: string | null) => {
    const channel = lineChannelId ? channelById.get(lineChannelId) : undefined;

    if (!channel) return { id: fallback.channelId, fees: fallback.fees };

    return {
      id: channel.id,
      fees: {
        channelFeeRate: n(channel.channelFeeRate),
        paymentFeeRate: n(channel.paymentFeeRate),
        deliveryFeeRate: n(channel.deliveryFeeRate),
        deliveryFeeFixed: n(channel.deliveryFeeFixed),
      },
    };
  };

  const { ingredients, preps } = await loadCostingContext(session.storeId);
  const menuById = new Map(activeMenus.map((m) => [m.id, m] as const));

  // Channels with an order count pay delivery once per order (not per item).
  const orderCountByChannel = new Map(
    period.orderCounts.map((c) => [c.salesChannelId, c.orderCount] as const),
  );

  const menuRevenueByChannel = new Map<string, Map<string, number>>();

  // Each sales line is valued with its own channel's fees and price, then
  // summed per menu and per channel (홀·배민·쿠팡이츠 합산).
  const perMenu = new Map<string, { qty: number; contribution: number }>();

  const perChannel = new Map<
    string,
    { qty: number; revenue: number; contribution: number }
  >();

  let revenue = 0;

  for (const line of period.lines) {
    const menu = menuById.get(line.menuItemId);

    if (!menu || menu.lines.length === 0) continue;

    const { id: lineChannelId, fees: channelFees } = feesFor(line.salesChannelId);
    const perOrder = orderCountByChannel.has(lineChannelId);
    const fees = perOrder ? { ...channelFees, deliveryFeeFixed: 0 } : channelFees;

    const channelPrice = menu.channelPrices.find(
      (p) => p.salesChannelId === lineChannelId,
    );

    const sellingPrice = n(channelPrice?.sellingPrice ?? menu.sellingPrice);
    const qty = n(line.qty);

    try {
      const result = calculateMenuProfitability({
        sellingPrice,
        lines: menu.lines.map(toRecipeLineInput),
        ingredients,
        preps,
        fees,
      });

      revenue += sellingPrice * qty;

      if (perOrder) {
        const byMenu = menuRevenueByChannel.get(lineChannelId) ?? new Map<string, number>();

        byMenu.set(menu.id, (byMenu.get(menu.id) ?? 0) + sellingPrice * qty);
        menuRevenueByChannel.set(lineChannelId, byMenu);
      }

      const menuAgg = perMenu.get(menu.id) ?? { qty: 0, contribution: 0 };

      menuAgg.qty += qty;
      menuAgg.contribution += result.contribution * qty;
      perMenu.set(menu.id, menuAgg);

      const channelAgg = perChannel.get(lineChannelId) ?? {
        qty: 0,
        revenue: 0,
        contribution: 0,
      };

      channelAgg.qty += qty;
      channelAgg.revenue += sellingPrice * qty;
      channelAgg.contribution += result.contribution * qty;
      perChannel.set(lineChannelId, channelAgg);
    } catch (error) {
      if (isMappableError(error)) throw toAppError(error);
      throw error;
    }
  }

  // Subtract per-order delivery cost, split across menus by their revenue share.
  const deliveryCostByChannel = new Map<string, number>();

  for (const [lineChannelId, byMenu] of menuRevenueByChannel) {
    const channel = channelById.get(lineChannelId);

    const cost = orderDeliveryCost(
      orderCountByChannel.get(lineChannelId) ?? 0,
      channel ? n(channel.deliveryFeeFixed) : 0,
    );

    deliveryCostByChannel.set(lineChannelId, cost);

    for (const [menuId, share] of allocateByRevenue(cost, byMenu)) {
      const menuAgg = perMenu.get(menuId);

      if (menuAgg) menuAgg.contribution -= share;
    }

    const channelAgg = perChannel.get(lineChannelId);

    if (channelAgg) channelAgg.contribution -= cost;
  }

  const rows = [...perMenu.entries()].map(([menuItemId, agg]) => ({
    menuItemId,
    name: menuById.get(menuItemId)?.name ?? menuItemId,
    salesQty: agg.qty,
    // Channel-weighted average per unit.
    contributionPerUnit: Math.round(agg.contribution / agg.qty),
  }));

  const byChannel = [...perChannel.entries()].map(([id, agg]) => ({
    channelId: id,
    name: channelById.get(id)?.name ?? "기본 채널",
    qty: agg.qty,
    revenue: Math.round(agg.revenue),
    contribution: Math.round(agg.contribution),
    orderCount: orderCountByChannel.get(id) ?? null,
    /** PER_ORDER: 주문 수 × 배달비. PER_ITEM: 주문 수가 없어 메뉴 1개마다 뺌. */
    deliveryBasis: orderCountByChannel.has(id) ? ("PER_ORDER" as const) : ("PER_ITEM" as const),
    deliveryCost: Math.round(deliveryCostByChannel.get(id) ?? 0),
    hasDeliveryFee: n(channelById.get(id)?.deliveryFeeFixed ?? 0) > 0,
    contributionMargin:
      agg.revenue > 0 ? Math.round((agg.contribution / agg.revenue) * 10000) / 10000 : null,
  }));

  if (rows.length === 0) {
    return {
      status: "INSUFFICIENT_DATA" as const,
      insufficientReason: "NO_RECIPES" as const,
      periodId: period.id,
      metricType: METRIC_TYPE_CONTRIBUTION,
      costAsOf: "CURRENT_MASTER" as const,
      costBasisSnapshotId: null,
      menus: [] as const,
      excludedMenuCount: activeMenus.length,
      emptyState: {
        message: "판매량은 들어왔지만, 팔린 메뉴에 레시피가 없어 원가와 남는 돈을 계산할 수 없습니다.",
        requiredInput: "메뉴 화면에서 ‘레시피 넣기’로 메뉴마다 들어가는 재료와 양을 넣으세요.",
      },
      evidence: { ...evidence, channelId },
    };
  }

  const analyzed = analyzeContributionBySales(rows);
  const soldIds = new Set(rows.map((r) => r.menuItemId));

  if (analyzed.status === "INSUFFICIENT_DATA") {
    return {
      status: "INSUFFICIENT_DATA" as const,
      insufficientReason: analyzed.reason,
      periodId: period.id,
      metricType: METRIC_TYPE_CONTRIBUTION,
      costAsOf: "CURRENT_MASTER" as const,
      costBasisSnapshotId: null,
      menus: [] as const,
      excludedMenuCount: activeMenus.length,
      emptyState: {
        message: "판매량 데이터가 없어 기여도 분석을 만들 수 없습니다.",
        requiredInput: "메뉴별 판매량을 입력하세요.",
      },
      evidence: { ...evidence, channelId },
    };
  }

  const totalContribution = analyzed.menus.reduce(
    (sum, m) => sum + m.totalContribution,
    0,
  );

  // Only menus with sales and a recipe count toward revenue/contribution.
  const profitAndLoss = await buildProfitAndLoss({
    storeId: session.storeId,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    revenue,
    totalContribution,
  });

  return {
    status: "COMPLETED" as const,
    periodId: period.id,
    profitAndLoss,
    byChannel,
    metricType: METRIC_TYPE_CONTRIBUTION,
    costAsOf: "CURRENT_MASTER" as const,
    costBasisSnapshotId: null,
    channelId,
    menus: analyzed.menus,
    medians: analyzed.medians,
    excludedMenuCount: activeMenus.filter((m) => !soldIds.has(m.id)).length,
    highSalesLowContrib: analyzed.menus.filter(
      (m) => m.quadrant === "HIGH_SALES_LOW_CONTRIB",
    ),
    lowSalesHighContrib: analyzed.menus.filter(
      (m) => m.quadrant === "LOW_SALES_HIGH_CONTRIB",
    ),
    evidence: { ...evidence, channelId },
  };
}
