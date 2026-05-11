"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { EncodingStatus } from "./encoding-status";
import { useVideoUpload } from "@/hooks/use-video-upload";

interface VideoUploaderProps {
  courseId: string;
  lessonId: string;
  onUploadComplete?: () => void;
}

export function VideoUploader({
  courseId,
  lessonId,
  onUploadComplete,
}: VideoUploaderProps) {
  const { phase, progress, error, bunnyVideoId, upload, cancel } =
    useVideoUpload({ courseId, lessonId, onUploadComplete });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void upload(file);
  };

  const buttonLabel =
    phase === "creating"
      ? "กำลังเตรียม…"
      : phase === "uploading"
        ? "กำลังอัปโหลด…"
        : phase === "processing"
          ? "กำลังส่งไป Bunny…"
          : phase === "error"
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
            disabled={
              phase === "creating" ||
              phase === "uploading" ||
              phase === "processing"
            }
          />
          <Button size="sm" variant="outline" asChild>
            <span>{buttonLabel}</span>
          </Button>
        </label>

        {(phase === "uploading" || phase === "processing") && (
          <button
            type="button"
            onClick={cancel}
            className="text-xs text-destructive hover:underline"
          >
            ยกเลิก
          </button>
        )}

        {phase === "uploading" && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {progress}%
          </span>
        )}
        {phase === "processing" && (
          <span className="text-xs text-muted-foreground">กำลังประมวลผล…</span>
        )}
      </div>

      {(phase === "uploading" || phase === "processing") && (
        <div
          className="h-2 w-full overflow-hidden rounded-sm bg-muted"
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

      {bunnyVideoId && phase === "done" && (
        <EncodingStatus
          videoId={bunnyVideoId}
          onReady={() => {
            toast.success("วิดีโอพร้อมเล่นแล้ว");
            onUploadComplete?.();
          }}
        />
      )}

      {error && (
        <div
          role="alert"
          className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}
    </div>
  );
}
