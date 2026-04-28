import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminCourseById } from "@/server/repos/admin-course";
import { getCourseCurriculum } from "@/server/repos/course";
import { CourseEditForm } from "@/components/admin/course-edit-form";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { eq } from "drizzle-orm";
import { publicUrl } from "@/server/services/r2";

export const dynamic = "force-dynamic";

export default async function AdminCourseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await getAdminCourseById(id);
  if (!course) notFound();

  let coverUrl: string | null = null;
  if (course.coverMediaId) {
    const assets = await db
      .select({ storageKey: mediaAsset.storageKey })
      .from(mediaAsset)
      .where(eq(mediaAsset.id, course.coverMediaId))
      .limit(1);
    if (assets[0]) {
      coverUrl = publicUrl(`covers/${assets[0].storageKey}-640.webp`);
    }
  }

  const curriculum = await getCourseCurriculum(id);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">แก้ไขคอร์ส</h1>
      <p className="text-sm text-muted-foreground">{course.title}</p>

      <div className="mt-6">
        <CourseEditForm course={course} coverUrl={coverUrl} />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">เนื้อหาในคอร์ส</h2>
          <Link
            href={`/admin/courses/${id}/curriculum`}
            className="text-sm text-primary hover:underline"
          >
            จัดการเนื้อหา →
          </Link>
        </div>
        {curriculum.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีโมดูล</p>
        ) : (
          <div className="mt-3 space-y-4">
            {curriculum.map((mod) => (
              <div key={mod.id} className="rounded border p-4">
                <h3 className="font-medium">{mod.title}</h3>
                {mod.lessons.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">ยังไม่มีบทเรียน</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {mod.lessons.map((ls) => (
                      <li key={ls.id} className="flex items-center justify-between text-sm">
                        <span>{ls.title}</span>
                        <Link
                          href={`/admin/courses/${id}/lessons/${ls.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          แก้ไข →
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
