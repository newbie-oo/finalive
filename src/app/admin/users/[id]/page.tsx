import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth-session";
import { db } from "@/db/client";
import { user } from "@/db/schema/auth";
import { enrollment, adminGrant } from "@/db/schema/enrollment";
import { course } from "@/db/schema/course";
import { eq, desc } from "drizzle-orm";
import { listAdminCourses } from "@/server/repos/admin-course";
import { GrantDialog } from "@/components/admin/grant-dialog";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">ไม่มีสิทธิ์เข้าถึง</p>
      </div>
    );
  }

  const userRows = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  const userRow = userRows[0];
  if (!userRow) notFound();

  const enrollments = await db
    .select({
      id: enrollment.id,
      courseTitle: course.title,
      source: enrollment.source,
      status: enrollment.status,
      createdAt: enrollment.createdAt,
    })
    .from(enrollment)
    .innerJoin(course, eq(enrollment.courseId, course.id))
    .where(eq(enrollment.userId, id))
    .orderBy(desc(enrollment.createdAt));

  const grants = await db
    .select({
      id: adminGrant.id,
      courseTitle: course.title,
      reason: adminGrant.reason,
      note: adminGrant.note,
      grantedAt: adminGrant.grantedAt,
    })
    .from(adminGrant)
    .innerJoin(course, eq(adminGrant.courseId, course.id))
    .where(eq(adminGrant.studentUserId, id))
    .orderBy(desc(adminGrant.grantedAt));

  const courses = await listAdminCourses();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{userRow.name}</h1>
          <p className="text-sm text-muted-foreground">
            {userRow.email} · {userRow.role}
          </p>
        </div>
        <Link href="/admin/users" className="text-sm text-primary hover:underline">
          ← กลับไปรายชื่อ
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between rounded border border-border p-4">
        <div>
          <p className="text-sm text-muted-foreground">สมัครเมื่อ</p>
          <p className="font-medium">{userRow.createdAt?.toLocaleDateString("th-TH")}</p>
        </div>
        <GrantDialog studentUserId={id} courses={courses} />
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium">การลงทะเบียน</h2>
          {enrollments.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีการลงทะเบียน</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {enrollments.map((e) => (
                <li key={e.id} className="rounded border border-border p-3 text-sm">
                  <div className="font-medium">{e.courseTitle}</div>
                  <div className="text-muted-foreground">
                    {e.source} · {e.status} · {e.createdAt?.toLocaleDateString("th-TH")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-lg font-medium">ประวัติการให้สิทธิ์</h2>
          {grants.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีประวัติ</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {grants.map((g) => (
                <li key={g.id} className="rounded border border-border p-3 text-sm">
                  <div className="font-medium">{g.courseTitle}</div>
                  <div className="text-muted-foreground">
                    {g.reason}
                    {g.note ? ` · ${g.note}` : ""} · {g.grantedAt?.toLocaleDateString("th-TH")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
