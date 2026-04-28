"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";

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
            <UserProfileDropdown
              name={session.user.name}
              email={session.user.email}
              image={(session.user as { image?: string | null }).image}
              links={[
                { href: "/account", label: "บัญชี" },
                { href: "/account/enrollments", label: "คอร์สของฉัน" },
                { href: "/account/security", label: "ความปลอดภัย" },
              ]}
            />
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
