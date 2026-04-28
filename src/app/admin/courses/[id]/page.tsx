import { notFound } from "next/navigation";
import { getAdminCourseById } from "@/server/repos/admin-course";
import { CourseEditForm } from "@/components/admin/course-edit-form";

export const dynamic = "force-dynamic";

export default async function AdminCourseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await getAdminCourseById(id);
  if (!course) notFound();

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-xl font-semibold">แก้ไขคอร์ส</h1>
      <p className="text-sm text-muted-foreground">{course.title}</p>
      <CourseEditForm course={course} />
    </div>
  );
}
