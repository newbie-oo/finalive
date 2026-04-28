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
          toast.error(`อัปโหลดไม่สำเร็จ: ${error.message}`);
        },
        onProgress(bytesUploaded, bytesTotal) {
          const pct = bytesTotal ? Math.round((bytesUploaded / bytesTotal) * 100) : 0;
          setProgress(pct);
        },
        onSuccess() {
          setUploading(false);
          setProcessing(true);
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
            <span>{uploading ? "กำลังอัปโหลด…" : "+ เลือกไฟล์วิดีโอ"}</span>
          </Button>
        </label>
        {uploading && <span className="text-xs text-muted-foreground">{progress}%</span>}
        {processing && <span className="text-xs text-muted-foreground">กำลังประมวลผล…</span>}
      </div>

      {uploading && (
        <div className="h-2 w-full overflow-hidden rounded bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
