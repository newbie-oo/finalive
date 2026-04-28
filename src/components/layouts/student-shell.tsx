import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
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
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-y-2 border-b border-border px-4 py-2">
        <Link href="/account" className="font-semibold">
          Finalive
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/account/enrollments">คอร์สของฉัน</Link>
          <Link href="/account/certificates">ใบประกาศ</Link>
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
          <ThemeToggle />
        </nav>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
