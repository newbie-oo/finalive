import { notFound } from "next/navigation";
import { getSession } from "@/server/auth-session";
import {
  getAdminCourseById,
  getAdminLessonById,
} from "@/server/repos/admin-course";
import { canEditCourse } from "@/server/services/course-authz";
import { LessonEditor } from "@/components/admin/lesson-editor";

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
        <p className="text-sm text-muted-foreground">
          ไม่มีสิทธิ์แก้ไขคอร์สนี้
        </p>
      </div>
    );
  }

  const lesson = await getAdminLessonById(lessonId);
  if (!lesson) notFound();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <LessonEditor courseId={id} lesson={lesson} />
    </div>
  );
}
