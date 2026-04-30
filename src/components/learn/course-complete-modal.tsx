"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Certificate, ArrowRight, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface CourseCompleteModalProps {
  courseSlug: string;
  /** Total lessons in the course. Modal only fires when reached. */
  totalLessons: number;
  doneLessons: number;
}

const STORAGE_PREFIX = "finalive:cert-shown:";

/**
 * One-shot celebratory dialog when the student first hits 100%. Persists
 * the "shown" flag in localStorage keyed on the course slug so re-visiting
 * an already-completed course doesn't keep popping the modal.
 */
export function CourseCompleteModal({
  courseSlug,
  totalLessons,
  doneLessons,
}: CourseCompleteModalProps) {
  const [open, setOpen] = useState(false);
  // useRef tracks "we already evaluated this mount"; avoids react-strict
  // double-invocation re-firing the modal during dev.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (totalLessons <= 0 || doneLessons < totalLessons) return;
    if (typeof window === "undefined") return;
    const key = `${STORAGE_PREFIX}${courseSlug}`;
    if (window.localStorage.getItem(key)) return;
    fired.current = true;
    setOpen(true);
    window.localStorage.setItem(key, String(Date.now()));
  }, [courseSlug, totalLessons, doneLessons]);

  // Close on Escape for accessibility.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-complete-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="ปิด"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-card border border-(--border) bg-(--surface) p-6 shadow-xl"
      >
        <button
          type="button"
          aria-label="ปิด"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-(--foreground-muted) hover:bg-(--surface-muted) hover:text-(--foreground)"
        >
          <X size={16} />
        </button>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
            <Certificate size={32} weight="fill" />
          </div>
          <h2 id="course-complete-title" className="text-h2">
            จบคอร์สแล้ว 🎉
          </h2>
          <p className="text-body text-(--foreground-muted)">
            ยินดีด้วย! คุณเรียนครบทุกบทเรียนแล้ว ใบประกาศพร้อมให้ดาวน์โหลดและส่งทางอีเมล
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => setOpen(false)}
          >
            ปิด
          </Button>
          <Button asChild variant="primary" size="md">
            <Link href="/account/certificates">
              ดูใบประกาศ <ArrowRight size={14} weight="bold" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
