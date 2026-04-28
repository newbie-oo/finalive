import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SessionUser } from "@/server/auth-session";

export function StudentShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border px-4">
        <Link href="/account" className="font-semibold">
          Finalive
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/account/enrollments">คอร์สของฉัน</Link>
          <Link href="/account/certificates">ใบประกาศ</Link>
          <span className="text-muted-foreground">{user.name}</span>
          <ThemeToggle />
        </nav>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
