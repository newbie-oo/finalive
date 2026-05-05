"use client";

import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import type { NavItem } from "@/lib/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { Button } from "@/components/ui/button";

export interface AppHeaderUser {
  name: string;
  email: string;
  image?: string | null;
  role?: string;
}

interface AppHeaderProps {
  navItems: NavItem[];
  user?: AppHeaderUser | null;
  rightSlot?: React.ReactNode;
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export function AppHeader({
  navItems,
  user,
  rightSlot,
  onMobileMenuToggle,
  mobileMenuOpen,
}: AppHeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 h-16 border-b border-(--border) backdrop-blur-md"
      style={{
        background: "color-mix(in srgb, var(--background) 80%, transparent)",
      }}
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 text-(--foreground)">
          <span
            className="h-2.5 w-2.5 rounded-full bg-(--primary)"
            aria-hidden
          />
          <span className="text-[18px] font-semibold tracking-tight">
            Finalive
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="หลัก">
          {navItems.map((n) => {
            const isAdminLink = n.visibility === "admin";
            return (
              <Link
                key={n.href}
                href={n.href}
                className={
                  isAdminLink
                    ? "rounded-nav border border-(--primary)/30 bg-(--primary)/10 px-3 py-1.5 text-ui font-semibold text-(--primary) transition-colors hover:bg-(--primary)/15"
                    : "rounded-nav px-3.5 py-2 text-ui text-(--foreground-muted) transition-colors hover:bg-(--surface-muted) hover:text-(--foreground)"
                }
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {rightSlot}
          <ThemeToggle />
          {user ? (
            <UserProfileDropdown
              name={user.name}
              email={user.email}
              image={user.image}
              links={[
                { href: "/account", label: "บัญชี" },
                ...(user.role === "admin"
                  ? [{ href: "/admin", label: "แผงควบคุม" }]
                  : [
                      { href: "/account/enrollments", label: "คอร์สของฉัน" },
                      { href: "/account/certificates", label: "ใบประกาศ" },
                    ]),
              ]}
            />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">เข้าสู่ระบบ</Link>
              </Button>
              <Button asChild variant="primary" size="sm">
                <Link href="/register">สมัคร</Link>
              </Button>
            </>
          )}
        </div>

        {onMobileMenuToggle && (
          <button
            type="button"
            aria-label={mobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
            aria-expanded={mobileMenuOpen}
            onClick={onMobileMenuToggle}
            className="inline-flex h-10 w-10 items-center justify-center rounded-nav text-(--foreground) hover:bg-(--surface-muted) md:hidden"
          >
            {mobileMenuOpen ? <X size={20} /> : <List size={20} />}
          </button>
        )}
      </div>
    </header>
  );
}
