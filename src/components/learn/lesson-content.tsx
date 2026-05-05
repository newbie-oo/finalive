"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { VidstackPlayer } from "@/components/course/vidstack-player";
import { LearnTopbar } from "./learn-topbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "@phosphor-icons/react";
import { useLearnShell } from "./learn-shell-context";
import { LessonPlayerLayout } from "./lesson-player-layout";

interface LessonContentProps {
  courseSlug: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  lessonBodyMd: string | null;
  durationSeconds: number | null;
  nextLessonId: string | null;
  prevLessonId: string | null;
  quizId: string | null;
  totalLessons: number;
  doneLessons: number;
  watchedSeconds: number;
  hlsUrl: string | null;
  isAdmin?: boolean;
}

export function LessonContent({
  courseSlug,
  courseTitle,
  lessonId,
  lessonTitle,
  moduleTitle,
  lessonBodyMd,
  durationSeconds,
  nextLessonId,
  prevLessonId: _prevLessonId,
  quizId,
  totalLessons,
  doneLessons,
  watchedSeconds,
  hlsUrl,
  isAdmin = false,
}: LessonContentProps) {
  const router = useRouter();
  const { sidebarOpen, toggleSidebar, toggleMobileDrawer } = useLearnShell();

  // Autoplay-next countdown state
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(10);
  const countdownCancelledRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Start countdown when video ends (if no quiz and next lesson exists)
  const handleVideoEnded = useCallback(() => {
    if (quizId || !nextLessonId) return;
    if (countdownCancelledRef.current) return;
    setShowCountdown(true);
    setCountdownValue(10);

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    let remaining = 10;
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdownValue(remaining);
      if (remaining <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        router.push(`/learn/${courseSlug}/${nextLessonId}`);
      }
    }, 1000);
  }, [quizId, nextLessonId, courseSlug, router]);

  const cancelCountdown = useCallback(() => {
    countdownCancelledRef.current = true;
    setShowCountdown(false);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const handleToggleSidebar = useCallback(() => {
    if (window.innerWidth < 1024) {
      toggleMobileDrawer();
    } else {
      toggleSidebar();
    }
  }, [toggleSidebar, toggleMobileDrawer]);

  return (
    <>
      <LearnTopbar
        courseTitle={courseTitle}
        moduleTitle={moduleTitle}
        lessonTitle={lessonTitle}
        totalLessons={totalLessons}
        doneLessons={doneLessons}
        onToggleSidebar={handleToggleSidebar}
        sidebarOpen={sidebarOpen}
      />

      <main className="flex-1 overflow-y-auto min-w-0">
        <LessonPlayerLayout
          lessonId={lessonId}
          lessonTitle={lessonTitle}
          moduleTitle={moduleTitle}
          lessonBodyMd={lessonBodyMd}
          durationSeconds={durationSeconds}
          totalLessons={totalLessons}
          doneLessons={doneLessons}
          courseSlug={courseSlug}
          nextLessonId={nextLessonId}
          quizId={quizId}
          prevLessonId={_prevLessonId}
          isAdmin={isAdmin}
          playerSlot={
            hlsUrl ? (
              <div className="relative bg-black flex justify-center lg:p-4">
                <div className="w-full">
                  <VidstackPlayer
                    src={hlsUrl}
                    title={lessonTitle}
                    currentTime={watchedSeconds}
                    lessonId={lessonId}
                    nextLessonId={nextLessonId}
                    quizId={quizId}
                    courseSlug={courseSlug}
                    suppressProgress={isAdmin}
                    onVideoEnded={handleVideoEnded}
                  />
                </div>

                {/* Autoplay-next countdown overlay */}
                {showCountdown && (
                  <div
                    data-testid="autoplay-countdown"
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
                  >
                    <p className="text-h3 text-white">
                      บทถัดไปใน {countdownValue}...
                    </p>
                    <div className="mt-4 flex gap-3">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() =>
                          router.push(`/learn/${courseSlug}/${nextLessonId}`)
                        }
                      >
                        ไปเลย <ArrowRight size={14} weight="bold" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={cancelCountdown}
                      >
                        <X size={14} weight="bold" /> ยกเลิก
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                role="status"
                className="mx-4 mt-4 flex items-center gap-2 rounded-md border border-(--border) bg-(--surface-muted) px-4 py-3 text-uism text-(--foreground-muted) lg:mx-8 lg:mt-6"
              >
                <span aria-hidden="true">📖</span>
                บทเรียนนี้ไม่มีวิดีโอ — อ่านเนื้อหาด้านล่าง
              </div>
            )
          }
        />
      </main>
    </>
  );
}
