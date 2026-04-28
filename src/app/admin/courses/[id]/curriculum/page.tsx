import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth-session";
import { getAdminCourseById, getAdminCourseCurriculum } from "@/server/repos/admin-course";
import { canEditCourse } from "@/server/services/course-authz";
import { CurriculumTree } from "@/components/admin/curriculum-tree";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminCurriculumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  const curriculum = await getAdminCourseCurriculum(id);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">จัดการเนื้อหา</h1>
          <p className="text-sm text-muted-foreground">{course.title}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/admin/courses/${id}`}>← กลับไปคอร์ส</Link>
          </Button>
        </div>
      </div>

      <CurriculumTree courseId={id} modules={curriculum} />
    </div>
  );
}
