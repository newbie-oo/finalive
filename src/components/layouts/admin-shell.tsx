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
  CaretLeft,
  CaretRight,
  type Icon,
} from "@phosphor-icons/react";
import { PublicShell } from "@/components/layouts/public-shell";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { cn } from "@/lib/utils";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import type { SessionUser } from "@/server/auth-session";

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  badge?: number;
}

const BASE_NAV: NavItem[] = [
  { href: "/admin", label: "แดชบอร์ด", icon: Gauge },
  { href: "/admin/slips", label: "ตรวจสลิป", icon: Receipt },
  { href: "/admin/courses", label: "คอร์ส", icon: Books },
  { href: "/admin/users", label: "ผู้ใช้", icon: Users },
  { href: "/admin/certificates", label: "ใบประกาศ", icon: Certificate },
];

export function AdminShell({
  user,
  pendingSlipCount,
  children,
}: {
  user: SessionUser;
  pendingSlipCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Decorate nav with live counts. The badge only renders when > 0 so an
  // empty queue doesn't dot the sidebar.
  const nav = BASE_NAV.map((n) =>
    n.href === "/admin/slips" && pendingSlipCount && pendingSlipCount > 0
      ? { ...n, badge: pendingSlipCount }
      : n,
  );

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);

  const activeLabel = nav.find((n) => isActive(n.href))?.label ?? "แอดมิน";

  return (
    <PublicShell hideFooter unboundedMain>
      <div className="flex min-h-[calc(100dvh-4rem)]">
        <aside
          className={cn(
            "sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 flex-col border-r border-(--border) bg-(--surface-muted) transition-[width] duration-200 md:flex",
            collapsed ? "w-16" : "w-60",
          )}
        >
          <div
            className={cn(
              "flex h-12 items-center border-b border-(--border)",
              collapsed ? "justify-center" : "px-4",
            )}
          >
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-(--foreground-muted) hover:bg-(--surface) hover:text-(--foreground)"
              aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
            </button>
            {!collapsed && (
              <span className="ml-2 text-uism font-semibold uppercase tracking-wide text-(--foreground-subtle)">
                Admin
              </span>
            )}
          </div>

          <nav
            className="flex flex-1 flex-col gap-0.5 py-3"
            aria-label="แอดมิน"
          >
            {nav.map((n) => (
              <NavLink
                key={n.href}
                item={n}
                active={!!isActive(n.href)}
                collapsed={collapsed}
              />
            ))}
          </nav>

          {!collapsed && (
            <div className="border-t border-(--border) p-3">
              <div className="flex items-center gap-2.5 rounded-nav px-2 py-2">
                <AvatarInitials name={user.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-uism font-semibold text-(--foreground)">
                    {user.name}
                  </div>
                  <div className="truncate text-caption text-(--foreground-muted)">
                    {user.email}
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-(--border) px-6 py-3 md:px-8">
            <h1 className="text-ui font-medium text-(--foreground-muted) md:text-sm">
              {activeLabel}
            </h1>
            <nav
              className="flex items-center gap-1 overflow-x-auto md:hidden"
              aria-label="แอดมินมือถือ"
            >
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className={cn(
                    "rounded-nav px-2 py-1 text-caption",
                    isActive(n.href)
                      ? "bg-(--primary)/10 font-semibold text-(--primary)"
                      : "text-(--foreground-muted) hover:bg-(--surface-muted)",
                  )}
                >
                  {n.label}
                  {n.badge ? (
                    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-(--accent) px-1 text-[10px] font-semibold text-(--accent-fg)">
                      {n.badge}
                    </span>
                  ) : null}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-1 px-6 py-6 md:px-8 md:py-7">{children}</div>
        </div>
      </div>
    </PublicShell>
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
        "relative mx-2 flex h-10 items-center gap-3 rounded-nav text-ui transition-colors",
        collapsed ? "justify-center" : "px-3",
        active
          ? "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] font-semibold text-(--primary)"
          : "text-(--foreground) hover:bg-(--surface)",
      )}
    >
      {/* Active indicator: 3px border-left in primary, per handoff §Admin Shell. */}
      {active && !collapsed && (
        <span
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-(--primary)"
          aria-hidden
        />
      )}
      <Ic size={20} weight={active ? "bold" : "regular"} />
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
