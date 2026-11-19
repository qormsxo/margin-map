import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const links = [
  { href: "/tools/menu-cost-calculator", label: "원가 계산기" },
  { href: "/guides", label: "사장님 가이드" },
];

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link href="/" aria-label="MarginMap 홈">
        <Logo tone="dark" />
      </Link>
      <nav aria-label="주요 메뉴" className="flex items-center gap-1 text-sm">
        <ul className="hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="rounded-full px-3 py-2 font-medium text-ink-soft hover:bg-subtle hover:text-ink">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <ThemeToggle className="rounded-full p-2 text-muted hover:bg-subtle hover:text-ink" />
        <Link href="/login" className="rounded-full px-3 py-2 font-medium text-ink-soft hover:text-ink">
          로그인
        </Link>
        <Link
          href="/login?mode=register"
          className="hidden rounded-full bg-accent px-4 py-2 font-semibold text-white hover:bg-accent-hover sm:inline-block"
        >
          무료로 시작
        </Link>
      </nav>
    </header>
  );
}
