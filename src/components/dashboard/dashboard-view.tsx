import Link from "next/link";
import { EmptyPanel } from "@/components/dashboard/empty-panel";
import { NavIcon } from "@/components/layout/nav-icon";

type SectionUnavailable = {
  available: false;
  message: string;
  requiredInput: string;
};

type DashboardData = Awaited<
  ReturnType<typeof import("@/server/dashboard-service").getIntegratedDashboard>
>;

function isUnavailable(section: { available?: boolean }): section is SectionUnavailable {
  return section.available === false;
}

function formatPct(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return `${(value * 100).toFixed(1)}%`;
}

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

/** 1,234,567 → "123.5만" for big hero numbers that must stay readable on a phone. */
function formatMan(value: number) {
  const man = value / 10_000;

  return Math.abs(man) >= 100
    ? `${Math.round(man).toLocaleString("ko-KR")}만`
    : `${man.toFixed(1)}만`;
}

function monthLabel(periodStart: string) {
  const [, m] = periodStart.split("-");

  return `${Number(m)}월`;
}

function Hero({ contribution }: { contribution: DashboardData["sections"]["contribution"] }) {
  if (contribution.available !== true) return null;

  const pnl = contribution.profitAndLoss;
  const label = monthLabel(contribution.periodStart);

  if (pnl.status !== "COMPLETED") {
    const total = contribution.menus.reduce((s, m) => s + m.totalContribution, 0);

    return (
      <section className="relative overflow-hidden rounded-3xl bg-pine-900 p-6 text-white sm:p-8">
        <Glow />
        <p className="text-sm text-pine-200">{label} 메뉴로 남긴 돈 (고정비 빼기 전)</p>
        <p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{formatWon(total)}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-pine-950/50 p-4">
          <p className="flex-1 text-sm text-pine-200">
            인건비·월세를 넣으면 <b className="text-white">진짜 남은 돈</b>과 손익분기점이 나옵니다.
          </p>
          <Link
            href="/fixed-costs"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            고정비 입력
          </Link>
        </div>
      </section>
    );
  }

  const profitable = pnl.operatingProfit >= 0;

  const progress =
    pnl.breakEvenRevenue && pnl.breakEvenRevenue > 0
      ? Math.min(pnl.revenue / pnl.breakEvenRevenue, 1.6)
      : null;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-pine-900 p-6 text-white sm:p-8">
      <Glow />
      <div className="relative">
        <p className="text-sm text-pine-200">
          {label} 진짜 남은 돈 <span className="text-pine-300">· 영업이익</span>
        </p>
        <p
          className={`mt-2 text-[40px] leading-none font-bold tracking-tight sm:text-6xl ${
            profitable ? "text-white" : "text-[#ff9a7a]"
          }`}
        >
          {profitable ? "" : "−"}
          {formatWon(Math.abs(pnl.operatingProfit))}
        </p>
        <p className="mt-3 text-sm text-pine-200">
          {contribution.periodStart} ~ {contribution.periodEnd}
        </p>

        <dl className="mt-7 grid grid-cols-3 gap-3 border-t border-pine-700 pt-5">
          {[
            { k: "매출", v: pnl.revenue },
            { k: "메뉴로 남긴 돈", v: pnl.totalContribution },
            { k: "고정비", v: pnl.fixedCosts },
          ].map((item) => (
            <div key={item.k}>
              <dt className="text-xs text-pine-300">{item.k}</dt>
              <dd className="mt-1 text-lg font-semibold sm:text-xl">{formatMan(item.v)}</dd>
            </div>
          ))}
        </dl>

        {progress !== null && pnl.breakEvenRevenue ? (
          <div className="mt-6">
            <div className="flex justify-between text-xs text-pine-200">
              <span>손익분기 매출 {formatMan(pnl.breakEvenRevenue)}</span>
              <span className="font-semibold text-white">
                {Math.round((pnl.revenue / pnl.breakEvenRevenue) * 100)}% 달성
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-pine-950/60">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(progress, 1) * 100}%` }}
              />
            </div>
            {pnl.breakEvenRevenuePerDay ? (
              <p className="mt-2 text-xs text-pine-300">
                하루 {formatWon(pnl.breakEvenRevenuePerDay)} 이상 팔면 남는 장사입니다
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Glow() {
  return (
    <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-pine-500/40 blur-3xl" />
  );
}

function SectionTitle({ title, hint, href, cta }: { title: string; hint?: string; href?: string; cta?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-bold text-heading">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-faint">{hint}</p> : null}
      </div>
      {href && cta ? (
        <Link href={href} className="shrink-0 text-xs font-semibold text-brand hover:text-heading">
          {cta} →
        </Link>
      ) : null}
    </div>
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  const { sections } = data;
  const alertCount = isUnavailable(sections.weekly) ? 0 : sections.weekly.count;

  const ranked = isUnavailable(sections.profitability)
    ? []
    : [...sections.profitability.items].sort((a, b) => b.contribution - a.contribution);

  const maxContribution = Math.max(1, ...ranked.map((i) => i.contribution));

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">
          {new Date(data.generatedAt).toLocaleDateString("ko-KR", {
            month: "long",
            day: "numeric",
            weekday: "long",
          })}
        </p>
        <h1 className="mt-1 text-[28px] font-bold tracking-tight text-heading">오늘도 남는 장사</h1>
      </header>

      <Hero contribution={sections.contribution} />

      {alertCount > 0 ? (
        <Link
          href="/alerts"
          className="flex items-center gap-4 rounded-2xl border border-accent/30 bg-accent-soft p-4 hover:border-accent"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white">
            <NavIcon name="bell" className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold text-accent-ink">확인할 알림 {alertCount}건</span>
            <span className="block text-xs text-ink-soft">
              {isUnavailable(sections.weekly) ? "" : sections.weekly.items[0]?.title}
            </span>
          </span>
          <span className="text-accent-ink">→</span>
        </Link>
      ) : null}

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { href: "/sales", icon: "receipt" as const, t: "판매량 입력", d: "이번 달 숫자 채우기" },
          { href: "/simulation", icon: "sliders" as const, t: "가격 올려보기", d: "얼마면 얼마 남나" },
          { href: "/purchases", icon: "truck" as const, t: "매입과 비교", d: "레시피대로 쓰고 있나" },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="group card flex flex-col items-start gap-2 p-3 hover:-translate-y-0.5 hover:shadow-lift sm:flex-row sm:items-center sm:gap-3 sm:p-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand group-hover:bg-pine-900 group-hover:text-white">
              <NavIcon name={q.icon} className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">{q.t}</span>
              <span className="hidden text-xs text-faint sm:block">{q.d}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {isUnavailable(sections.profitability) ? (
          <div className="lg:col-span-3">
            <EmptyPanel
              title="메뉴 1개 팔면 남는 돈"
              message={sections.profitability.message}
              requiredInput={sections.profitability.requiredInput}
            />
          </div>
        ) : (
          <section className="card p-5 lg:col-span-3">
            <SectionTitle
              title="메뉴 1개 팔면 남는 돈"
              hint="판매가 − 재료비 − 수수료 · 기본 채널 기준"
              href="/menus"
              cta="메뉴"
            />
            <ul className="mt-4 max-h-96 space-y-3 overflow-auto pr-1">
              {ranked.map((item) => {
                const low = (item.contributionMargin ?? 0) < 0.5;

                return (
                  <li key={item.menuItemId}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-ink">{item.name}</span>
                      <span className="shrink-0 tabular-nums">
                        <b className="text-ink">{formatWon(item.contribution)}</b>
                        <span className={`ml-2 text-xs ${low ? "font-semibold text-warn" : "text-faint"}`}>
                          {formatPct(item.contributionMargin)}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-subtle">
                      <div
                        className={`h-full rounded-full ${low ? "bg-warn/70" : "bg-pine-500"}`}
                        style={{ width: `${Math.max(4, (item.contribution / maxContribution) * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="space-y-4 lg:col-span-2">
          {sections.contribution.available === true ? (
            <section className="card space-y-4 p-5">
              <SectionTitle title="메뉴 성적표" hint={`${monthLabel(sections.contribution.periodStart)} 판매 기준`} />
              {sections.contribution.lowSalesHighContrib.length === 0 &&
              sections.contribution.highSalesLowContrib.length === 0 ? (
                <p className="rounded-xl bg-subtle p-3.5 text-sm leading-relaxed text-muted">
                  메뉴끼리 판매량·남는 돈 차이가 크지 않아 따로 짚을 메뉴가 없어요. 메뉴가 많을수록 효자 메뉴와 바쁘기만 한
                  메뉴가 또렷하게 나뉩니다.
                </p>
              ) : (
                <>
                  <Quadrant
                    tone="gain"
                    title="효자 메뉴"
                    hint="적게 팔려도 많이 남음 · 더 밀어 보세요"
                    items={sections.contribution.lowSalesHighContrib}
                  />
                  <Quadrant
                    tone="warn"
                    title="바쁘기만 한 메뉴"
                    hint="많이 팔리지만 덜 남음 · 가격이나 양을 보세요"
                    items={sections.contribution.highSalesLowContrib}
                  />
                </>
              )}
            </section>
          ) : (
            <EmptyPanel
              title="메뉴 성적표"
              message={sections.contribution.message}
              requiredInput={sections.contribution.requiredInput}
              action={{ href: "/sales", label: "판매량 입력" }}
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {isUnavailable(sections.priceImpact) ? (
          <EmptyPanel
            title="최근 가격 변동"
            message={sections.priceImpact.message}
            requiredInput={sections.priceImpact.requiredInput}
          />
        ) : (
          <section className="card p-5">
            <SectionTitle title="최근 가격 변동" hint="단가가 바뀐 재료" href="/ingredients" cta="식재료" />
            <ul className="mt-3 max-h-72 divide-y divide-line overflow-auto">
              {sections.priceImpact.items.map((item) => {
                const up =
                  item.previousPurchasePrice !== null &&
                  item.newPurchasePrice !== null &&
                  item.newPurchasePrice > item.previousPurchasePrice;

                return (
                  <li key={item.historyId} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{item.ingredientName}</p>
                      <p className="text-xs text-faint">
                        {new Date(item.effectiveAt).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-sm tabular-nums">
                      {item.previousPurchasePrice !== null && item.newPurchasePrice !== null ? (
                        <>
                          <span className="text-faint line-through">{formatWon(item.previousPurchasePrice)}</span>{" "}
                          <b className={up ? "text-loss" : "text-gain"}>
                            {up ? "▲" : "▼"} {formatWon(item.newPurchasePrice)}
                          </b>
                        </>
                      ) : (
                        <span className="text-muted">
                          {item.previousUnitCost} → {item.newUnitCost}
                        </span>
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {isUnavailable(sections.variance) ? (
          <EmptyPanel
            title="레시피대로 쓰고 있나"
            message="재고를 세지 않아도, 이번 달 매입 영수증 합계로 레시피 재료비와 비교할 수 있습니다."
            action={{ href: "/purchases", label: "매입으로 비교하기" }}
          />
        ) : (
          <section className="card p-5">
            <SectionTitle
              title="레시피대로 쓰고 있나"
              hint={`${sections.variance.periodStart} ~ ${sections.variance.periodEnd}`}
              href="/purchases"
              cta="매입"
            />
            <p className="mt-4 text-3xl font-bold tracking-tight text-heading">
              {formatWon(sections.variance.totalVarianceAmt)}
            </p>
            <p className="mt-1 text-sm text-muted">
              레시피보다 더 쓴 금액 · 비교한 재료 {sections.variance.comparedCount}개
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

function Quadrant({
  tone,
  title,
  hint,
  items,
}: {
  tone: "gain" | "warn";
  title: string;
  hint: string;
  items: { menuItemId: string; name: string; salesQty: number; totalContribution: number }[];
}) {
  return (
    <div className={`rounded-xl p-3.5 ${tone === "gain" ? "bg-gain-soft" : "bg-warn-soft"}`}>
      <p className={`text-sm font-bold ${tone === "gain" ? "text-gain" : "text-warn"}`}>{title}</p>
      <p className="text-xs text-muted">{hint}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.length === 0 ? (
          <li className="text-faint">해당 없음</li>
        ) : (
          items.map((m) => (
            <li key={m.menuItemId} className="flex justify-between gap-2">
              <span className="truncate text-ink">{m.name}</span>
              <span className="shrink-0 text-xs text-muted tabular-nums">
                {m.salesQty.toLocaleString("ko-KR")}개 · {formatMan(m.totalContribution)}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
