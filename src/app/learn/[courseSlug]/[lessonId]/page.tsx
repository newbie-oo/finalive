import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BunnyPlayer } from "@/components/course/bunny-player";
import { CurriculumSidebar } from "@/components/learn/curriculum-sidebar";
import { LearnShell } from "@/components/learn/learn-shell";
import { getSession } from "@/server/auth-session";
import { getLearnCourse, getLearnLesson } from "@/server/repos/learn";
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

  const [courseData, lessonData] = await Promise.all([
    getLearnCourse(courseSlug, userId),
    getLearnLesson(courseSlug, lessonId),
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
              <BunnyPlayer videoId={lessonData.bunnyVideoId} title={lessonData.title} />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded border border-dashed border-border bg-muted text-sm text-muted-foreground">
                วิดีโอจะถูกเชื่อมเมื่อ admin upload (สปรินต์ 8)
              </div>
            )}

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
