import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CaretLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { VidstackPlayer } from "@/components/course/vidstack-player";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildHlsUrl } from "@/server/services/bunny";
import { CurriculumSidebar } from "@/components/learn/curriculum-sidebar";
import { LearnShell } from "@/components/learn/learn-shell";
import { LessonClient } from "@/components/learn/lesson-client";
import { MarkdownView } from "@/lib/markdown";
import { getSession } from "@/server/auth-session";
import { getLearnCourse, getLearnLesson } from "@/server/repos/learn";
import { getQuizByLessonId } from "@/server/repos/quiz";
import { checkLessonAccess } from "@/server/services/learn-access";

export const dynamic = "force-dynamic";

export default async function LearnLessonPage({
  params,
}: {
  params: Promise<{ courseSlug: string; lessonId: string }>;
}) {
  const { courseSlug, lessonId } = await params;
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  const [courseData, lessonData, quizMeta] = await Promise.all([
    getLearnCourse(courseSlug, userId),
    getLearnLesson(courseSlug, lessonId),
    getQuizByLessonId(lessonId),
  ]);

  if (!courseData || !lessonData) notFound();

  const access = checkLessonAccess(
    { isPreview: lessonData.isPreview, isFree: lessonData.isFree },
    { isFree: courseData.course.isFree },
    courseData.isEnrolled,
    userId !== null,
  );

  if (!access.ok) {
    if (access.reason === "login_required") {
      redirect(`/login?redirect=${encodeURIComponent(`/learn/${courseSlug}/${lessonId}`)}`);
    }
    redirect(`/courses/${courseSlug}`);
  }

  return (
    <LearnShell user={session?.user ?? null}>
      <div className="grid h-[calc(100dvh-3.5rem)] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <CurriculumSidebar
            courseSlug={courseSlug}
            modules={courseData.modules}
            progress={courseData.progress}
            isEnrolled={courseData.isEnrolled}
          />
        </aside>
        <main className="overflow-y-auto px-6 py-8 lg:px-10">
          <div className="mx-auto max-w-[960px] space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link
                  href={`/courses/${courseSlug}`}
                  className="inline-flex items-center gap-1 text-uism text-(--foreground-muted) hover:text-(--foreground)"
                >
                  <CaretLeft size={14} /> {lessonData.courseTitle}
                </Link>
                <h1 className="mt-2 text-h2">{lessonData.title}</h1>
                <p className="mt-1 text-uism text-foreground-subtle">{lessonData.moduleTitle}</p>
              </div>
              {lessonData.nextLessonId && (
                <Button asChild variant="secondary" size="md">
                  <Link href={`/learn/${courseSlug}/${lessonData.nextLessonId}`}>
                    บทถัดไป <ArrowRight size={16} weight="bold" />
                  </Link>
                </Button>
              )}
            </div>

            <div className="overflow-hidden rounded-card border border-(--border)">
              {lessonData.bunnyVideoId ? (
                <VidstackPlayer
                  src={buildHlsUrl({ videoId: lessonData.bunnyVideoId })}
                  title={lessonData.title}
                />
              ) : (
                <div
                  role="status"
                  className="flex aspect-video w-full items-center justify-center bg-(--surface-muted) text-body text-(--foreground-muted)"
                >
                  ยังไม่มีวิดีโอสำหรับบทเรียนนี้ — กรุณาอ่านเนื้อหาด้านล่าง
                </div>
              )}
            </div>

            <LessonClient
              lessonId={lessonData.id}
              courseSlug={courseSlug}
              nextLessonId={lessonData.nextLessonId}
              durationSeconds={lessonData.durationSeconds}
            />

            {quizMeta && (
              <Card className="flex items-center justify-between gap-4 bg-(--surface-muted)">
                <div>
                  <h3 className="text-h4">{quizMeta.title}</h3>
                  <p className="mt-1 text-body text-(--foreground-muted)">ทดสอบความเข้าใจหลังจบบทเรียน</p>
                </div>
                <Button asChild variant="primary">
                  <Link href={`/learn/${courseSlug}/quiz/${quizMeta.id}`}>ทำแบบทดสอบ</Link>
                </Button>
              </Card>
            )}

            {lessonData.bodyMd && (
              <div className="prose-style">
                <MarkdownView text={lessonData.bodyMd} />
              </div>
            )}
          </div>
        </main>
      </div>
    </LearnShell>
  );
}
