import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VidstackPlayer } from "@/components/course/vidstack-player";
import { buildHlsUrl } from "@/server/services/bunny";
import { CurriculumSidebar } from "@/components/learn/curriculum-sidebar";
import { LearnShell } from "@/components/learn/learn-shell";
import { LessonClient } from "@/components/learn/lesson-client";
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
      <div className="grid h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <CurriculumSidebar
            courseSlug={courseSlug}
            modules={courseData.modules}
            progress={courseData.progress}
            isEnrolled={courseData.isEnrolled}
          />
        </aside>
        <main className="overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  <Link href={`/courses/${courseSlug}`} className="hover:underline">
                    ← {lessonData.courseTitle}
                  </Link>
                </p>
                <h1 className="mt-1 text-xl font-semibold">{lessonData.title}</h1>
                <p className="text-xs text-muted-foreground">{lessonData.moduleTitle}</p>
              </div>
              {lessonData.nextLessonId ? (
                <Link
                  href={`/learn/${courseSlug}/${lessonData.nextLessonId}`}
                  className="text-sm text-primary hover:underline"
                >
                  บทถัดไป →
                </Link>
              ) : null}
            </div>

            {lessonData.bunnyVideoId ? (
              <VidstackPlayer
                src={buildHlsUrl(lessonData.bunnyVideoId)}
                title={lessonData.title}
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded border border-dashed border-border bg-muted text-sm text-muted-foreground">
                วิดีโอจะถูกเชื่อมเมื่อ admin upload (สปรินต์ 8)
              </div>
            )}

            <LessonClient
              lessonId={lessonData.id}
              courseSlug={courseSlug}
              nextLessonId={lessonData.nextLessonId}
              durationSeconds={lessonData.durationSeconds}
            />

            {quizMeta ? (
              <div className="mt-6 rounded border border-border bg-card p-4">
                <h3 className="font-medium">{quizMeta.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  ทดสอบความเข้าใจหลังจบบทเรียน
                </p>
                <Link
                  href={`/learn/${courseSlug}/quiz/${quizMeta.id}`}
                  className="mt-3 inline-block rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                >
                  ทำแบบทดสอบ →
                </Link>
              </div>
            ) : null}

            {lessonData.bodyMd ? (
              <article className="prose prose-sm mt-6 max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap rounded bg-muted p-4 text-xs">
                  {lessonData.bodyMd}
                </pre>
              </article>
            ) : null}
          </div>
        </main>
      </div>
    </LearnShell>
  );
}
