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
    hint: "메뉴마다 들어가는 재료와 양 · 이게 있어야 원가와 남는 돈이 계산됩니다",
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

  return (
    <section className="space-y-3 rounded-xl border border-sky-500/30 bg-slate-900/60 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-slate-100">시작하기</h2>
        <span className="text-xs text-slate-500">
          {doneCount} / {list.length}
        </span>
      </div>
      <ol className="space-y-2 text-sm">
        {list.map((step, i) => (
          <li key={step.label} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                step.done ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"
              }`}
            >
              {step.done ? "✓" : i + 1}
            </span>
            <div className="min-w-0">
              {step.href && !step.done ? (
                <Link href={step.href} className="text-sky-300 hover:text-sky-200">
                  {step.label} →
                </Link>
              ) : (
                <span className={step.done ? "text-slate-400 line-through" : "text-slate-200"}>
                  {step.label}
                </span>
              )}
              <p className="text-xs text-slate-500">{step.hint}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
