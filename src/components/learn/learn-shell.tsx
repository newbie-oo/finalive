import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import type { SessionUser } from "@/server/auth-session";

export function LearnShell({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-(--primary) focus:px-3 focus:py-2 focus:text-(--primary-fg)"
      >
        ข้ามไปยังเนื้อหา
      </a>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-(--border) bg-(--background)/95 px-6 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 text-(--foreground)">
          <span className="h-2.5 w-2.5 rounded-full bg-(--primary)" aria-hidden />
          <span className="text-base font-semibold">Finalive</span>
        </Link>
        <nav className="flex items-center gap-3 text-uism">
          <Link href="/courses" className="text-(--foreground-muted) hover:text-(--foreground)">
            คอร์ส
          </Link>
          {user ? (
            <>
              <Link
                href="/account/enrollments"
                className="text-(--foreground-muted) hover:text-(--foreground)"
              >
                คอร์สของฉัน
              </Link>
              <span className="hidden text-(--foreground) md:inline">{user.name}</span>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="text-(--primary) hover:underline">
              เข้าสู่ระบบ
            </Link>
          )}
          <ThemeToggle />
        </nav>
      </header>
      <div id="main" className="flex-1">
        {children}
      </div>
    </div>
  );
}
