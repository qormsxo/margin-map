"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon, type NavIconName } from "@/components/layout/nav-icon";

type NavItem = { href: string; label: string; icon: NavIconName };

const groups: { title: string; items: NavItem[] }[] = [
  {
    title: "한눈에",
    items: [
      { href: "/dashboard", label: "대시보드", icon: "home" },
      { href: "/contribution", label: "이번 달 이익", icon: "chart" },
      { href: "/alerts", label: "알림", icon: "bell" },
    ],
  },
  {
    title: "입력",
    items: [
      { href: "/ingredients", label: "식재료", icon: "leaf" },
      { href: "/menus", label: "메뉴·레시피", icon: "bowl" },
      { href: "/sales", label: "판매량", icon: "receipt" },
      { href: "/fixed-costs", label: "고정비", icon: "wallet" },
      { href: "/purchases", label: "매입", icon: "truck" },
    ],
  },
  {
    title: "도구",
    items: [
      { href: "/simulation", label: "가격 시뮬레이션", icon: "sliders" },
      { href: "/account", label: "계정", icon: "user" },
    ],
  },
];

const mobileItems: NavItem[] = [
  { href: "/dashboard", label: "홈", icon: "home" },
  { href: "/menus", label: "메뉴", icon: "bowl" },
  { href: "/sales", label: "판매", icon: "receipt" },
  { href: "/contribution", label: "이익", icon: "chart" },
  { href: "/ingredients", label: "재료", icon: "leaf" },
];

function useIsActive() {
  const pathname = usePathname();

  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const isActive = useIsActive();

  return (
    <nav className="space-y-6">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-pine-300/70">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                      active
                        ? "bg-pine-800 font-semibold text-white"
                        : "text-pine-100/80 hover:bg-pine-800/60 hover:text-white"
                    }`}
                  >
                    {active ? (
                      <span className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-accent" />
                    ) : null}
                    <NavIcon name={item.icon} className="h-[18px] w-[18px]" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const isActive = useIsActive();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {mobileItems.map((item) => {
          const active = isActive(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${
                  active ? "font-semibold text-heading" : "text-faint"
                }`}
              >
                <span className="relative">
                  <NavIcon name={item.icon} className="h-[22px] w-[22px]" />
                  {active ? (
                    <span className="absolute -top-1 -right-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
                  ) : null}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Mobile: screens that are not in the bottom bar. */
export function MobileMoreLinks() {
  const isActive = useIsActive();

  const extra: NavItem[] = [
    { href: "/fixed-costs", label: "고정비", icon: "wallet" },
    { href: "/purchases", label: "매입", icon: "truck" },
    { href: "/alerts", label: "알림", icon: "bell" },
    { href: "/simulation", label: "시뮬", icon: "sliders" },
    { href: "/account", label: "계정", icon: "user" },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
      {extra.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
            isActive(item.href)
              ? "border-brand-solid bg-brand-solid text-white"
              : "border-line bg-surface text-muted"
          }`}
        >
          <NavIcon name={item.icon} className="h-3.5 w-3.5" />
          {item.label}
        </Link>
      ))}
    </div>
  );
}
