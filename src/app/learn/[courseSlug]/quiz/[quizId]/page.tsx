import { notFound } from "next/navigation";
import { Lock } from "@phosphor-icons/react/dist/ssr";
import { getQuizById } from "@/server/repos/quiz";
import { getSession } from "@/server/auth-session";
import { QuizForm } from "@/components/learn/quiz-form";
import { getLearnCourse } from "@/server/repos/learn";
import { LearnShell } from "@/components/learn/learn-shell";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";

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
      <section className="mx-auto max-w-[720px] px-6 py-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-h1">{quizData.title}</h1>
            <p className="mt-1 text-uism text-(--foreground-muted)">
              ผ่านเกณฑ์ <span className="num font-semibold text-(--foreground)">{quizData.passScorePct}%</span>
            </p>
          </div>
          <StatusChip tone="primary">{quizData.questions.length} ข้อ</StatusChip>
        </header>
        <Card>
          <QuizForm quiz={quizData} />
        </Card>
      </section>
    </LearnShell>
  );
}
