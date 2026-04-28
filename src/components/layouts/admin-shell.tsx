"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Gauge,
  Receipt,
  Books,
  Users,
  Certificate,
  Gear,
  CaretLeft,
  CaretRight,
  type Icon,
} from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/server/auth-session";

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  badge?: number;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "แดชบอร์ด", icon: Gauge },
  { href: "/admin/slips", label: "ตรวจสลิป", icon: Receipt },
  { href: "/admin/courses", label: "คอร์ส", icon: Books },
  { href: "/admin/users", label: "ผู้ใช้", icon: Users },
  { href: "/admin/certificates", label: "ใบประกาศ", icon: Certificate },
];

const NAV_FOOT: NavItem[] = [{ href: "/admin/settings", label: "ตั้งค่า", icon: Gear }];

export function AdminShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);

  return (
    <div className="flex min-h-full">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-(--primary) focus:px-3 focus:py-2 focus:text-(--primary-fg)"
      >
        ข้ามไปยังเนื้อหา
      </a>
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-(--border) bg-(--surface-muted) transition-[width] duration-200 md:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center border-b border-(--border)",
            collapsed ? "justify-center" : "px-5",
          )}
        >
          <Link href="/admin" className="flex items-center gap-2 text-(--foreground)">
            <span className="h-2.5 w-2.5 rounded-full bg-(--primary)" aria-hidden />
            {!collapsed && (
              <span className="text-base font-semibold">
                Finalive
                <span className="ml-1 text-[11px] font-medium text-(--foreground-muted)">admin</span>
              </span>
            )}
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 py-3" aria-label="แอดมิน">
          {NAV.map((n) => (
            <NavLink key={n.href} item={n} active={!!isActive(n.href)} collapsed={collapsed} />
          ))}
          <div className="my-3 h-px bg-(--border)" />
          {NAV_FOOT.map((n) => (
            <NavLink key={n.href} item={n} active={!!isActive(n.href)} collapsed={collapsed} />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-(--border) bg-(--background)/95 px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="hidden h-9 w-9 items-center justify-center rounded-md text-(--foreground-muted) hover:bg-(--surface-muted) hover:text-(--foreground) md:inline-flex"
              aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
            </button>
            <h1 className="text-ui font-medium text-(--foreground-muted) md:text-sm">
              {NAV.find((n) => isActive(n.href))?.label ?? "แอดมิน"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserProfileDropdown
              name={user.name}
              email={user.email}
              links={[
                { href: "/admin", label: "แผงควบคุม" },
                { href: "/admin/courses", label: "จัดการคอร์ส" },
              ]}
            />
          </div>
        </header>
        <main id="main" className="flex-1 px-6 py-6 md:px-8 md:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Ic = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative mx-2 flex items-center gap-3 rounded-md text-ui transition-colors",
        collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
        active
          ? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] font-semibold text-(--primary)"
          : "text-(--foreground) hover:bg-(--surface)",
      )}
    >
      <Ic size={18} weight={active ? "bold" : "regular"} />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {item.badge !== undefined && !collapsed && (
        <span className="tabular-nums inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-(--accent) px-1.5 text-[11px] font-semibold text-(--accent-fg)">
          {item.badge}
        </span>
      )}
      {item.badge !== undefined && collapsed && (
        <span className="tabular-nums absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-(--accent) px-1 text-[10px] font-semibold text-(--accent-fg)">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
