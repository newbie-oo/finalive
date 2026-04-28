import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LockSimple, Play, CaretRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layouts/public-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
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
    <div className="flex items-center justify-between border-b border-(--border) px-4 py-3 text-body last:border-b-0">
      <span className="flex items-center gap-3">
        <Icon size={16} weight={playable ? "fill" : "regular"} className={playable ? "text-(--primary)" : "text-(--foreground-subtle)"} />
        <span className={playable ? "text-(--foreground)" : "text-(--foreground-muted)"}>{lesson.title}</span>
        {lesson.isPreview && <StatusChip tone="info">ตัวอย่าง</StatusChip>}
        {lesson.isFree && !lesson.isPreview && <StatusChip tone="success">ฟรี</StatusChip>}
      </span>
      <span className="num text-uism text-(--foreground-muted)">{formatDuration(lesson.durationSeconds)}</span>
    </div>
  );
  if (playable) {
    return (
      <Link
        href={`/courses/${courseSlug}/preview/${lesson.id}`}
        className="block transition-colors hover:bg-(--surface-muted)"
      >
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}

const INCLUDES = [
  "วิดีโอเรียนได้ตลอดชีพ",
  "เปิดดูบนทุกอุปกรณ์",
  "แบบทดสอบจบบท",
  "ใบประกาศเมื่อเรียนจบ",
];

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
      <section className="mx-auto max-w-[1200px] px-6 py-10">
        <nav aria-label="breadcrumb" className="mb-6 flex items-center gap-2 text-uism text-(--foreground-muted)">
          <Link href="/courses" className="hover:text-(--foreground)">คอร์สทั้งหมด</Link>
          <CaretRight size={14} />
          <span className="truncate text-(--foreground)">{course.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <h1 className="text-h1 break-words">{course.title}</h1>
            <p className="text-bodylg text-(--foreground-muted)">{course.summary}</p>
            <div className="flex flex-wrap items-center gap-2">
              {course.isFree && <StatusChip tone="success">ฟรี</StatusChip>}
              <StatusChip tone="neutral">
                {curriculum.length} โมดูล · {totalLessons} บทเรียน · {formatDuration(totalDuration)}
              </StatusChip>
            </div>

            <h2 className="text-h2 pt-4">เนื้อหาในคอร์ส</h2>
            {curriculum.length === 0 ? (
              <p className="text-body text-(--foreground-muted)">ยังไม่มีเนื้อหา</p>
            ) : (
              <div className="space-y-3">
                {curriculum.map((m) => (
                  <details key={m.id} className="overflow-hidden rounded-card border border-(--border) bg-(--surface)" open>
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-center justify-between bg-(--surface-muted) px-4 py-3 text-ui font-medium">
                        <span>
                          {m.sortOrder}. {m.title}
                        </span>
                        <span className="text-uism text-(--foreground-muted)">
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
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card noPadding className="overflow-hidden shadow-(--shadow-sm)">
              {course.coverUrl && (
                <div className="relative aspect-video w-full overflow-hidden bg-(--surface-muted)">
                  <Image
                    src={course.coverUrl}
                    alt={course.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 480px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="space-y-4 p-6">
                <div className="num text-h1 font-semibold text-(--foreground)">{price}</div>
                <ul className="space-y-2.5">
                  {INCLUDES.map((i) => (
                    <li key={i} className="flex items-center gap-2 text-body text-(--foreground-muted)">
                      <CheckCircle size={18} weight="fill" className="text-(--success)" />
                      {i}
                    </li>
                  ))}
                </ul>
                {course.isFree ? (
                  <Button asChild variant="primary" size="lg" className="w-full">
                    <Link href="/account/enrollments">เริ่มเรียน</Link>
                  </Button>
                ) : (
                  <form action="/checkout/start" method="post">
                    <input type="hidden" name="courseSlug" value={course.slug} />
                    <Button type="submit" variant="accent" size="lg" className="w-full">
                      ลงทะเบียน
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          </aside>
        </div>
      </section>
    </PublicShell>
  );
}
