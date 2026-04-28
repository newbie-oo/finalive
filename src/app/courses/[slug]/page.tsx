import { notFound } from "next/navigation";
import Link from "next/link";
import { LockSimple, Play } from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layouts/public-shell";
import { Button } from "@/components/ui/button";
import {
  getPublishedCourseBySlug,
  getCourseCurriculum,
  type CurriculumLesson,
} from "@/server/repos/course";
import { formatTHB, formatDuration } from "@/lib/format";

function LessonRow({ lesson, courseSlug }: { lesson: CurriculumLesson; courseSlug: string }) {
  const playable = lesson.isPreview || lesson.isFree;
  const Icon = playable ? Play : LockSimple;
  const inner = (
    <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm">
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {lesson.title}
      </span>
      <span className="text-xs text-muted-foreground">{formatDuration(lesson.durationSeconds)}</span>
    </div>
  );
  if (playable) {
    return (
      <Link href={`/courses/${courseSlug}/preview/${lesson.id}`} className="block hover:bg-muted">
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getPublishedCourseBySlug(slug);
  if (!course) notFound();
  const curriculum = await getCourseCurriculum(course.id);
  const totalLessons = curriculum.reduce((sum, m) => sum + m.lessons.length, 0);
  const price = course.isFree ? "ฟรี" : formatTHB(course.price);

  return (
    <PublicShell>
      <section className="mx-auto max-w-4xl p-8">
        <p className="text-xs text-muted-foreground">
          <Link href="/courses" className="hover:underline">
            ← คอร์สทั้งหมด
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{course.title}</h1>
        <p className="mt-2 text-base text-muted-foreground">{course.summary}</p>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-lg font-medium">{price}</span>
          {course.isFree ? (
            <Button asChild>
              <Link href="/account/enrollments">เริ่มเรียน</Link>
            </Button>
          ) : (
            <form action="/checkout/start" method="post">
              <input type="hidden" name="courseSlug" value={course.slug} />
              <Button type="submit">ลงทะเบียน</Button>
            </form>
          )}
        </div>

        <h2 className="mt-10 mb-3 text-xl font-semibold">เนื้อหาในคอร์ส</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {curriculum.length} โมดูล · {totalLessons} บทเรียน
        </p>

        {curriculum.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีเนื้อหา</p>
        ) : (
          <div className="space-y-6">
            {curriculum.map((m) => (
              <div key={m.id} className="rounded border border-border">
                <div className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-medium">
                  {m.sortOrder}. {m.title}
                </div>
                {m.lessons.map((l) => (
                  <LessonRow key={l.id} lesson={l} courseSlug={course.slug} />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </PublicShell>
  );
}
