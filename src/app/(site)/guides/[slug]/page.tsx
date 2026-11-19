import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDE_CONTENT } from "@/content/guides";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { GUIDES, findGuide } from "@/lib/guides";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = findGuide((await params).slug);

  if (!guide) return {};

  const url = `/guides/${guide.slug}`;

  return {
    title: guide.title,
    description: guide.description,
    keywords: guide.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: guide.title,
      description: guide.description,
      publishedTime: guide.published,
      modifiedTime: guide.updated,
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const guide = findGuide((await params).slug);
  const content = guide ? GUIDE_CONTENT.get(guide.slug) : undefined;

  if (!guide || !content) notFound();

  const { Body, toc } = content;
  const others = GUIDES.filter((g) => g.slug !== guide.slug);
  const url = `${site.url}/guides/${guide.slug}`;

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { name: "사장님 가이드", href: "/guides" },
          { name: guide.shortTitle, href: `/guides/${guide.slug}` },
        ]}
      />
      <article className="mt-6">
        <header>
          <h1 className="text-3xl leading-tight font-bold tracking-tight text-heading sm:text-4xl">{guide.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">{guide.description}</p>
          <p className="mt-4 text-xs text-faint">
            MarginMap 편집팀 · <time dateTime={guide.updated}>{guide.updated}</time> 업데이트
          </p>
        </header>

        <nav aria-labelledby="toc-title" className="mt-8 rounded-2xl bg-subtle p-5">
          <h2 id="toc-title" className="text-sm font-bold text-heading">
            목차
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="text-ink-soft hover:text-accent-ink">
                  {t.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <Body />

        <footer className="mt-14 rounded-3xl bg-pine-900 p-6 text-white sm:p-8">
          <p className="text-lg font-bold">이 계산, 매달 손으로 하지 마세요</p>
          <p className="mt-2 text-sm leading-relaxed text-pine-200">
            레시피와 판매량만 넣으면 메뉴별 원가율, 채널별 남는 돈, 이번 달 영업이익까지 자동으로 계산됩니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login?mode=register"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              무료로 시작하기
            </Link>
            <Link
              href="/tools/menu-cost-calculator"
              className="rounded-full border border-pine-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pine-800"
            >
              원가 계산기 써 보기
            </Link>
          </div>
        </footer>
      </article>

      <aside aria-labelledby="more-guides" className="mt-12">
        <h2 id="more-guides" className="text-lg font-bold text-heading">
          다른 가이드
        </h2>
        <ul className="mt-3 space-y-2">
          {others.map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="font-medium text-brand hover:text-heading">
                {g.title} →
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.description,
          keywords: guide.keywords.join(", "),
          inLanguage: "ko",
          datePublished: guide.published,
          dateModified: guide.updated,
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          url,
          image: `${site.url}/opengraph-image`,
          author: { "@type": "Organization", name: `${site.name} 편집팀`, url: site.url },
          publisher: {
            "@type": "Organization",
            name: site.name,
            url: site.url,
            logo: { "@type": "ImageObject", url: `${site.url}/icons/icon-512.png` },
          },
        }}
      />
    </div>
  );
}
