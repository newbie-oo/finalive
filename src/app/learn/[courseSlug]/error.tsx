"use client";

import { useEffect } from "react";

export default function LearnCourseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold">เกิดข้อผิดพลาด</h2>
      <p className="text-sm text-muted-foreground">
        ไม่สามารถโหลดข้อมูลคอร์สได้ กรุณาลองใหม่
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        ลองใหม่
      </button>
    </div>
  );
}
