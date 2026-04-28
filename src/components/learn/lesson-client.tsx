"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface LessonClientProps {
  lessonId: string;
  courseSlug: string;
  nextLessonId: string | null;
  durationSeconds: number | null;
}

export function LessonClient({
  lessonId,
  courseSlug,
  nextLessonId,
  durationSeconds,
}: LessonClientProps) {
  const [started, setStarted] = useState(false);
  const [watched, setWatched] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Call /api/learn/start once on mount.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/learn/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lessonId }),
    })
      .then((res) => {
        if (!cancelled && res.ok) setStarted(true);
      })
      .catch(() => {
        // Network error — lesson start will retry on next visit.
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  // Throttled progress post (15s interval).
  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      setWatched((prev) => {
        const next = prev + 15;
        fetch("/api/learn/progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lessonId, watchedSeconds: next }),
        }).catch(() => {});
        return next;
      });
    }, 15_000);
    return () => clearInterval(id);
  }, [started, lessonId]);

  const handleMarkComplete = async () => {
    try {
      const res = await fetch("/api/learn/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lessonId,
          watchedSeconds: durationSeconds ?? watched,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setCompleted(true);
      toast.success("จบบทเรียนแล้ว");
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button
        onClick={handleMarkComplete}
        disabled={completed}
        className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
      >
        {completed ? "จบบทเรียนแล้ว" : "ทำเครื่องหมายว่าจบแล้ว"}
      </button>
      {completed && nextLessonId ? (
        <Link
          href={`/learn/${courseSlug}/${nextLessonId}`}
          className="text-sm text-primary hover:underline"
        >
          บทถัดไป →
        </Link>
      ) : null}
    </div>
  );
}
