import Link from "next/link";
import { getSession } from "@/server/auth-session";
import { db } from "@/db/client";
import { user } from "@/db/schema/auth";
import { desc } from "drizzle-orm";
import { StatusChip } from "@/components/ui/status-chip";
import { AvatarInitials } from "@/components/ui/avatar-initials";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return (
      <p className="text-body text-(--foreground-muted)">ไม่มีสิทธิ์เข้าถึง</p>
    );
  }

  const users = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt));

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-h1">ผู้ใช้ทั้งหมด</h1>
        <p className="mt-1 text-body text-(--foreground-muted)">
          {users.length} คน
        </p>
      </header>

      <div className="overflow-hidden rounded-card border border-(--border) bg-(--surface)">
        <table className="w-full text-ui">
          <thead>
            <tr className="border-b border-(--border) bg-(--surface-muted) text-left">
              <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
                ชื่อ
              </th>
              <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
                อีเมล
              </th>
              <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
                บทบาท
              </th>
              <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
                สมัครเมื่อ
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-(--border) last:border-b-0"
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="inline-flex items-center gap-3 font-medium text-(--foreground) hover:text-(--primary)"
                  >
                    <AvatarInitials name={u.name} size="sm" />
                    {u.name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-(--foreground-muted)">
                  {u.email}
                </td>
                <td className="px-5 py-3">
                  <StatusChip tone={u.role === "admin" ? "primary" : "neutral"}>
                    {u.role === "admin" ? "ผู้ดูแล" : "นักเรียน"}
                  </StatusChip>
                </td>
                <td className="num px-5 py-3 text-uism text-(--foreground-muted)">
                  {u.createdAt?.toLocaleDateString("th-TH")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
