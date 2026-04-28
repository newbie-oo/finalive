import Link from "next/link";
import { getSession } from "@/server/auth-session";
import { db } from "@/db/client";
import { user } from "@/db/schema/auth";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">ไม่มีสิทธิ์เข้าถึง</p>
      </div>
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
    <div className="p-6">
      <h1 className="text-xl font-semibold">ผู้ใช้ทั้งหมด</h1>

      <div className="mt-4 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4">ชื่อ</th>
              <th className="pb-2 pr-4">อีเมล</th>
              <th className="pb-2 pr-4">บทบาท</th>
              <th className="pb-2">วันที่สมัคร</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="py-2 pr-4">
                  <Link href={`/admin/users/${u.id}`} className="text-primary hover:underline">
                    {u.name}
                  </Link>
                </td>
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2 pr-4">{u.role}</td>
                <td className="py-2">{u.createdAt?.toLocaleDateString("th-TH")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
