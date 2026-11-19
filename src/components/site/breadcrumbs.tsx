import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { site } from "@/lib/site";

export type Crumb = { name: string; href: string };

/** Visible breadcrumb trail plus matching BreadcrumbList structured data. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ name: "홈", href: "/" }, ...items];

  return (
    <>
      <nav aria-label="현재 위치" className="text-xs text-faint">
        <ol className="flex flex-wrap items-center gap-1.5">
          {all.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1.5">
              {i > 0 ? <span aria-hidden="true">›</span> : null}
              {i === all.length - 1 ? (
                <span aria-current="page" className="text-muted">
                  {c.name}
                </span>
              ) : (
                <Link href={c.href} className="hover:text-ink">
                  {c.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: `${site.url}${c.href === "/" ? "" : c.href}`,
          })),
        }}
      />
    </>
  );
}
