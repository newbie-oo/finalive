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
      <header className="flex h-14 items-center justify-between border-b border-border px-4">
        <Link href="/" className="font-semibold">
          Finalive
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/courses">คอร์ส</Link>
          {user ? (
            <>
              <Link href="/account/enrollments">คอร์สของฉัน</Link>
              <span className="text-muted-foreground">{user.name}</span>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login">เข้าสู่ระบบ</Link>
          )}
          <ThemeToggle />
        </nav>
      </header>
      {children}
    </div>
  );
}
