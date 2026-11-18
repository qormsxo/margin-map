import Link from "next/link";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { LogoutButton } from "@/components/layout/logout-button";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const nav = [
  { href: "/dashboard", label: "홈" },
  { href: "/ingredients", label: "재료" },
  { href: "/menus", label: "메뉴" },
  { href: "/sales", label: "판매" },
  { href: "/contribution", label: "이익" },
  { href: "/purchases", label: "매입" },
];

const desktopNav = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/ingredients", label: "식재료" },
  { href: "/menus", label: "메뉴" },
  { href: "/sales", label: "판매량" },
  { href: "/contribution", label: "이익" },
  { href: "/fixed-costs", label: "고정비" },
  { href: "/purchases", label: "매입" },
  { href: "/alerts", label: "이상징후" },
  { href: "/simulation", label: "시뮬" },
];

/** Signed-in store name, or null when signed out (or the session points to a deleted store). */
async function currentStoreName(): Promise<string | null> {
  const session = await getSession();

  if (!session) return null;

  const store = await prisma.store.findUnique({
    where: { id: session.storeId },
    select: { name: true },
  });

  return store?.name ?? null;
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const storeName = await currentStoreName();
  const signedIn = storeName !== null;

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_#1e293b_0%,_transparent_55%)]" />
      <header className="relative border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <Link
            href={signedIn ? "/dashboard" : "/"}
            className="text-lg font-semibold tracking-tight text-sky-300"
          >
            MarginMap
          </Link>
          {signedIn ? (
            <nav className="hidden items-center gap-1 text-sm text-slate-300 lg:flex">
              {desktopNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2 py-1 hover:bg-slate-800 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
          <div className="flex items-center gap-3 text-sm">
            {signedIn ? (
              <>
                <span className="max-w-32 truncate text-slate-400" title={storeName}>
                  {storeName}
                </span>
                <LogoutButton className="rounded-md px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40" />
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-sky-500 px-3 py-1.5 font-medium text-slate-950 hover:bg-sky-400"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className={`relative mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10 ${signedIn ? "pb-24 lg:pb-10" : ""}`}>
        {children}
      </main>

      {signedIn ? (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 backdrop-blur lg:hidden">
          <ul className="mx-auto grid max-w-lg grid-cols-6 gap-1 px-1 py-2 text-center text-[11px] text-slate-400">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-1 py-1 hover:bg-slate-900 hover:text-sky-300"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <InstallPrompt />
    </div>
  );
}
