import { notFound } from "next/navigation";
import { getSession } from "@/server/auth-session";
import { getLearnCourse } from "@/server/repos/learn";
import { listLatestQuizPassByCourse } from "@/server/repos/quiz";
import { LearnShellProvider } from "@/components/learn/learn-shell-context";
import { LearnLayout } from "@/components/learn/learn-layout";

export const dynamic = "force-dynamic";

export default async function CourseLearnLayout({
  params,
  children,
}: {
  params: Promise<{ courseSlug: string }>;
  children: React.ReactNode;
}) {
  const { courseSlug } = await params;
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "admin";

  const courseData = await getLearnCourse(courseSlug, userId, {
    allowUnpublished: isAdmin,
  });
  if (!courseData) notFound();

  const totalLessons = courseData.modules.reduce(
    (acc, m) => acc + m.lessons.length,
    0,
  );
  const doneLessons = courseData.progress.filter(
    (p) => p.status === "completed",
  ).length;

  const passedQuizMap = userId
    ? await listLatestQuizPassByCourse(userId, courseData.course.id)
    : new Map<string, boolean>();
  const passedQuizIds = Object.fromEntries(passedQuizMap.entries());

  return (
    <LearnShellProvider>
      <LearnLayout
        courseSlug={courseSlug}
        modules={courseData.modules}
        progress={courseData.progress}
        passedQuizIds={passedQuizIds}
        isEnrolled={courseData.isEnrolled}
        isAdmin={isAdmin}
        totalLessons={totalLessons}
        doneLessons={doneLessons}
      >
        {children}
      </LearnLayout>
    </LearnShellProvider>
  );
}
