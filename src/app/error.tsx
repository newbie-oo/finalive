"use client";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">เกิดข้อผิดพลาด</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "ไม่สามารถโหลดหน้าได้ กรุณาลองใหม่อีกครั้ง"}
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
