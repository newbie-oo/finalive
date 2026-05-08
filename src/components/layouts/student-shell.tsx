"use client";

import { useState } from "react";
import Link from "next/link";
import { STUDENT_NAV, ADMIN_NAV } from "@/lib/navigation";
import { AppHeader } from "./app-header";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SessionUser } from "@/server/auth-session";

export function StudentShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navItems = user.role === "admin" ? ADMIN_NAV : STUDENT_NAV;

  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        ข้ามไปยังเนื้อหา
      </a>
      <AppHeader
        navItems={navItems}
        user={user}
        onMobileMenuToggle={() => setDrawerOpen((o) => !o)}
        mobileMenuOpen={drawerOpen}
      />

      {drawerOpen && (
        <div className="sticky top-16 z-40 border-t border-border bg-card md:hidden">
          <nav
            className="mx-auto flex max-w-[1200px] flex-col gap-1 px-6 py-4"
            aria-label="เมนูมือถือ"
          >
            {navItems.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-nav px-3 py-2 text-ui text-foreground hover:bg-muted"
                onClick={() => setDrawerOpen(false)}
              >
                {n.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            <Link
              href="/account"
              className="rounded-nav px-3 py-2 text-ui text-foreground hover:bg-muted"
              onClick={() => setDrawerOpen(false)}
            >
              บัญชีของฉัน
            </Link>
            <div className="mt-2 flex justify-end">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}

      <main
        id="main"
        className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-8"
      >
        {children}
      </main>
    </div>
  );
}
