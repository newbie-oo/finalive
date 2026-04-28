import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth-session";
import { getAdminQuizById } from "@/server/repos/admin-quiz";
import { canEditCourse } from "@/server/services/course-authz";
import { QuizBuilder } from "@/components/admin/quiz-builder";

export const dynamic = "force-dynamic";

export default async function AdminQuizEditPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const { id, quizId } = await params;

  const session = await getSession();
  if (!session?.user?.id) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">กรุณาเข้าสู่ระบบ</p>
      </div>
    );
  }

  const quiz = await getAdminQuizById(quizId);
  if (!quiz) notFound();

  const canEdit = await canEditCourse(session.user.id, session.user.role, quiz.courseId);
  if (!canEdit) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">ไม่มีสิทธิ์แก้ไขคอร์สนี้</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">แก้ไขแบบทดสอบ</h1>
          <p className="text-sm text-muted-foreground">{quiz.title}</p>
        </div>
        <Link
          href={`/admin/courses/${id}/curriculum`}
          className="text-sm text-primary hover:underline"
        >
          ← กลับไปเนื้อหา
        </Link>
      </div>

      <QuizBuilder quizId={quizId} initialQuestions={quiz.questions} />
    </div>
  );
}
