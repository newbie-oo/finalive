import { Suspense } from "react";
import { GraduationCap } from "@phosphor-icons/react/dist/ssr";
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
        icon={<GraduationCap size={28} weight="duotone" />}
        title="ยังไม่มีคอร์สเปิดสอน"
        description="ทีมงานกำลังเตรียมคอร์สใหม่ — กรุณากลับมาตรวจสอบภายหลัง"
      />
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.data.map((c) => (
          <li key={c.id}>
            <CourseCard course={c} />
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <PaginationNav
          page={result.pagination.page}
          totalPages={result.pagination.total_pages}
          basePath="/courses"
          perPage={params.per_page === 12 ? undefined : params.per_page}
        />
      </div>
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
      <section className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-h1">คอร์สทั้งหมด</h1>
            <p className="mt-2 text-bodylg text-(--foreground-muted)">
              เลือกคอร์สที่เหมาะกับเป้าหมายของคุณ
            </p>
          </div>
        </header>
        <Suspense
          fallback={
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
