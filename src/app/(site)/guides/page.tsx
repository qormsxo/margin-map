import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { GUIDES } from "@/lib/guides";
import { site } from "@/lib/site";

const title = "사장님 가이드: 원가율·배달앱 수수료·손익분기점 계산법";

const description =
  "식당·카페 사장님이 알아야 할 숫자 계산법 모음. 메뉴 원가율, 배민·쿠팡이츠 수수료, 손익분기 매출을 예시와 함께 정리했습니다.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/guides" },
  openGraph: { title, description, url: "/guides", type: "website" },
};

export default function GuidesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs items={[{ name: "사장님 가이드", href: "/guides" }]} />
      <header className="mt-6">
        <p className="eyebrow">사장님 가이드</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-heading sm:text-4xl">
          장사 숫자, 예시로 쉽게 계산하기
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">{description}</p>
      </header>
      <ul className="mt-8 space-y-4">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <article className="card p-6 hover:shadow-lift">
              <h2 className="text-xl font-bold text-heading">
                <Link href={`/guides/${g.slug}`} className="hover:text-accent-ink">
                  {g.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{g.description}</p>
              <p className="mt-3 text-xs text-faint">
                <time dateTime={g.updated}>{g.updated}</time> 업데이트
              </p>
            </article>
          </li>
        ))}
      </ul>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: title,
          description,
          url: `${site.url}/guides`,
          inLanguage: "ko",
          mainEntity: {
            "@type": "ItemList",
            itemListElement: GUIDES.map((g, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${site.url}/guides/${g.slug}`,
              name: g.title,
            })),
          },
        }}
      />
    </div>
  );
}
