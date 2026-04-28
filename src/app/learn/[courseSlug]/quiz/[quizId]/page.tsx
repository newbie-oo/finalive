import { notFound } from "next/navigation";
import { getQuizById } from "@/server/repos/quiz";
import { getSession } from "@/server/auth-session";
import { QuizForm } from "@/components/learn/quiz-form";
import { getLearnCourse } from "@/server/repos/learn";

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

  // Verify student is enrolled in the course.
  if (!courseData.isEnrolled) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-xl font-semibold">ต้องลงทะเบียนก่อน</h1>
        <p className="text-sm text-muted-foreground">
          กรุณาลงทะเบียนคอร์สนี้เพื่อทำแบบทดสอบ
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">{quizData.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ผ่านเกณฑ์ {quizData.passScorePct}%
      </p>
      <QuizForm quiz={quizData} />
    </div>
  );
}
