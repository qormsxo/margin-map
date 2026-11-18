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
        <p className="text-sm text-slate-400">
          기간 {analysis.evidence.periodStart} ~ {analysis.evidence.periodEnd} · 현재 재료 단가 기준
          {analysis.excludedMenuCount > 0
            ? ` · 판매 기록이 없는 메뉴 ${analysis.excludedMenuCount}개 제외`
            : ""}
        </p>

        <ProfitAndLossCard pl={analysis.profitAndLoss} />

        {analysis.byChannel.length > 1 ? (
          <section className="overflow-auto rounded-xl border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-400">
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
                  <tr key={c.channelId} className="border-t border-slate-800">
                    <td className="px-3 py-2 text-slate-200">{c.name}</td>
                    <td className="px-3 py-2">{c.qty.toLocaleString("ko-KR")}</td>
                    <td className="px-3 py-2">{won(c.revenue)}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">
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
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-sm text-amber-200">많이 팔리지만 덜 남는 메뉴</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {analysis.highSalesLowContrib.length === 0 ? <li className="text-slate-500">해당 없음</li> : null}
              {analysis.highSalesLowContrib.map((m) => (
                <li key={m.menuItemId}>
                  {m.name} · {m.salesQty.toLocaleString("ko-KR")}개 · 1개당 {won(m.contributionPerUnit)} · 총{" "}
                  {won(m.totalContribution)}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-sm text-emerald-200">적게 팔리지만 많이 남는 메뉴</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {analysis.lowSalesHighContrib.length === 0 ? <li className="text-slate-500">해당 없음</li> : null}
              {analysis.lowSalesHighContrib.map((m) => (
                <li key={m.menuItemId}>
                  {m.name} · {m.salesQty.toLocaleString("ko-KR")}개 · 1개당 {won(m.contributionPerUnit)} · 총{" "}
                  {won(m.totalContribution)}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="overflow-auto rounded-xl border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
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
                <tr key={m.menuItemId} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-slate-200">{m.name}</td>
                  <td className="px-3 py-2">{m.salesQty.toLocaleString("ko-KR")}</td>
                  <td className="px-3 py-2">{won(m.contributionPerUnit)}</td>
                  <td className="px-3 py-2">{won(m.totalContribution)}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{QUADRANT_LABEL[m.quadrant]}</td>
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
      <section className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-5">
        <h2 className="text-sm font-medium text-slate-200">실제 남는 돈</h2>
        <p className="mt-2 text-sm text-slate-400">{pl.emptyState.message}</p>
        <Link href="/fixed-costs" className="mt-2 inline-block text-sm text-sky-300">
          월 고정비 입력하기 →
        </Link>
      </section>
    );
  }

  const profitable = pl.operatingProfit >= 0;

  return (
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-slate-200">실제 남는 돈 ({pl.wholeMonths ? `${pl.wholeMonths}개월` : `${pl.periodDays}일`})</h2>
        <Link href="/fixed-costs" className="text-xs text-sky-300">
          고정비 수정
        </Link>
      </div>
      <p className={`text-3xl font-semibold ${profitable ? "text-emerald-300" : "text-rose-300"}`}>
        {profitable ? "" : "−"}
        {won(Math.abs(pl.operatingProfit))}
      </p>
      <dl className="grid gap-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">매출</dt>
          <dd className="text-slate-200">{won(pl.revenue)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">총 공헌이익</dt>
          <dd className="text-slate-200">
            {won(pl.totalContribution)} ({pct(pl.contributionMarginRatio)})
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">{pl.wholeMonths ? "고정비 (월)" : "고정비 (일수만큼)"}</dt>
          <dd className="text-slate-200">−{won(pl.fixedCosts)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">손익분기 매출</dt>
          <dd className="text-slate-200">
            {pl.breakEvenRevenue === null
              ? "계산 불가"
              : `${won(pl.breakEvenRevenue)} (하루 ${won(pl.breakEvenRevenuePerDay ?? 0)})`}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-slate-500">
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
          className={`rounded-lg border px-3 py-1 ${
            p.id === selectedId
              ? "border-sky-500 bg-sky-500/10 text-sky-200"
              : "border-slate-700 text-slate-400 hover:text-slate-200"
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
      <p className="text-xs uppercase tracking-[0.2em] text-sky-400/80">
        Profit
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        판매량·공헌이익·실제 이익
      </h1>
      <Link href="/dashboard" className="text-sm text-sky-300 hover:text-sky-200">
        ← 대시보드
      </Link>
    </div>
  );
}
