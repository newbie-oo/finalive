import { PublicShell } from "@/components/layouts/public-shell";
import { CourseCard } from "@/components/course/course-card";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { listPublishedCourses } from "@/server/repos/course";
import { offsetSchema } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = offsetSchema.parse({
    page: sp.page,
    per_page: sp.per_page ?? 12,
  });
  const result = await listPublishedCourses(params);

  return (
    <PublicShell>
      <section className="mx-auto max-w-6xl p-8">
        <h1 className="mb-1 text-2xl font-semibold">คอร์สทั้งหมด</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {result.pagination.total_count} คอร์สที่เปิดให้ลงทะเบียน
        </p>
        {result.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีคอร์สเปิดสอน</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.map((c) => (
              <li key={c.id}>
                <CourseCard course={c} />
              </li>
            ))}
          </ul>
        )}
        <PaginationNav
          page={result.pagination.page}
          totalPages={result.pagination.total_pages}
          basePath="/courses"
          perPage={params.per_page === 12 ? undefined : params.per_page}
        />
      </section>
    </PublicShell>
  );
}
