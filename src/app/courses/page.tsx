import { Suspense } from "react";
import { PublicShell } from "@/components/layouts/public-shell";
import { CourseCard, CourseCardSkeleton } from "@/components/course/course-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { listPublishedCourses } from "@/server/repos/course";
import { offsetSchema, type SearchParams } from "@/lib/pagination";

export const dynamic = "force-dynamic";

async function CourseGrid({ params }: { params: ReturnType<typeof offsetSchema.parse> }) {
  const result = await listPublishedCourses(params);

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon="🎓"
        title="ยังไม่มีคอร์สเปิดสอน"
        description="ทีมงานกำลังเตรียมคอร์สใหม่ — กรุณากลับมาตรวจสอบภายหลัง"
      />
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.data.map((c) => (
          <li key={c.id}>
            <CourseCard course={c} />
          </li>
        ))}
      </ul>
      <PaginationNav
        page={result.pagination.page}
        totalPages={result.pagination.total_pages}
        basePath="/courses"
        perPage={params.per_page === 12 ? undefined : params.per_page}
      />
    </>
  );
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const params = offsetSchema.parse({
    page: sp.page,
    per_page: sp.per_page ?? 12,
  });

  return (
    <PublicShell>
      <section className="mx-auto max-w-6xl p-4 sm:p-8">
        <h1 className="mb-1 text-2xl font-semibold">คอร์สทั้งหมด</h1>
        <Suspense
          fallback={
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i}>
                  <CourseCardSkeleton />
                </li>
              ))}
            </ul>
          }
        >
          <CourseGrid params={params} />
        </Suspense>
      </section>
    </PublicShell>
  );
}
