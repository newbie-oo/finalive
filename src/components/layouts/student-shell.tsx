"use client";

import { useState } from "react";
import Link from "next/link";
import { STUDENT_NAV, ADMIN_NAV } from "@/lib/navigation";
import { AppHeader } from "./app-header";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="flex w-72 max-w-[85vw] flex-col gap-0 bg-card p-0 md:hidden"
        >
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle className="text-uism font-semibold uppercase tracking-wide text-foreground-subtle">
              เมนู
            </SheetTitle>
          </SheetHeader>
          <nav
            className="flex flex-1 flex-col gap-1 overflow-y-auto px-6 py-4"
            aria-label="Mobile menu"
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
        </SheetContent>
      </Sheet>

      <main
        id="main"
        className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-8"
      >
        {children}
      </main>
    </div>
  );
}
