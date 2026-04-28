import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import type { SessionUser } from "@/server/auth-session";

const NAV: Array<{ href: string; label: string }> = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/slips", label: "Slip queue" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/certificates", label: "Certificates" },
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
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <UserProfileDropdown
            name={user.name}
            email={user.email}
            links={[
              { href: "/admin", label: "Dashboard" },
              { href: "/admin/courses", label: "จัดการคอร์ส" },
            ]}
          />
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
