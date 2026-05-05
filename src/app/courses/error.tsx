"use client";

export default function CoursesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <h2 className="text-lg font-semibold">เกิดข้อผิดพลาด</h2>
      <p className="text-sm text-muted-foreground">
        {error.message || "ไม่สามารถโหลดรายการคอร์สได้"}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        ลองใหม่
      </button>
    </div>
  );
}
