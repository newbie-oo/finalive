import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import type { SessionUser } from "@/server/auth-session";

const NAV = [
  { href: "/courses", label: "คอร์ส" },
  { href: "/account/enrollments", label: "คอร์สของฉัน" },
  { href: "/account/certificates", label: "ใบประกาศ" },
];

export function StudentShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-(--primary) focus:px-3 focus:py-2 focus:text-(--primary-fg)">
        ข้ามไปยังเนื้อหา
      </a>
      <header
        className="sticky top-0 z-50 h-16 border-b border-(--border) backdrop-blur-md"
        style={{ background: "color-mix(in srgb, var(--background) 80%, transparent)" }}
      >
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-6 px-6">
          <Link href="/account" className="flex items-center gap-2 text-(--foreground)">
            <span className="h-2.5 w-2.5 rounded-full bg-(--primary)" aria-hidden />
            <span className="text-[18px] font-semibold tracking-tight">Finalive</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="หลัก">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-nav px-3.5 py-2 text-ui text-(--foreground-muted) transition-colors hover:bg-(--surface-muted) hover:text-(--foreground)"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserProfileDropdown
              name={user.name}
              email={user.email}
              links={[
                { href: "/account", label: "บัญชี" },
                { href: "/account/enrollments", label: "คอร์สของฉัน" },
                { href: "/account/certificates", label: "ใบประกาศ" },
                { href: "/account/security", label: "ความปลอดภัย" },
              ]}
            />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
