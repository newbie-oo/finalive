"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

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
  const router = useRouter();
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
          markComplete: true,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setCompleted(true);
      toast.success("จบบทเรียนแล้ว");
      router.refresh();
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        onClick={handleMarkComplete}
        disabled={completed}
        variant={completed ? "secondary" : "primary"}
        size="md"
      >
        {completed ? (
          <>
            <CheckCircle size={16} weight="fill" /> จบบทเรียนแล้ว
          </>
        ) : (
          "ทำเครื่องหมายว่าจบแล้ว"
        )}
      </Button>
      {completed && nextLessonId && (
        <Button asChild variant="ghost" size="md">
          <Link href={`/learn/${courseSlug}/${nextLessonId}`}>
            บทถัดไป <ArrowRight size={14} weight="bold" />
          </Link>
        </Button>
      )}
    </div>
  );
}
