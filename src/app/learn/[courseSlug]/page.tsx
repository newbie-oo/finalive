import { notFound, redirect } from "next/navigation";
import { getSession } from "@/server/auth-session";
import { getLearnCourse } from "@/server/repos/learn";

export const dynamic = "force-dynamic";

export default async function LearnCoursePage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const session = await getSession();
  const data = await getLearnCourse(courseSlug, session?.user?.id ?? null);
  if (!data) notFound();

  if (!data.resumeLessonId) {
    // No lessons available.
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">ยังไม่มีบทเรียนในคอร์สนี้</p>
      </div>
    );
  }

  redirect(`/learn/${courseSlug}/${data.resumeLessonId}`);
}
