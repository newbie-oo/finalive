import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft, LockSimple } from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layouts/public-shell";
import { VidstackPlayer } from "@/components/course/vidstack-player";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
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
      <section className="mx-auto max-w-[960px] px-6 py-8">
        <Link
          href={`/courses/${lesson.courseSlug}`}
          className="inline-flex items-center gap-1 text-uism text-(--foreground-muted) hover:text-(--foreground)"
        >
          <CaretLeft size={14} /> {lesson.courseTitle}
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="text-h1">{lesson.title}</h1>
          <StatusChip tone="info">ตัวอย่างฟรี</StatusChip>
        </div>

        <div className="mt-6 overflow-hidden rounded-card border border-(--border)">
          {lesson.bunnyVideoId ? (
            <VidstackPlayer src={buildHlsUrl({ videoId: lesson.bunnyVideoId })} title={lesson.title} />
          ) : (
            <div
              role="status"
              className="flex aspect-video w-full items-center justify-center bg-(--surface-muted) text-body text-(--foreground-muted)"
            >
              ตัวอย่างนี้ยังไม่มีวิดีโอ — กรุณาอ่านเนื้อหาด้านล่าง
            </div>
          )}
        </div>

        {lesson.bodyMd && (
          <div className="mt-8">
            <MarkdownView text={lesson.bodyMd} />
          </div>
        )}

        <div className="mt-10 flex items-center justify-between gap-4 rounded-card border border-(--border) bg-(--surface-muted) p-5">
          <div className="flex items-center gap-3">
            <LockSimple size={20} weight="bold" className="text-(--primary)" />
            <p className="text-body text-(--foreground)">
              บทเรียนถัดไปถูกล็อก — ลงทะเบียนเพื่อปลดล็อกคอร์สเต็ม
            </p>
          </div>
          <Button asChild variant="accent" size="lg">
            <Link href={`/courses/${lesson.courseSlug}`}>ลงทะเบียน</Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}
