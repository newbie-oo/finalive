import Image from "next/image";
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
  const totalDuration = curriculum.reduce(
    (sum, m) => sum + m.lessons.reduce((s, l) => s + (l.durationSeconds ?? 0), 0),
    0,
  );
  const price = course.isFree ? "ฟรี" : formatTHB(course.price);

  return (
    <PublicShell>
      <section className="mx-auto max-w-4xl p-8">
        <p className="text-xs text-muted-foreground">
          <Link href="/courses" className="hover:underline">
            ← คอร์สทั้งหมด
          </Link>
        </p>

        {course.coverUrl && (
          <div className="mt-4 overflow-hidden rounded-lg">
            <Image
              src={course.coverUrl}
              alt={course.title}
              width={1200}
              height={630}
              className="h-auto w-full object-cover"
            />
          </div>
        )}

        <div className="mt-4 rounded-lg border border-border bg-card p-4 sm:p-6">
          <h1 className="text-2xl font-semibold break-words sm:text-3xl">{course.title}</h1>
          <p className="mt-2 text-base text-muted-foreground">{course.summary}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {course.isFree ? (
              <span className="rounded bg-success px-2 py-1 text-sm font-medium text-success-foreground">
                ฟรี
              </span>
            ) : (
              <span className="text-lg font-medium">{price}</span>
            )}
            <span className="text-sm text-muted-foreground">
              {curriculum.length} โมดูล · {totalLessons} บทเรียน · {formatDuration(totalDuration)}
            </span>
          </div>

          <div className="mt-4">
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
        </div>

        <h2 className="mt-10 mb-3 text-xl font-semibold">เนื้อหาในคอร์ส</h2>

        {curriculum.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีเนื้อหา</p>
        ) : (
          <div className="space-y-4">
            {curriculum.map((m) => (
              <details key={m.id} className="rounded border border-border group" open>
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2 text-sm font-medium">
                    <span>
                      {m.sortOrder}. {m.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {m.lessons.length} บทเรียน
                    </span>
                  </div>
                </summary>
                {m.lessons.map((l) => (
                  <LessonRow key={l.id} lesson={l} courseSlug={course.slug} />
                ))}
              </details>
            ))}
          </div>
        )}
      </section>
    </PublicShell>
  );
}
