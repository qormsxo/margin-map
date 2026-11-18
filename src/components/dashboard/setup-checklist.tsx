import Link from "next/link";

export type SetupStatus = {
  ingredients: number;
  menus: number;
  channels: number;
  menusWithRecipe: number;
  salesPeriods: number;
  fixedCosts: number;
};

const steps = (s: SetupStatus) => [
  { done: s.ingredients > 0, label: "식재료 등록", hint: "구매가와 손질 수율", href: "/ingredients" },
  { done: s.menus > 0, label: "메뉴 등록", hint: "메뉴명과 판매가", href: "/menus" },
  {
    done: s.menus > 0 && s.menusWithRecipe === s.menus,
    label: "메뉴마다 레시피 넣기",
    hint: "들어가는 재료와 양 · 이게 있어야 남는 돈이 계산됩니다",
    href: "/menus",
  },
  { done: s.channels > 0, label: "판매 채널 추가", hint: "홀·배민·쿠팡이츠와 수수료", href: "/sales" },
  { done: s.salesPeriods > 0, label: "이번 달 판매량 입력", hint: "메뉴 × 채널, 배달 주문 건수", href: "/sales" },
  { done: s.fixedCosts > 0, label: "월 고정비 입력", hint: "인건비·월세·공과금", href: "/fixed-costs" },
];

export function isSetupComplete(s: SetupStatus) {
  return steps(s).every((step) => step.done);
}

export function SetupChecklist({ status }: { status: SetupStatus }) {
  const list = steps(status);
  const doneCount = list.filter((s) => s.done).length;
  const nextIndex = list.findIndex((s) => !s.done);

  return (
    <section className="card overflow-hidden">
      <div className="bg-pine-900 px-5 py-4 text-white">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">시작하기</h2>
          <span className="text-sm text-pine-200">
            <b className="text-white">{doneCount}</b> / {list.length}
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-pine-950/60">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${(doneCount / list.length) * 100}%` }}
          />
        </div>
      </div>
      <ol className="divide-y divide-line">
        {list.map((step, i) => {
          const next = i === nextIndex;

          return (
            <li key={step.label}>
              <Link
                href={step.href}
                className={`flex items-center gap-3 px-5 py-3.5 ${next ? "bg-accent-soft" : "hover:bg-canvas"}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step.done
                      ? "bg-brand-tint text-brand"
                      : next
                        ? "bg-accent text-white"
                        : "bg-subtle text-faint"
                  }`}
                >
                  {step.done ? "✓" : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm ${
                      step.done ? "text-faint line-through" : next ? "font-bold text-accent-ink" : "font-medium text-ink"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="block text-xs text-faint">{step.hint}</span>
                </span>
                {next ? <span className="text-sm font-semibold text-accent-ink">지금 →</span> : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
