"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-lg">
        <ErrorState
          title="เกิดข้อผิดพลาด"
          body={error.message || "ไม่สามารถโหลดหน้าได้ กรุณาลองใหม่อีกครั้ง"}
          errorId={error.digest}
          onRetry={reset}
          homeHref="/"
        />
      </div>
    </main>
  );
}
