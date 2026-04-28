import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import type { SessionUser } from "@/server/auth-session";

const NAV: Array<{ href: string; label: string }> = [
  { href: "/admin", label: "แผงควบคุม" },
  { href: "/admin/slips", label: "ตรวจสลิป" },
  { href: "/admin/courses", label: "คอร์ส" },
  { href: "/admin/users", label: "ผู้ใช้" },
  { href: "/admin/certificates", label: "ใบรับรอง" },
];

export function AdminShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full">
      <aside className="hidden w-56 flex-col border-r border-border p-4 md:flex">
        <Link href="/admin" className="mb-4 font-semibold">
          Finalive Admin
        </Link>
        <nav className="flex flex-col gap-2 text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-y-2 border-b border-border px-4 py-2">
          <nav className="flex flex-wrap items-center gap-3 text-sm md:hidden">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <UserProfileDropdown
              name={user.name}
              email={user.email}
              links={[
                { href: "/admin", label: "แผงควบคุม" },
                { href: "/admin/courses", label: "จัดการคอร์ส" },
              ]}
            />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
