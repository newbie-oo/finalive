"use client";

import { useEffect, useState } from "react";
import { Spinner, CheckCircle, WarningCircle } from "@phosphor-icons/react";

interface EncodingStatusProps {
  videoId: string;
  onReady?: () => void;
}

type Status = "created" | "queued" | "processing" | "finished" | "error" | "uploading" | "failed" | "unknown";

const STATUS_LABEL: Record<Status, string> = {
  created: "สร้างวิดีโอแล้ว",
  queued: "รอคิวเข้ารหัส",
  processing: "กำลังเข้ารหัส…",
  finished: "พร้อมเล่น",
  error: "ผิดพลาด",
  uploading: "กำลังอัปโหลด…",
  failed: "ล้มเหลว",
  unknown: "ไม่ทราบสถานะ",
};

const STATUS_COLOR: Record<Status, string> = {
  created: "var(--foreground-muted)",
  queued: "var(--warning)",
  processing: "var(--primary)",
  finished: "var(--success)",
  error: "var(--destructive)",
  uploading: "var(--primary)",
  failed: "var(--destructive)",
  unknown: "var(--foreground-muted)",
};

export function EncodingStatus({ videoId, onReady }: EncodingStatusProps) {
  const [status, setStatus] = useState<Status>("uploading");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/video-status?videoId=${encodeURIComponent(videoId)}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? `HTTP ${res.status}`);
          return;
        }
        const data = (await res.json()) as {
          status: Status;
          isReady: boolean;
        };
        if (cancelled) return;
        setStatus(data.status);
        setIsReady(data.isReady);
        if (data.isReady) {
          onReady?.();
          return;
        }
        if (data.status === "error" || data.status === "failed") {
          return;
        }
        // Poll every 5 seconds
        timeoutId = setTimeout(poll, 5000);
      } catch {
        if (cancelled) return;
        timeoutId = setTimeout(poll, 10000);
      }
    };

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [videoId, onReady]);

  if (error) {
    return (
      <div className="flex items-center gap-2 text-uism text-destructive">
        <WarningCircle size={16} weight="bold" />
        {error}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 text-uism">
      {isReady ? (
        <CheckCircle size={16} weight="bold" className="text-success" />
      ) : (
        <Spinner size={16} className="animate-spin text-primary" />
      )}
      <span style={{ color: STATUS_COLOR[status] }}>
        {STATUS_LABEL[status]}
      </span>
      {!isReady && status !== "error" && status !== "failed" && (
        <span className="text-caption text-(--foreground-muted)">(รีเฟรชอัตโนมัติ)</span>
      )}
    </div>
  );
}
