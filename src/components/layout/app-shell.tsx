import Link from "next/link";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { LogoutButton } from "@/components/layout/logout-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { BottomNav, MobileMoreLinks, SidebarNav } from "@/components/layout/nav-links";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

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

function Logo({ tone }: { tone: "light" | "dark" }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-black text-white">
        M
      </span>
      <span
        className={`text-[17px] font-bold tracking-tight ${tone === "light" ? "text-white" : "text-heading"}`}
      >
        MarginMap
      </span>
    </span>
  );
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const storeName = await currentStoreName();

  if (storeName === null) {
    return (
      <div className="min-h-dvh">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/">
            <Logo tone="dark" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle className="rounded-full p-2 text-muted hover:bg-subtle hover:text-ink" />
            <Link
              href="/login"
              className="rounded-full bg-brand-solid px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              로그인
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      {/* Desktop: Pine sidebar (the 30% color). */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-pine-900 px-3 py-5 lg:flex">
        <Link href="/dashboard" className="px-3 pb-7">
          <Logo tone="light" />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="mt-4 rounded-xl bg-pine-950/60 p-3">
          <p className="text-[11px] text-pine-300">내 매장</p>
          <p className="truncate text-sm font-semibold text-white" title={storeName}>
            {storeName}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <LogoutButton className="text-xs text-pine-300 hover:text-white disabled:opacity-40" />
            <ThemeToggle className="rounded-md p-1 text-pine-300 hover:bg-pine-800 hover:text-white" />
          </div>
        </div>
      </aside>

      {/* Mobile: top bar. */}
      <header className="sticky top-0 z-20 bg-canvas/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard">
            <Logo tone="dark" />
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="max-w-28 truncate rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
              {storeName}
            </span>
            <ThemeToggle className="rounded-full p-1.5 text-muted hover:bg-subtle hover:text-ink" />
            <LogoutButton className="text-xs text-faint hover:text-ink disabled:opacity-40" />
          </div>
        </div>
      </header>
      <div className="pt-1 lg:hidden">
        <MobileMoreLinks />
      </div>

      <div className="lg:pl-60">
        <main className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-8 lg:py-10 lg:pb-12">
          <div className="animate-rise">{children}</div>
        </main>
      </div>

      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
