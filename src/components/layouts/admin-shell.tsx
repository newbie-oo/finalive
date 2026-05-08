"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  Gauge,
  Receipt,
  Books,
  Users,
  Certificate,
  CaretLeft,
  CaretRight,
  List,
  type Icon,
} from "@phosphor-icons/react";
import { PublicShell } from "@/components/layouts/public-shell";
import { AdminUserMenu } from "@/components/admin/admin-user-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/server/auth-session";

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  badge?: number;
}

const SIDEBAR_COLLAPSED_KEY = "finalive:admin-sidebar-collapsed";
const COLLAPSED_EVENT = "finalive:admin-sidebar-collapsed-changed";

function getCollapsedSnapshot(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerCollapsedSnapshot(): boolean {
  return false;
}

function subscribeCollapsed(onChange: () => void): () => void {
  // `storage` events fire only across tabs; same-tab updates dispatch
  // a custom event after writing to localStorage so this hook re-syncs.
  window.addEventListener("storage", onChange);
  window.addEventListener(COLLAPSED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(COLLAPSED_EVENT, onChange);
  };
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
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getServerCollapsedSnapshot,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  function toggleCollapsed() {
    const next = !collapsed;
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      // localStorage events don't fire in the same tab — notify listeners.
      window.dispatchEvent(new Event(COLLAPSED_EVENT));
    } catch {
      // Best-effort: storage may be unavailable (private mode).
    }
  }

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

  // Sheet handles scroll-lock + Escape. We close the drawer ourselves on
  // nav-item click since Next.js App Router navigation keeps the layout
  // mounted (Sheet would otherwise stay open after route change).
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <PublicShell hideFooter unboundedMain>
      <div className="flex min-h-[calc(100dvh-4rem)]">
        <aside
          className={cn(
            "sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 flex-col border-r border-border bg-muted transition-[width] duration-200 md:flex",
            collapsed ? "w-16" : "w-60",
          )}
        >
          <div
            className={cn(
              "flex h-12 items-center border-b border-border",
              collapsed ? "justify-center" : "px-4",
            )}
          >
            <button
              type="button"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
              aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
              onClick={toggleCollapsed}
            >
              {collapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
            </button>
            {!collapsed && (
              <span className="ml-2 text-uism font-semibold uppercase tracking-wide text-foreground-subtle">
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

          <div className="border-t border-border p-3">
            <AdminUserMenu
              name={user.name}
              email={user.email}
              collapsed={collapsed}
            />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-8">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="เปิดเมนู"
                  className="relative md:hidden"
                >
                  <List size={20} weight="bold" />
                  {pendingSlipCount && pendingSlipCount > 0 ? (
                    <span
                      className="tabular-nums absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground"
                      aria-hidden
                    >
                      {pendingSlipCount}
                    </span>
                  ) : null}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex w-72 max-w-[85vw] flex-col gap-0 bg-card p-0"
              >
                <SheetHeader className="h-12 flex-row items-center justify-between border-b border-border px-4 py-0">
                  <SheetTitle className="text-uism font-semibold uppercase tracking-wide text-foreground-subtle">
                    Admin
                  </SheetTitle>
                </SheetHeader>

                <nav
                  className="flex flex-1 flex-col gap-0.5 overflow-y-auto py-3"
                  aria-label="แอดมิน (มือถือ)"
                >
                  {nav.map((n) => (
                    <NavLink
                      key={n.href}
                      item={n}
                      active={!!isActive(n.href)}
                      collapsed={false}
                      onClick={closeDrawer}
                    />
                  ))}
                </nav>

                <div className="border-t border-border p-3">
                  <AdminUserMenu name={user.name} email={user.email} />
                </div>
              </SheetContent>
            </Sheet>

            <h1 className="text-ui font-medium text-muted-foreground md:text-sm">
              {activeLabel}
            </h1>
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
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Ic = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "relative mx-2 flex h-10 items-center gap-3 rounded-nav text-ui transition-colors",
        collapsed ? "justify-center" : "px-3",
        active
          ? "bg-primary/10 font-semibold text-primary"
          : "text-foreground hover:bg-card",
      )}
    >
      {/* Active indicator: 3px border-left in primary, per handoff §Admin Shell. */}
      {active && !collapsed && (
        <span
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary"
          aria-hidden
        />
      )}
      <Ic size={20} weight={active ? "bold" : "regular"} />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {item.badge !== undefined && !collapsed && (
        <span className="tabular-nums inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground">
          {item.badge}
        </span>
      )}
      {item.badge !== undefined && collapsed && (
        <span className="tabular-nums absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
