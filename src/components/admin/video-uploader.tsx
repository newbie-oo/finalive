"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VideoUploaderProps {
  courseId: string;
  lessonId: string;
  onUploadComplete?: () => void;
}

/**
 * Direct upload to /api/admin/lesson-video. Cap progress at 99% until the
 * server confirms a 2xx — `xhr.upload.onprogress` only sees bytes-out, not
 * the Bunny PUT + DB writes finishing on the server (DESIGN.md §5.13).
 */
export function VideoUploader({ courseId, lessonId, onUploadComplete }: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setUploading(false);
    setProgress(0);
    setProcessing(false);
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("video/")) {
        toast.error("กรุณาเลือกไฟล์วิดีโอ");
        return;
      }

      setError(null);
      setUploading(true);
      setProgress(0);
      setProcessing(false);

      // Stream the raw bytes (no multipart wrapping) so Next 16's FormData
      // limit isn't in the path. courseId/lessonId go on the URL, the
      // filename on a header — server forwards body straight to Bunny.
      const url = `/api/admin/lesson-video?courseId=${encodeURIComponent(
        courseId,
      )}&lessonId=${encodeURIComponent(lessonId)}`;
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("content-type", file.type || "video/mp4");
      xhr.setRequestHeader("x-file-name", file.name);
      xhr.upload.onprogress = (ev) => {
        if (!ev.lengthComputable) return;
        const pct = Math.round((ev.loaded / ev.total) * 100);
        // Cap at 99 until the server confirms the response — the last 1%
        // is "Bunny PUT + DB writes finishing", which onProgress can't see.
        setProgress(Math.min(pct, 99));
      };
      xhr.upload.onload = () => {
        // Bytes left our browser; the server is now busy with Bunny.
        setProcessing(true);
      };
      xhr.onerror = () => {
        reset();
        const msg = "เครือข่ายขัดข้อง — ลองใหม่";
        setError(msg);
        toast.error(msg);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress(100);
          setUploading(false);
          setProcessing(false);
          setError(null);
          toast.success("อัปโหลดเสร็จแล้ว วิดีโอกำลังเข้ารหัสที่ Bunny (1–5 นาที)");
          onUploadComplete?.();
          return;
        }
        let msg = `อัปโหลดไม่สำเร็จ (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText) as { message?: string };
          if (body?.message) msg = body.message;
        } catch {
          // body wasn't JSON
        }
        reset();
        setError(msg);
        toast.error(msg);
      };
      xhr.send(file);
    },
    [courseId, lessonId, onUploadComplete],
  );

  const buttonLabel = uploading
    ? processing
      ? "กำลังประมวลผลที่ Bunny…"
      : "กำลังอัปโหลด…"
    : error
      ? "ลองใหม่"
      : "+ เลือกไฟล์วิดีโอ";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="cursor-pointer">
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <Button size="sm" variant="outline" asChild>
            <span>{buttonLabel}</span>
          </Button>
        </label>
        {uploading && !processing && (
          <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
        )}
        {processing && (
          <span className="text-xs text-muted-foreground">กำลังส่งไป Bunny…</span>
        )}
      </div>

      {uploading && (
        <div
          className="h-2 w-full overflow-hidden rounded bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}
    </div>
  );
}
