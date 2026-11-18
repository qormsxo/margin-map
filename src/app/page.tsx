import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-8 pb-24 sm:pb-8">
      <section className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400/80">
          MarginMap
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          MarginMap
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-slate-300">
          메뉴 하나 팔면 얼마 남는지, 재료값이 오르면 어디서 손해 보는지, 이번 달 실제로
          남은 돈이 얼마인지 한눈에 봅니다. 휴대폰과 PC 어디서나 사용할 수 있습니다.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 hover:bg-sky-400"
          >
            시작하기
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-900"
          >
            대시보드
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "재료·메뉴",
            body: "식재료 단가와 메뉴 판매가·이론 공헌이익을 관리합니다.",
            href: "/ingredients",
          },
          {
            title: "수익성·이상징후",
            body: "대시보드에서 공헌이익, 가격 영향, 주간 알림을 확인합니다.",
            href: "/dashboard",
          },
          {
            title: "시뮬레이션",
            body: "판매가·수수료를 바꿔도 운영 데이터는 그대로입니다.",
            href: "/simulation",
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-sky-500/40"
          >
            <h2 className="text-sm font-medium text-slate-100">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{card.body}</p>
          </Link>
        ))}
      </section>

    </div>
  );
}
