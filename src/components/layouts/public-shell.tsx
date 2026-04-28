"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border px-4">
        <Link href="/" className="font-semibold">
          Finalive
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/courses">คอร์ส</Link>
          {session?.user ? (
            <>
              <Link href="/account">บัญชี</Link>
              <span className="text-muted-foreground">{session.user.name}</span>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login">เข้าสู่ระบบ</Link>
          )}
          <ThemeToggle />
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border px-4 py-4 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Finalive
      </footer>
    </div>
  );
}
