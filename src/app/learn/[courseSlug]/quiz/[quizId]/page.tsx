import { notFound } from "next/navigation";
import { Lock, X } from "@phosphor-icons/react/dist/ssr";
import { getQuizById } from "@/server/repos/quiz";
import { getSession } from "@/server/auth-session";
import { QuizForm } from "@/components/learn/quiz-form";
import { getLearnCourse } from "@/server/repos/learn";
import { LearnShell } from "@/components/learn/learn-shell";

export const dynamic = "force-dynamic";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ courseSlug: string; quizId: string }>;
}) {
  const { courseSlug, quizId } = await params;
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  const [courseData, quizData] = await Promise.all([
    getLearnCourse(courseSlug, userId),
    getQuizById(quizId),
  ]);

  if (!courseData || !quizData) notFound();

  if (!courseData.isEnrolled) {
    return (
      <LearnShell user={session?.user ?? null}>
        <section className="mx-auto max-w-md px-6 py-24 text-center">
          <Lock size={56} weight="light" className="mx-auto text-foreground-subtle" />
          <h1 className="mt-4 text-h1">ต้องลงทะเบียนก่อน</h1>
          <p className="mt-2 text-bodylg text-(--foreground-muted)">
            กรุณาลงทะเบียนคอร์สนี้เพื่อทำแบบทดสอบ
          </p>
        </section>
      </LearnShell>
    );
  }

  return (
    <LearnShell user={session?.user ?? null}>
      <div className="flex h-[100dvh] flex-col bg-(--background)">
        {/* Quiz header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-(--border) bg-(--background) px-4 lg:px-6">
          <a
            href={`/learn/${courseSlug}`}
            className="inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1.5 text-uism text-(--foreground) transition-colors hover:bg-(--surface-muted)"
          >
            <X size={16} />
            ออกจากแบบทดสอบ
          </a>
          <div className="text-caption text-(--foreground-muted) flex items-center gap-1.5">
            <span className="num">{quizData.questions.length}</span> ข้อ · ผ่าน{" "}
            <span className="num">{quizData.passScorePct}%</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[720px] flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
          {/* Breadcrumb + title */}
          <div className="mb-5">
            <div className="text-caption text-(--foreground-muted) mb-1.5 flex items-center gap-1.5">
              <span className="text-(--primary)">{courseData.course.title}</span>
              <span>/</span>
              <span>บทที่ {quizData.lessonId.slice(0, 4)}</span>
            </div>
            <h1 className="text-h2 mb-1.5">{quizData.title}</h1>
            <p className="text-caption text-(--foreground-muted)">
              <span className="num">{quizData.questions.length}</span> ข้อ · ผ่าน{" "}
              <span className="num">{quizData.passScorePct}%</span> · ทำได้ไม่จำกัด
            </p>
          </div>

          <QuizForm quiz={quizData} courseSlug={courseSlug} />
        </main>
      </div>
    </LearnShell>
  );
}
