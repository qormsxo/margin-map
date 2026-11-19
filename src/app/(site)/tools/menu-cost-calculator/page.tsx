import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { MenuCostCalculator } from "@/components/site/menu-cost-calculator";
import { site } from "@/lib/site";

const title = "메뉴 원가율 계산기 (무료) · 배달앱 수수료까지 빼고 남는 돈";

const description =
  "판매가와 재료비만 넣으면 메뉴 원가율과 1개 팔 때 남는 돈을 바로 계산합니다. 홀·배민·쿠팡이츠 수수료와 배달비를 빼서 비교해 보세요. 가입 없이 무료.";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["원가율 계산기", "메뉴 원가 계산기", "식당 원가 계산기", "마진 계산기", "배달 수수료 계산기", "카페 원가율"],
  alternates: { canonical: "/tools/menu-cost-calculator" },
  openGraph: { title, description, url: "/tools/menu-cost-calculator", type: "website" },
};

const faq = [
  {
    q: "메뉴 원가율은 어떻게 계산하나요?",
    a: "메뉴 1개에 들어가는 재료비를 판매가로 나누고 100을 곱합니다. 재료비 1,630원, 판매가 5,000원이면 원가율은 32.6%입니다.",
  },
  {
    q: "원가율 말고 무엇을 같이 봐야 하나요?",
    a: "판매가에서 재료비와 수수료·배달비를 뺀 '남는 돈'을 같이 봐야 합니다. 같은 메뉴도 홀과 배달앱에서 남는 돈이 크게 다릅니다.",
  },
  {
    q: "배달앱 수수료는 몇 %로 넣어야 하나요?",
    a: "가게마다 매출 구간·배달 방식·광고에 따라 다릅니다. 한 달 정산명세서의 (중개이용료 + 결제수수료 + 배달비 + 광고비) ÷ 주문 매출로 내 가게의 실제 비율을 구해 넣는 것이 가장 정확합니다.",
  },
];

export default function MenuCostCalculatorPage() {
  const url = `${site.url}/tools/menu-cost-calculator`;

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs items={[{ name: "메뉴 원가율 계산기", href: "/tools/menu-cost-calculator" }]} />
      <header className="mt-6 max-w-2xl">
        <p className="eyebrow">무료 · 가입 없이</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-heading sm:text-4xl">메뉴 원가율 계산기</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">{description}</p>
      </header>

      <div className="mt-8">
        <MenuCostCalculator />
      </div>

      <section aria-labelledby="faq-title" className="mt-14 max-w-3xl">
        <h2 id="faq-title" className="text-2xl font-bold tracking-tight text-heading">
          자주 묻는 질문
        </h2>
        <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
          {faq.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="cursor-pointer list-none font-semibold text-ink">
                <span className="mr-2 text-accent">Q.</span>
                {f.q}
              </summary>
              <p className="mt-3 leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">
          더 자세한 계산법:{" "}
          <Link href="/guides/menu-cost-rate" className="font-semibold text-accent-ink underline">
            메뉴 원가율 계산법
          </Link>
          {" · "}
          <Link href="/guides/delivery-app-fees" className="font-semibold text-accent-ink underline">
            배달앱 수수료 계산법
          </Link>
        </p>
      </section>

      <section className="mt-12 rounded-3xl bg-brand-soft p-6 sm:p-8" aria-labelledby="calc-cta">
        <h2 id="calc-cta" className="text-xl font-bold text-heading">
          메뉴가 여러 개라면, 재료값이 자주 바뀐다면
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          MarginMap에 레시피를 한 번 넣어 두면 재료 가격을 고칠 때마다 모든 메뉴의 원가율과 남는 돈이 다시 계산되고, 채널별
          판매량으로 이번 달 영업이익과 손익분기 매출까지 보여 드립니다.
        </p>
        <Link
          href="/login?mode=register"
          className="mt-5 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          무료로 시작하기
        </Link>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "메뉴 원가율 계산기",
          url,
          description,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          inLanguage: "ko",
          isAccessibleForFree: true,
          offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
          publisher: { "@type": "Organization", name: site.name, url: site.url },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
    </div>
  );
}
