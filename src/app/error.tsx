"use client";

import { Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Warning size={64} weight="light" className="text-warning" />
      <div className="max-w-md">
        <h1 className="text-h1">เกิดข้อผิดพลาด</h1>
        <p className="mt-2 text-bodylg text-(--foreground-muted)">
          {error.message || "ไม่สามารถโหลดหน้าได้ กรุณาลองใหม่อีกครั้ง"}
        </p>
      </div>
      <Button onClick={reset} variant="primary" size="lg">
        ลองใหม่
      </Button>
    </main>
  );
}
