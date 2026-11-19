import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, type JsonValue } from "@/components/seo/json-ld";
import { GUIDES } from "@/lib/guides";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const features = [
  {
    t: "메뉴 1개 팔면 얼마 남나",
    d: "레시피대로 재료비를 계산하고, 홀·배민·쿠팡이츠 수수료와 주문당 배달비까지 빼서 메뉴별·채널별로 남는 돈을 보여 줍니다.",
  },
  {
    t: "재료값이 오르면 바로 알림",
    d: "식재료 구매가를 고치는 순간 그 재료가 들어간 메뉴에서 1개당 얼마가 줄었는지 알려 드립니다.",
  },
  {
    t: "이번 달 진짜 남은 돈",
    d: "인건비·월세·공과금까지 빼서 영업이익, 손익분기 매출, 하루 목표 매출을 계산합니다.",
  },
];

const steps = [
  { t: "업종 고르기", d: "치킨·카페·중식·한식·분식 중 고르면 판매 채널과 자주 쓰는 재료가 준비됩니다." },
  { t: "재료와 레시피 넣기", d: "재료는 사는 양과 가격만, 레시피는 메뉴에 들어가는 양만 넣으면 됩니다." },
  { t: "한 달에 한 번 판매량", d: "메뉴 × 채널 표에 판매량을 넣거나 엑셀에서 붙여 넣으면 끝입니다." },
];

const faq = [
  {
    q: "MarginMap은 무료인가요?",
    a: "네, 지금은 모든 기능을 무료로 쓸 수 있습니다. 휴대폰과 PC 브라우저에서 바로 쓰고, 홈 화면에 앱처럼 추가할 수도 있습니다.",
  },
  {
    q: "원가율 계산기와 무엇이 다른가요?",
    a: "원가율만이 아니라 채널마다 다른 배달앱 수수료와 주문당 배달비를 빼서 메뉴별로 실제 남는 돈을 계산하고, 고정비까지 빼서 이번 달 영업이익과 손익분기 매출을 보여 줍니다.",
  },
  {
    q: "배민·쿠팡이츠 판매량은 어떻게 넣나요?",
    a: "한 달에 한 번 메뉴 × 채널 표에 판매량과 배달 주문 건수를 넣습니다. 엑셀이나 포스 화면에서 숫자를 복사해 붙여 넣을 수 있습니다.",
  },
  {
    q: "어떤 가게에 맞나요?",
    a: "치킨집, 카페, 중식당, 한식당, 분식집처럼 메뉴별 레시피가 정해진 음식점이라면 업종과 상관없이 쓸 수 있습니다.",
  },
];

const graph: JsonValue = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}/#organization`,
      name: site.name,
      alternateName: site.koreanName,
      url: site.url,
      logo: `${site.url}/icons/icon-512.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      name: site.name,
      alternateName: site.koreanName,
      url: site.url,
      inLanguage: "ko",
      publisher: { "@id": `${site.url}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${site.url}/#app`,
      name: site.name,
      alternateName: site.koreanName,
      url: site.url,
      description: site.description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android, iOS",
      inLanguage: "ko",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
      publisher: { "@id": `${site.url}/#organization` },
      featureList: features.map((f) => f.t),
    },
    {
      "@type": "FAQPage",
      "@id": `${site.url}/#faq`,
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function HomePage() {
  return (
    <div className="space-y-20 pb-8">
      <JsonLd data={graph} />

      <section aria-labelledby="hero-title" className="grid items-center gap-10 pt-4 lg:grid-cols-2 lg:pt-10">
        <div className="space-y-6">
          <h1 id="hero-title" className="text-4xl leading-[1.15] font-bold tracking-tight text-heading sm:text-[52px]">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold tracking-normal text-brand">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
              식당·카페 메뉴 원가·마진 계산기
            </span>
            <br />
            많이 팔았는데
            <br />
            <span className="text-accent">왜 남는 게 없지?</span>
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted sm:text-lg">
            메뉴마다 얼마 남는지, 재료값이 오르면 어디서 새는지, 이번 달 진짜 남은 돈이 얼마인지. 엑셀 없이 휴대폰으로
            확인하세요.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login?mode=register"
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 hover:bg-accent-hover"
            >
              무료로 시작하기
            </Link>
            <Link
              href="/tools/menu-cost-calculator"
              className="rounded-full border border-line-strong bg-surface px-6 py-3 text-sm font-semibold text-heading hover:border-heading"
            >
              가입 없이 원가 계산해 보기
            </Link>
          </div>
        </div>

        <figure aria-label="MarginMap 대시보드 예시" className="relative">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-brand-tint/60 blur-2xl" />
          <div className="relative overflow-hidden rounded-3xl bg-pine-900 p-6 text-white shadow-lift sm:p-8">
            <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pine-500/40 blur-3xl" />
            <p className="relative text-sm text-pine-200">11월 진짜 남은 돈</p>
            <p className="relative mt-2 text-5xl font-bold tracking-tight">6,480,860원</p>
            <div className="relative mt-6 h-2.5 overflow-hidden rounded-full bg-pine-950/60">
              <div className="h-full w-full rounded-full bg-accent" />
            </div>
            <p className="relative mt-2 text-xs text-pine-200">손익분기 매출 128% 달성</p>
          </div>
          <div className="card relative mt-4 ml-8 flex items-center gap-3 p-4 sm:-mt-6 sm:ml-16">
            <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
              ▲
            </span>
            <div className="text-sm">
              <p className="font-semibold text-ink">닭 10호 구매가 8% 올랐어요</p>
              <p className="text-xs text-muted">후라이드 1마리당 −520원</p>
            </div>
          </div>
          <figcaption className="sr-only">이번 달 영업이익과 재료값 인상 알림이 보이는 화면 예시</figcaption>
        </figure>
      </section>

      <section aria-labelledby="features-title">
        <h2 id="features-title" className="text-2xl font-bold tracking-tight text-heading sm:text-3xl">
          원가율만 보면 놓치는 것까지
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {features.map((f, i) => (
            <li key={f.t} className="card p-6">
              <span aria-hidden="true" className="text-sm font-bold text-accent">
                0{i + 1}
              </span>
              <h3 className="mt-3 text-lg font-bold text-heading">{f.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-title">
        <h2 id="how-title" className="text-2xl font-bold tracking-tight text-heading sm:text-3xl">
          시작은 5분이면 됩니다
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.t} className="rounded-2xl border border-line p-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pine-900 text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 font-bold text-heading">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="guides-title">
        <div className="flex items-end justify-between gap-3">
          <h2 id="guides-title" className="text-2xl font-bold tracking-tight text-heading sm:text-3xl">
            사장님 가이드
          </h2>
          <Link href="/guides" className="text-sm font-semibold text-brand hover:text-heading">
            전체 보기 →
          </Link>
        </div>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <article className="card h-full p-6 hover:shadow-lift">
                <h3 className="font-bold text-heading">
                  <Link href={`/guides/${g.slug}`} className="hover:text-accent-ink">
                    {g.shortTitle}
                  </Link>
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{g.description}</p>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq-title" className="max-w-3xl">
        <h2 id="faq-title" className="text-2xl font-bold tracking-tight text-heading sm:text-3xl">
          자주 묻는 질문
        </h2>
        <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
          {faq.map((f) => (
            <details key={f.q} className="p-5">
              <summary className="cursor-pointer list-none font-semibold text-ink">
                <span aria-hidden="true" className="mr-2 text-accent">
                  Q.
                </span>
                {f.q}
              </summary>
              <p className="mt-3 leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
