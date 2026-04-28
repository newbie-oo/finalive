import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth-session";
import { getAdminCourseById, getAdminLessonById } from "@/server/repos/admin-course";
import { canEditCourse } from "@/server/services/course-authz";

export const dynamic = "force-dynamic";

export default async function AdminLessonEditPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;

  const session = await getSession();
  if (!session?.user?.id) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">กรุณาเข้าสู่ระบบ</p>
      </div>
    );
  }

  const course = await getAdminCourseById(id);
  if (!course) notFound();

  const canEdit = await canEditCourse(session.user.id, session.user.role, id);
  if (!canEdit) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">ไม่มีสิทธิ์แก้ไขคอร์สนี้</p>
      </div>
    );
  }

  const lesson = await getAdminLessonById(lessonId);
  if (!lesson) notFound();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">แก้ไขบทเรียน</h1>
          <p className="text-sm text-muted-foreground">
            {course.title} › {lesson.title}
          </p>
        </div>
        <Link
          href={`/admin/courses/${id}/curriculum`}
          className="text-sm text-primary hover:underline"
        >
          ← กลับไปเนื้อหา
        </Link>
      </div>

      <div className="rounded border border-border p-6">
        <p className="text-sm text-muted-foreground">
          ตัวแก้ไขบทเรียนเต็มรูปแบบจะมาใน Sprint 8.7
        </p>
        <dl className="mt-4 grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          <dt className="text-muted-foreground">ชื่อบทเรียน</dt>
          <dd>{lesson.title}</dd>

          <dt className="text-muted-foreground">เนื้อหา</dt>
          <dd className="max-h-40 overflow-auto whitespace-pre-wrap">
            {lesson.bodyMd || "—"}
          </dd>

          <dt className="text-muted-foreground">วิดีโอ</dt>
          <dd>{lesson.bunnyVideoId || "ยังไม่มี"}</dd>

          <dt className="text-muted-foreground">ดูตัวอย่าง</dt>
          <dd>{lesson.isPreview ? "ใช่" : "ไม่"}</dd>

          <dt className="text-muted-foreground">ฟรี</dt>
          <dd>{lesson.isFree ? "ใช่" : "ไม่"}</dd>
        </dl>
      </div>
    </div>
  );
}
