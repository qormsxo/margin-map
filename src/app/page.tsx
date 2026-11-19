import Link from "next/link";

const features = [
  {
    t: "메뉴 1개 팔면 얼마 남나",
    d: "레시피대로 재료비를 계산하고, 홀·배민·쿠팡이츠 수수료까지 빼서 보여줍니다.",
  },
  {
    t: "재료값이 오르면 바로 알림",
    d: "구매가를 바꾸는 순간 어느 메뉴에서 얼마가 줄었는지 알려 드립니다.",
  },
  {
    t: "이번 달 진짜 남은 돈",
    d: "인건비·월세까지 빼서 영업이익과 하루 손익분기 매출을 계산합니다.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-14 pb-16">
      <section className="grid items-center gap-10 pt-4 lg:grid-cols-2 lg:pt-10">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            사장님을 위한 원가 계산기
          </span>
          <h1 className="text-4xl leading-[1.15] font-bold tracking-tight text-heading sm:text-[52px]">
            많이 팔았는데
            <br />
            <span className="text-accent">왜 남는 게 없지?</span>
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted sm:text-lg">
            메뉴마다 얼마 남는지, 재료값이 오르면 어디서 새는지, 이번 달 진짜 남은 돈이 얼마인지.
            엑셀 없이 휴대폰으로 확인하세요.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login?mode=register"
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 hover:bg-accent-hover"
            >
              무료로 시작하기
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-line-strong bg-surface px-6 py-3 text-sm font-semibold text-heading hover:border-heading"
            >
              로그인
            </Link>
          </div>
        </div>

        {/* Product preview: what the owner sees after setup. */}
        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-brand-tint/60 blur-2xl" />
          <div className="relative overflow-hidden rounded-3xl bg-pine-900 p-6 text-white shadow-lift sm:p-8">
            <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pine-500/40 blur-3xl" />
            <p className="relative text-sm text-pine-200">11월 진짜 남은 돈</p>
            <p className="relative mt-2 text-5xl font-bold tracking-tight">6,480,860원</p>
            <div className="relative mt-6 h-2.5 overflow-hidden rounded-full bg-pine-950/60">
              <div className="h-full w-[78%] rounded-full bg-accent" />
            </div>
            <p className="relative mt-2 text-xs text-pine-200">손익분기 매출 128% 달성</p>
          </div>
          <div className="card relative mt-4 ml-8 flex items-center gap-3 p-4 sm:-mt-6 sm:ml-16">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">▲</span>
            <div className="text-sm">
              <p className="font-semibold text-ink">닭 10호 구매가 8% 올랐어요</p>
              <p className="text-xs text-muted">후라이드 1마리당 −520원</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {features.map((f, i) => (
          <div key={f.t} className="card p-6">
            <span className="text-sm font-bold text-accent">0{i + 1}</span>
            <h2 className="mt-3 text-lg font-bold text-heading">{f.t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
