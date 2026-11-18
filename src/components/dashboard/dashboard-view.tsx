import { EmptyPanel } from "@/components/dashboard/empty-panel";

type SectionUnavailable = {
  available: false;
  message: string;
  requiredInput: string;
};

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

export function DashboardView({
  data,
}: {
  data: Awaited<
    ReturnType<typeof import("@/server/dashboard-service").getIntegratedDashboard>
  >;
}) {
  const { sections } = data;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-sky-400/80">
          Dashboard
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          운영 대시보드
        </h1>
        <p className="text-sm text-slate-400">
          {new Date(data.generatedAt).toLocaleString("ko-KR")} 기준 · 여기 금액은 판매가에서
          재료비와 수수료만 뺀 값입니다 (인건비·임대료 제외)
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {isUnavailable(sections.profitability) ? (
          <EmptyPanel
            title="메뉴별 공헌이익"
            message={sections.profitability.message}
            requiredInput={sections.profitability.requiredInput}
          />
        ) : (
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-sm font-medium text-slate-200">메뉴별 공헌이익</h2>
            <p className="mt-1 text-xs text-slate-500">1개 팔 때 남는 돈 · 기본 판매 채널 기준 (배달은 이익 화면에서 채널별로)</p>
            <ul className="mt-4 max-h-72 space-y-2 overflow-auto text-sm">
              {sections.profitability.items.map((item) => (
                <li
                  key={item.menuItemId}
                  className="flex items-baseline justify-between gap-3 border-b border-slate-800/80 py-2"
                >
                  <span className="text-slate-200">{item.name}</span>
                  <span className="text-slate-400">
                    {formatWon(item.contribution)} · 마진율 {formatPct(item.contributionMargin)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isUnavailable(sections.priceImpact) ? (
          <EmptyPanel
            title="식재료 가격 변동 영향"
            message={sections.priceImpact.message}
            requiredInput={sections.priceImpact.requiredInput}
          />
        ) : (
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-sm font-medium text-slate-200">최근 가격 변동</h2>
            <p className="mt-1 text-xs text-slate-500">
              최근에 단가가 바뀐 재료입니다.
            </p>
            <ul className="mt-4 max-h-72 space-y-2 overflow-auto text-sm">
              {sections.priceImpact.items.map((item) => (
                <li
                  key={item.historyId}
                  className="border-b border-slate-800/80 py-2 text-slate-300"
                >
                  <div className="font-medium text-slate-200">{item.ingredientName}</div>
                  <div className="text-xs text-slate-500">
                    {item.previousPurchasePrice !== null && item.newPurchasePrice !== null
                      ? `구매가 ${formatWon(item.previousPurchasePrice)} → ${formatWon(item.newPurchasePrice)}`
                      : `단가 ${item.previousUnitCost} → ${item.newUnitCost}`}{" "}
                    ·{" "}
                    {new Date(item.effectiveAt).toLocaleString("ko-KR")}
                  </div>
                </li>
              ))}
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
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-sm font-medium text-slate-200">이론–실제 차이</h2>
            <p className="mt-1 text-xs text-slate-500">
              기간 {sections.variance.periodStart} ~ {sections.variance.periodEnd}
            </p>
            <p className="mt-4 text-2xl font-semibold text-white">
              {formatWon(sections.variance.totalVarianceAmt)}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              비교된 식재료 {sections.variance.comparedCount}개
            </p>
          </section>
        )}

        {isUnavailable(sections.weekly) ? (
          <EmptyPanel
            title="주간 이상 징후"
            message={sections.weekly.message}
            requiredInput={sections.weekly.requiredInput}
          />
        ) : (
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-sm font-medium text-slate-200">확인 필요 알림</h2>
            <p className="mt-1 text-xs text-slate-500">
              확인 안 한 알림 {sections.weekly.count}건
            </p>
            <ul className="mt-4 max-h-72 space-y-3 overflow-auto text-sm">
              {sections.weekly.items.map((item) => (
                <li key={item.id} className="border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-200">{item.title}</span>
                  </div>
                  <p className="mt-1 text-slate-400">{item.body}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.weekStart} 주</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {sections.contribution.available !== true ? (
        <EmptyPanel
          title="메뉴별 기여도"
          message={sections.contribution.message}
          requiredInput={sections.contribution.requiredInput}
        />
      ) : (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-sm font-medium text-slate-200">메뉴 기여도</h2>
          <p className="mt-1 text-xs text-slate-500">
            기간 {sections.contribution.periodStart} ~{" "}
            {sections.contribution.periodEnd} · 판매 기록이 있는 메뉴만
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-xs uppercase tracking-wide text-amber-200/90">
                많이 팔리지만 덜 남음
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {sections.contribution.highSalesLowContrib.length === 0 ? (
                  <li className="text-slate-500">해당 없음</li>
                ) : (
                  sections.contribution.highSalesLowContrib.map((m) => (
                    <li key={m.menuItemId}>
                      {m.name} · 판매 {m.salesQty.toLocaleString("ko-KR")} · 총 {formatWon(m.totalContribution)}
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wide text-emerald-200/90">
                적게 팔리지만 많이 남음
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {sections.contribution.lowSalesHighContrib.length === 0 ? (
                  <li className="text-slate-500">해당 없음</li>
                ) : (
                  sections.contribution.lowSalesHighContrib.map((m) => (
                    <li key={m.menuItemId}>
                      {m.name} · 판매 {m.salesQty.toLocaleString("ko-KR")} · 총 {formatWon(m.totalContribution)}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
