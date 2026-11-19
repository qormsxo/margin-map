import Link from "next/link";
import type { ContributionQuadrant } from "@/domain";
import { EmptyPanel } from "@/components/dashboard/empty-panel";
import { AppError } from "@/lib/errors";
import { getContributionAnalysis } from "@/server/contribution-analysis-service";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/store-service";

export const dynamic = "force-dynamic";

export default async function ContributionPage({
  searchParams,
}: {
  searchParams: Promise<{ periodId?: string }>;
}) {
  try {
    const session = await requireSession();
    const { periodId } = await searchParams;

    const periods = await prisma.salesPeriod.findMany({
      where: { storeId: session.storeId },
      orderBy: { periodStart: "desc" },
      select: { id: true, periodStart: true, periodEnd: true, grain: true },
    });

    const period = periods.find((p) => p.id === periodId) ?? periods[0] ?? null;

    const picker = (
      <PeriodPicker
        periods={periods.map((p) => ({
          id: p.id,
          label:
            p.grain === "MONTH"
              ? `${p.periodStart.getUTCFullYear()}년 ${p.periodStart.getUTCMonth() + 1}월`
              : `${p.periodStart.toISOString().slice(0, 10)} ~ ${p.periodEnd.toISOString().slice(0, 10)}`,
        }))}
        selectedId={period?.id ?? null}
      />
    );

    if (!period) {
      return (
        <div className="space-y-4">
          <PageHeader />
          <EmptyPanel
            title="판매량 × 공헌이익"
            message="판매 기간이 없습니다."
            requiredInput="판매량 화면에서 이번 달 메뉴별 판매량을 입력하면 분석이 시작됩니다."
            action={{ href: "/sales", label: "판매량 입력" }}
          />
        </div>
      );
    }

    const analysis = await getContributionAnalysis({ periodId: period.id });

    if (analysis.status === "INSUFFICIENT_DATA") {
      return (
        <div className="space-y-4">
          <PageHeader />
          {picker}
          <EmptyPanel
            title="판매량 × 공헌이익"
            action={{ href: "/sales", label: "판매량 입력" }}
            message={analysis.emptyState.message}
            requiredInput={analysis.emptyState.requiredInput}
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <PageHeader />
        {picker}
        <p className="text-sm text-muted">
          기간 {analysis.evidence.periodStart} ~ {analysis.evidence.periodEnd} · 현재 재료 단가 기준
          {analysis.excludedMenuCount > 0
            ? ` · 판매 기록이 없는 메뉴 ${analysis.excludedMenuCount}개 제외`
            : ""}
        </p>

        <ProfitAndLossCard pl={analysis.profitAndLoss} />

        {analysis.byChannel.length > 1 ? (
          <section className="overflow-auto rounded-xl border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-subtle text-muted">
                <tr>
                  <th className="px-3 py-2">판매 채널</th>
                  <th className="px-3 py-2">판매량</th>
                  <th className="px-3 py-2">매출</th>
                  <th className="px-3 py-2">배달비</th>
                  <th className="px-3 py-2">남는 돈</th>
                  <th className="px-3 py-2">마진율</th>
                </tr>
              </thead>
              <tbody>
                {analysis.byChannel.map((c) => (
                  <tr key={c.channelId} className="border-t border-line">
                    <td className="px-3 py-2 text-ink">{c.name}</td>
                    <td className="px-3 py-2">{c.qty.toLocaleString("ko-KR")}</td>
                    <td className="px-3 py-2">{won(c.revenue)}</td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {!c.hasDeliveryFee
                        ? "—"
                        : c.deliveryBasis === "PER_ORDER"
                          ? `${won(c.deliveryCost)} (${(c.orderCount ?? 0).toLocaleString("ko-KR")}건)`
                          : "주문 건수 미입력 · 메뉴마다 뺌"}
                    </td>
                    <td className="px-3 py-2">{won(c.contribution)}</td>
                    <td className="px-3 py-2">{pct(c.contributionMargin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-line card p-4">
            <h2 className="text-sm text-warn">많이 팔리지만 덜 남는 메뉴</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              {analysis.highSalesLowContrib.length === 0 ? <li className="text-faint">해당 없음</li> : null}
              {analysis.highSalesLowContrib.map((m) => (
                <li key={m.menuItemId}>
                  {m.name} · {m.salesQty.toLocaleString("ko-KR")}개 · 1개당 {won(m.contributionPerUnit)} · 총{" "}
                  {won(m.totalContribution)}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border border-line card p-4">
            <h2 className="text-sm text-gain">적게 팔리지만 많이 남는 메뉴</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              {analysis.lowSalesHighContrib.length === 0 ? <li className="text-faint">해당 없음</li> : null}
              {analysis.lowSalesHighContrib.map((m) => (
                <li key={m.menuItemId}>
                  {m.name} · {m.salesQty.toLocaleString("ko-KR")}개 · 1개당 {won(m.contributionPerUnit)} · 총{" "}
                  {won(m.totalContribution)}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="overflow-auto rounded-xl border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-subtle text-muted">
              <tr>
                <th className="px-3 py-2">메뉴</th>
                <th className="px-3 py-2">판매량</th>
                <th className="px-3 py-2">1개당 남는 돈</th>
                <th className="px-3 py-2">총 남는 돈</th>
                <th className="px-3 py-2">구분</th>
              </tr>
            </thead>
            <tbody>
              {analysis.menus.map((m) => (
                <tr key={m.menuItemId} className="border-t border-line">
                  <td className="px-3 py-2 text-ink">{m.name}</td>
                  <td className="px-3 py-2">{m.salesQty.toLocaleString("ko-KR")}</td>
                  <td className="px-3 py-2">{won(m.contributionPerUnit)}</td>
                  <td className="px-3 py-2">{won(m.totalContribution)}</td>
                  <td className="px-3 py-2 text-xs text-muted">{QUADRANT_LABEL[m.quadrant]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "DATA_INSUFFICIENT") {
      return (
        <EmptyPanel
          title="판매량 × 공헌이익"
          message={error.message}
          action={{ href: "/sales", label: "판매 채널 추가" }}
        />
      );
    }

    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      return (
        <EmptyPanel
          title="판매량 × 공헌이익"
          message="로그인하면 볼 수 있습니다."
          action={{ href: "/login", label: "로그인" }}
        />
      );
    }

    throw error;
  }
}

type ProfitAndLoss = Awaited<
  ReturnType<typeof getContributionAnalysis>
> extends infer R
  ? R extends { profitAndLoss: infer P }
    ? P
    : never
  : never;

const QUADRANT_LABEL = {
  BALANCED: "—",
  HIGH_SALES_LOW_CONTRIB: "많이 팔리지만 덜 남음",
  LOW_SALES_HIGH_CONTRIB: "적게 팔리지만 많이 남음",
  HIGH_SALES_HIGH_CONTRIB: "효자 메뉴",
  LOW_SALES_LOW_CONTRIB: "재검토 필요",
} satisfies Record<ContributionQuadrant, string>;

const won = (v: number) => `${Math.round(v).toLocaleString("ko-KR")}원`;
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);

function ProfitAndLossCard({ pl }: { pl: ProfitAndLoss }) {
  if (pl.status === "NO_FIXED_COSTS") {
    return (
      <section className="rounded-xl border border-dashed border-line-strong bg-surface p-5">
        <h2 className="text-sm font-medium text-ink">실제 남는 돈</h2>
        <p className="mt-2 text-sm text-muted">{pl.emptyState.message}</p>
        <Link href="/fixed-costs" className="mt-2 inline-block text-sm text-accent-ink">
          월 고정비 입력하기 →
        </Link>
      </section>
    );
  }

  const profitable = pl.operatingProfit >= 0;

  return (
    <section className="space-y-5 rounded-3xl bg-pine-900 p-6 text-white sm:p-7">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm text-pine-200">진짜 남은 돈 · 영업이익 ({pl.wholeMonths ? `${pl.wholeMonths}개월` : `${pl.periodDays}일`})</h2>
        <Link href="/fixed-costs" className="text-xs font-semibold text-pine-200 hover:text-white">
          고정비 수정
        </Link>
      </div>
      <p className={`text-4xl font-bold tracking-tight sm:text-5xl ${profitable ? "text-white" : "text-[#ff9a7a]"}`}>
        {profitable ? "" : "−"}
        {won(Math.abs(pl.operatingProfit))}
      </p>
      <dl className="grid grid-cols-2 gap-4 border-t border-pine-700 pt-5 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-pine-300">매출</dt>
          <dd className="mt-0.5 font-semibold text-white">{won(pl.revenue)}</dd>
        </div>
        <div>
          <dt className="text-pine-300">총 공헌이익</dt>
          <dd className="mt-0.5 font-semibold text-white">
            {won(pl.totalContribution)} ({pct(pl.contributionMarginRatio)})
          </dd>
        </div>
        <div>
          <dt className="text-pine-300">{pl.wholeMonths ? "고정비 (월)" : "고정비 (일수만큼)"}</dt>
          <dd className="mt-0.5 font-semibold text-white">−{won(pl.fixedCosts)}</dd>
        </div>
        <div>
          <dt className="text-pine-300">손익분기 매출</dt>
          <dd className="mt-0.5 font-semibold text-white">
            {pl.breakEvenRevenue === null
              ? "계산 불가"
              : `${won(pl.breakEvenRevenue)} (하루 ${won(pl.breakEvenRevenuePerDay ?? 0)})`}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-pine-300">
        영업이익 = 총 공헌이익 − 고정비. 손익분기는 이 기간 실제 판매 구성 기준이며, 세금·대출이자는
        포함하지 않습니다.
        {pl.safetyMarginRate !== null ? ` 안전한계율 ${pct(pl.safetyMarginRate)}.` : ""}
      </p>
    </section>
  );
}

function PeriodPicker({
  periods,
  selectedId,
}: {
  periods: Array<{ id: string; label: string }>;
  selectedId: string | null;
}) {
  if (periods.length < 2) return null;

  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {periods.map((p) => (
        <Link
          key={p.id}
          href={`/contribution?periodId=${p.id}`}
          className={`rounded-full border px-3.5 py-1 ${
            p.id === selectedId
              ? "border-brand-solid bg-brand-solid text-white"
              : "border-line-strong text-muted hover:text-ink"
          }`}
        >
          {p.label}
        </Link>
      ))}
    </nav>
  );
}

function PageHeader() {
  return (
    <div className="space-y-2">
      <p className="eyebrow uppercase">
        Profit
      </p>
      <h1 className="text-[28px] font-bold tracking-tight text-heading">
        판매량·공헌이익·실제 이익
      </h1>
      <Link href="/dashboard" className="text-sm text-accent-ink hover:text-accent">
        ← 대시보드
      </Link>
    </div>
  );
}
