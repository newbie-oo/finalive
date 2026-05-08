"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner, CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";

interface EncodingStatusProps {
  videoId: string;
  onReady?: () => void;
}

type Status =
  | "created"
  | "uploaded"
  | "processing"
  | "transcoding"
  | "finished"
  | "error"
  | "upload_failed"
  | "jit_segmenting"
  | "unknown";

const STATUS_LABEL: Record<Status, string> = {
  created: "สร้างวิดีโอแล้ว",
  uploaded: "ได้รับไฟล์แล้ว",
  processing: "กำลังประมวลผล…",
  transcoding: "กำลังเข้ารหัส…",
  finished: "พร้อมเล่น",
  error: "ผิดพลาด",
  upload_failed: "อัปโหลดล้มเหลว",
  jit_segmenting: "กำลังแบ่งส่วน…",
  unknown: "ไม่ทราบสถานะ",
};

const STATUS_COLOR: Record<Status, string> = {
  created: "var(--foreground-muted)",
  uploaded: "var(--primary)",
  processing: "var(--primary)",
  transcoding: "var(--primary)",
  finished: "var(--success)",
  error: "var(--destructive)",
  upload_failed: "var(--destructive)",
  jit_segmenting: "var(--primary)",
  unknown: "var(--foreground-muted)",
};

export function EncodingStatus({ videoId, onReady }: EncodingStatusProps) {
  const [status, setStatus] = useState<Status>("processing");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent onReady from firing more than once per video, even if the
  // parent re-renders with a new callback reference.
  const calledRef = useRef(false);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!videoId) return;
    calledRef.current = false;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/admin/video-status?videoId=${encodeURIComponent(videoId)}`,
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
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
        if (data.isReady && !calledRef.current) {
          calledRef.current = true;
          onReadyRef.current?.();
          return;
        }
        if (data.status === "error" || data.status === "upload_failed") {
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
  }, [videoId]);

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
      {!isReady && status !== "error" && status !== "upload_failed" && (
        <span className="text-caption text-muted-foreground">
          (รีเฟรชอัตโนมัติ)
        </span>
      )}
    </div>
  );
}
