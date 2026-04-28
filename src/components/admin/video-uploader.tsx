"use client";

import { useState, useCallback } from "react";
import * as tus from "tus-js-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VideoUploaderProps {
  courseId: string;
  lessonId: string;
  onUploadComplete?: () => void;
}

export function VideoUploader({ courseId, lessonId, onUploadComplete }: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("video/")) {
        toast.error("กรุณาเลือกไฟล์วิดีโอ");
        return;
      }

      setUploading(true);
      setProgress(0);
      setProcessing(false);
      setError(null);

      const upload = new tus.Upload(file, {
        endpoint: `${window.location.origin}/api/upload/tus`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        metadata: {
          lessonId,
          courseId,
          filename: file.name,
          filetype: file.type,
        },
        onError(error) {
          setUploading(false);
          setProgress(0);
          setError(error.message);
          toast.error(`อัปโหลดไม่สำเร็จ: ${error.message}`);
        },
        onProgress(bytesUploaded, bytesTotal) {
          const pct = bytesTotal ? Math.round((bytesUploaded / bytesTotal) * 100) : 0;
          // Cap at 99% until onSuccess confirms backend processing started.
          setProgress(Math.min(pct, 99));
        },
        onSuccess() {
          setUploading(false);
          setProgress(100);
          setProcessing(true);
          setError(null);
          toast.success("อัปโหลดสำเร็จ กำลังประมวลผลวิดีโอ…");
          setTimeout(() => {
            onUploadComplete?.();
          }, 3000);
        },
      });

      upload.start();
    },
    [courseId, lessonId, onUploadComplete],
  );

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
            <span>{uploading ? "กำลังอัปโหลด…" : error ? "ลองใหม่" : "+ เลือกไฟล์วิดีโอ"}</span>
          </Button>
        </label>
        {uploading && (
          <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
        )}
        {processing && <span className="text-xs text-muted-foreground">กำลังประมวลผล…</span>}
        {error && <span className="text-xs text-destructive">ล้มเหลว</span>}
      </div>

      {uploading && (
        <div className="h-2 w-full overflow-hidden rounded bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
