import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/layouts/public-shell";
import { VidstackPlayer } from "@/components/course/vidstack-player";
import { buildHlsUrl } from "@/server/services/bunny";
import { getPreviewLesson } from "@/server/repos/course";
import { MarkdownView } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export default async function PreviewLessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const lesson = await getPreviewLesson(slug, lessonId);
  if (!lesson || !lesson.isPlayable) notFound();

  return (
    <PublicShell>
      <section className="mx-auto max-w-4xl p-4 sm:p-8">
        <p className="text-xs text-muted-foreground">
          <Link href={`/courses/${lesson.courseSlug}`} className="hover:underline">
            ← {lesson.courseTitle}
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{lesson.title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">ตัวอย่างฟรี — ไม่ต้องลงทะเบียน</p>

        <div className="mt-4">
          {lesson.bunnyVideoId ? (
            <VidstackPlayer src={buildHlsUrl({ videoId: lesson.bunnyVideoId })} title={lesson.title} />
          ) : (
            <div
              role="status"
              className="flex aspect-video w-full items-center justify-center rounded border border-dashed border-border bg-muted text-sm text-muted-foreground"
            >
              ตัวอย่างนี้ยังไม่มีวิดีโอ — กรุณาอ่านเนื้อหาด้านล่าง
            </div>
          )}
        </div>

        {lesson.bodyMd ? (
          <div className="mt-6">
            <MarkdownView text={lesson.bodyMd} />
          </div>
        ) : null}
      </section>
    </PublicShell>
  );
}
