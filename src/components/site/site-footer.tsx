import Link from "next/link";
import { GUIDES } from "@/lib/guides";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3 sm:px-6">
        <section aria-labelledby="footer-about">
          <h2 id="footer-about" className="font-bold text-heading">
            {site.name} <span className="font-medium text-faint">{site.koreanName}</span>
          </h2>
          <p className="mt-2 leading-relaxed text-muted">
            식당·카페 사장님을 위한 메뉴 원가·마진 계산기. 메뉴 하나 팔면 얼마 남는지 보여 드립니다.
          </p>
        </section>
        <nav aria-labelledby="footer-tools">
          <h2 id="footer-tools" className="font-bold text-heading">
            무료 도구
          </h2>
          <ul className="mt-2 space-y-1.5">
            <li>
              <Link href="/tools/menu-cost-calculator" className="text-muted hover:text-ink">
                메뉴 원가율 계산기
              </Link>
            </li>
            <li>
              <Link href="/login?mode=register" className="text-muted hover:text-ink">
                MarginMap 무료로 시작하기
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-labelledby="footer-guides">
          <h2 id="footer-guides" className="font-bold text-heading">
            사장님 가이드
          </h2>
          <ul className="mt-2 space-y-1.5">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="text-muted hover:text-ink">
                  {g.shortTitle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="pb-8 text-center text-xs text-faint">© {new Date().getFullYear()} {site.name}</p>
    </footer>
  );
}
