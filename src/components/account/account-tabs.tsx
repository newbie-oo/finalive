"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UserCircle,
  Books,
  Certificate,
  ShieldCheck,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface Tab {
  href: string;
  label: string;
  icon: Icon;
  // Treat as exact-match when the parent path is also a route. Otherwise
  // use prefix-match so /account/enrollments/<id> still highlights the tab.
  exact?: boolean;
}

const TABS: Tab[] = [
  { href: "/account", label: "ข้อมูลบัญชี", icon: UserCircle, exact: true },
  { href: "/account/enrollments", label: "เนื้อหาที่เรียน", icon: Books },
  { href: "/account/certificates", label: "ใบประกาศ", icon: Certificate },
  { href: "/account/security", label: "ความปลอดภัย", icon: ShieldCheck },
];

export function AccountTabs() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="บัญชี" className="flex gap-1 overflow-x-auto lg:flex-col">
      {TABS.map((t) => {
        const active = t.exact
          ? pathname === t.href
          : pathname === t.href || pathname.startsWith(`${t.href}/`);
        const Ic = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2.5 rounded-nav px-3 text-ui transition-colors",
              active
                ? "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] font-semibold text-(--primary)"
                : "text-(--foreground) hover:bg-(--surface-muted)",
            )}
          >
            <Ic size={18} weight={active ? "bold" : "regular"} />
            <span className="whitespace-nowrap">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
