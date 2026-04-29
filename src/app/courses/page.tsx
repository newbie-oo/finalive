import { Suspense } from "react";
import { GraduationCap } from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layouts/public-shell";
import { CourseCard, CourseCardSkeleton } from "@/components/course/course-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationNav } from "@/components/ui/pagination-nav";
import {
  listPublishedCourses,
  type ListPublishedCoursesParams,
} from "@/server/repos/course";
import { offsetSchema, type SearchParams } from "@/lib/pagination";

export const dynamic = "force-dynamic";

async function CourseGrid({ params }: { params: ListPublishedCoursesParams }) {
  const result = await listPublishedCourses(params);

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<GraduationCap size={28} weight="duotone" />}
        title="ไม่พบคอร์สที่ตรงกับเงื่อนไข"
        description="ลองเปลี่ยนคำค้น หรือล้างตัวกรองเพื่อดูคอร์สทั้งหมด"
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

function CourseFilters({ q, freeOnly }: { q: string; freeOnly: boolean }) {
  return (
    <form
      method="get"
      action="/courses"
      className="flex flex-wrap items-center gap-3"
    >
      <label className="sr-only" htmlFor="q">
        ค้นหาคอร์ส
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={q}
        placeholder="ค้นหาคอร์ส (ชื่อหรือคำอธิบาย)"
        className="h-10 w-full rounded-button border border-(--border) bg-(--surface) px-3 text-ui sm:w-72"
      />
      <label className="inline-flex items-center gap-2 text-ui">
        <input
          type="checkbox"
          name="free"
          value="1"
          defaultChecked={freeOnly}
          className="h-4 w-4 accent-(--primary)"
        />
        เฉพาะคอร์สฟรี
      </label>
      <button
        type="submit"
        className="inline-flex h-10 items-center rounded-button bg-(--accent) px-4 text-ui font-medium text-(--accent-fg) hover:bg-(--accent-hover)"
      >
        กรอง
      </button>
    </form>
  );
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const base = offsetSchema.parse({
    page: sp.page,
    per_page: sp.per_page ?? 12,
  });
  const q = typeof sp.q === "string" ? sp.q : "";
  const freeOnly = sp.free === "1" || sp.free === "true";
  const params: ListPublishedCoursesParams = { ...base, q, freeOnly };

  return (
    <PublicShell>
      <section className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
        <header className="mb-8 space-y-4">
          <div>
            <h1 className="text-h1">คอร์สทั้งหมด</h1>
            <p className="mt-2 text-bodylg text-(--foreground-muted)">
              เลือกคอร์สที่เหมาะกับเป้าหมายของคุณ
            </p>
          </div>
          <CourseFilters q={q} freeOnly={freeOnly} />
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
