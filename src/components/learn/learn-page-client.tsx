"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VidstackPlayer } from "@/components/course/vidstack-player";
import { CurriculumSidebar } from "./curriculum-sidebar";
import { LearnTopbar } from "./learn-topbar";
import { MobileCurriculumDrawer } from "./mobile-curriculum-drawer";
import { LessonClient } from "./lesson-client";
import { CourseCompleteModal } from "./course-complete-modal";
import { MarkdownView } from "@/lib/markdown";
import type { SidebarModule } from "./curriculum-sidebar";

interface LearnPageClientProps {
  courseSlug: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  lessonBodyMd: string | null;
  bunnyVideoId: string | null;
  durationSeconds: number | null;
  nextLessonId: string | null;
  prevLessonId: string | null;
  quizId: string | null;
  modules: SidebarModule[];
  progress: Array<{ lessonId: string; status: string }>;
  /** Plain object so the prop is server-component-serialisable. */
  passedQuizIds?: Record<string, boolean>;
  isEnrolled: boolean;
  isAdmin?: boolean;
  totalLessons: number;
  doneLessons: number;
  watchedSeconds: number;
  hlsUrl: string | null;
}

export function LearnPageClient({
  courseSlug,
  courseTitle,
  lessonId,
  lessonTitle,
  moduleTitle,
  lessonBodyMd,
  bunnyVideoId,
  durationSeconds,
  nextLessonId,
  prevLessonId,
  quizId,
  modules,
  progress,
  passedQuizIds,
  isEnrolled,
  isAdmin = false,
  totalLessons,
  doneLessons,
  watchedSeconds,
  hlsUrl,
}: LearnPageClientProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const passedQuizMap = useMemo(
    () =>
      passedQuizIds
        ? new Map(Object.entries(passedQuizIds))
        : new Map<string, boolean>(),
    [passedQuizIds],
  );

  // Listen for video completion event from VidstackPlayer
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.lessonId === lessonId) {
        router.refresh();
      }
    };
    window.addEventListener("lesson-completed", handler);
    return () => window.removeEventListener("lesson-completed", handler);
  }, [router, lessonId]);

  return (
    <div className="flex h-[100dvh] flex-col bg-(--background)">
      <LearnTopbar
        courseTitle={courseTitle}
        moduleTitle={moduleTitle}
        lessonTitle={lessonTitle}
        totalLessons={totalLessons}
        doneLessons={doneLessons}
        onToggleSidebar={() => {
          if (window.innerWidth < 1024) {
            setMobileDrawerOpen((v) => !v);
          } else {
            setSidebarOpen((v) => !v);
          }
        }}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex flex-1 min-h-0">
        {/* Main content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {/* Player */}
          <div className="bg-black flex justify-center lg:p-4">
            <div className="w-full max-w-[1100px]">
              {hlsUrl ? (
                <VidstackPlayer
                  src={hlsUrl}
                  title={lessonTitle}
                  currentTime={watchedSeconds}
                  lessonId={lessonId}
                  nextLessonId={nextLessonId}
                  quizId={quizId}
                  courseSlug={courseSlug}
                  suppressProgress={isAdmin}
                />
              ) : (
                <div
                  role="status"
                  className="flex aspect-video w-full items-center justify-center bg-(--surface-muted) text-body text-(--foreground-muted)"
                >
                  ยังไม่มีวิดีโอสำหรับบทเรียนนี้ — กรุณาอ่านเนื้อหาด้านล่าง
                </div>
              )}
            </div>
          </div>

          {/* Mobile progress strip */}
          <div className="flex items-center gap-3 border-b border-(--border) px-4 py-3 lg:hidden">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--surface-muted)">
              <div
                className="h-full rounded-full bg-(--primary)"
                style={{ width: `${totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0}%` }}
              />
            </div>
            <span className="num text-caption font-semibold text-(--primary)">
              {totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0}%
            </span>
          </div>

          {/* Tabs + body */}
          <div className="px-4 py-5 pb-8 lg:px-8 lg:py-8 lg:pb-12 max-w-[720px] mx-auto">
            {/* Tabs */}
            <div className="flex gap-6 border-b border-(--border) mb-6">
              <button className="border-b-2 border-(--primary) px-0 py-3 text-ui font-medium text-(--primary)">
                เนื้อหา
              </button>
              {quizId && (
                <Link
                  href={`/learn/${courseSlug}/quiz/${quizId}`}
                  className="px-0 py-3 text-ui font-medium text-(--foreground-muted) hover:text-(--foreground)"
                >
                  แบบทดสอบ
                </Link>
              )}
            </div>

            {/* Lesson body */}
            <article>
              <h1 className="text-h2" style={{ margin: "0 0 8px" }}>{lessonTitle}</h1>
              <div className="flex flex-wrap items-center gap-3 mb-6 text-(--foreground-muted)">
                <span className="text-caption flex items-center gap-1">
                  <span className="num">
                    {durationSeconds
                      ? `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, "0")}`
                      : "—"}
                  </span>{" "}
                  นาที
                </span>
                <span style={{ color: "var(--border-strong)" }}>·</span>
                <span className="text-caption">{moduleTitle}</span>
              </div>

              {lessonBodyMd && (
                <div className="prose-style">
                  <MarkdownView text={lessonBodyMd} />
                </div>
              )}
            </article>

            <LessonClient
              lessonId={lessonId}
              courseSlug={courseSlug}
              nextLessonId={nextLessonId}
              quizId={quizId}
              durationSeconds={durationSeconds}
              isAdmin={isAdmin}
            />
          </div>
        </main>

        {/* Curriculum sidebar (desktop) */}
        {sidebarOpen && (
          <aside className="hidden lg:block w-[320px] shrink-0 border-l border-(--border) overflow-hidden">
            <CurriculumSidebar
              courseSlug={courseSlug}
              modules={modules}
              progress={progress}
              passedQuizIds={passedQuizMap}
              isEnrolled={isEnrolled}
              isAdmin={isAdmin}
              totalLessons={totalLessons}
            />
          </aside>
        )}
      </div>

      {/* Mobile drawer */}
      <MobileCurriculumDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        courseSlug={courseSlug}
        modules={modules}
        progress={progress}
        passedQuizIds={passedQuizMap}
        isEnrolled={isEnrolled}
        isAdmin={isAdmin}
      />

      {/* Course-complete celebration: fires once per course (localStorage),
          positioned as a centred modal — not on top of the video. Hidden
          for admin previews; admins never enroll. */}
      {!isAdmin && (
        <CourseCompleteModal
          courseSlug={courseSlug}
          totalLessons={totalLessons}
          doneLessons={doneLessons}
        />
      )}
    </div>
  );
}
