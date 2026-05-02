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
    <section className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-h1">แก้ไขคอร์ส</h1>
        <p className="mt-1 text-bodylg text-(--foreground-muted)">{course.title}</p>
      </header>

      <CourseEditForm course={course} coverUrl={coverUrl} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-h3">เนื้อหาในคอร์ส</h2>
          <Link
            href={`/admin/courses/${id}/curriculum`}
            className="text-uism font-medium text-(--primary) hover:underline"
          >
            จัดการเนื้อหา →
          </Link>
        </div>
        {curriculum.length === 0 ? (
          <p className="text-body text-(--foreground-muted)">ยังไม่มีโมดูล</p>
        ) : (
          <div className="space-y-3">
            {curriculum.map((mod) => (
              <div key={mod.id} className="rounded-card border border-(--border) bg-(--surface) p-5">
                <h3 className="text-h4">{mod.title}</h3>
                {mod.lessons.length === 0 ? (
                  <p className="mt-2 text-uism text-(--foreground-muted)">ยังไม่มีบทเรียน</p>
                ) : (
                  <ul className="mt-3 divide-y divide-(--border)">
                    {mod.lessons.map((ls) => (
                      <li key={ls.id} className="flex items-center justify-between gap-3 py-2 text-body">
                        <span className="text-(--foreground)">{ls.title}</span>
                        <Link
                          href={`/admin/courses/${id}/lessons/${ls.id}`}
                          className="text-uism font-medium text-(--primary) hover:underline"
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
    </section>
  );
}
