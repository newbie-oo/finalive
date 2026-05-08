"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Question } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

interface LessonClientProps {
  lessonId: string;
  courseSlug: string;
  nextLessonId: string | null;
  /** Prefer the quiz CTA over "next lesson" so students take the quiz
   * before moving on. */
  quizId?: string | null;
  durationSeconds: number | null;
  /** When true, suppress all progress writes — admin previews must not
   * accrue completion, otherwise the certificate banner activates. */
  isAdmin?: boolean;
  /** Controlled completion state from parent. */
  completed: boolean;
}

export function LessonClient({
  lessonId,
  courseSlug,
  nextLessonId,
  quizId,
  isAdmin = false,
  completed,
}: LessonClientProps) {
  // Call /api/learn/start once on mount — skipped for admin previews.
  useEffect(() => {
    if (isAdmin) return;
    let cancelled = false;
    fetch("/api/learn/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lessonId }),
    })
      .then((res) => {
        if (!cancelled && !res.ok) {
          // Network error — lesson start will retry on next visit.
        }
      })
      .catch(() => {
        // Network error — lesson start will retry on next visit.
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId, isAdmin]);

  if (!completed) return null;

  return (
    <div className="space-y-4">
      {quizId && (
        <div
          className="rounded-card border border-accent/20 p-6 md:p-7"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, var(--surface)) 0%, var(--surface) 60%)",
          }}
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-button bg-accent/15 text-accent">
              <Question size={22} />
            </div>
            <div>
              <div className="text-h4 font-semibold text-foreground">
                เช็คความเข้าใจ
              </div>
              <div className="text-caption text-muted-foreground">
                พร้อมทำแบบทดสอบแล้ว
              </div>
            </div>
          </div>
          <Button asChild variant="primary" size="md">
            <Link href={`/learn/${courseSlug}/quiz/${quizId}`}>
              ทำแบบทดสอบ <ArrowRight size={14} weight="bold" />
            </Link>
          </Button>
        </div>
      )}
      {!quizId && nextLessonId && (
        <Button asChild variant="ghost" size="md">
          <Link href={`/learn/${courseSlug}/${nextLessonId}`}>
            บทถัดไป <ArrowRight size={14} weight="bold" />
          </Link>
        </Button>
      )}
    </div>
  );
}
