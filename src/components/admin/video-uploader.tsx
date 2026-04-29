"use client";

import { useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { EncodingStatus } from "./encoding-status";

interface VideoUploaderProps {
  courseId: string;
  lessonId: string;
  onUploadComplete?: () => void;
}

type UploadPhase =
  | "idle"
  | "creating"
  | "uploading"
  | "processing"
  | "done"
  | "error";

export function VideoUploader({ courseId, lessonId, onUploadComplete }: VideoUploaderProps) {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bunnyVideoId, setBunnyVideoId] = useState<string | null>(null);

  // Keep refs for cancel so we can abort an in-flight upload.
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const currentFileRef = useRef<File | null>(null);
  const currentConfigRef = useRef<{
    bunnyVideoId: string;
    uploadUrl: string;
    apiKey: string;
  } | null>(null);

  const reset = () => {
    setPhase("idle");
    setProgress(0);
    setErrorMsg(null);
    setBunnyVideoId(null);
    currentFileRef.current = null;
    currentConfigRef.current = null;
  };

  const callCancel = useCallback(
    async (videoId: string) => {
      try {
        await fetch("/api/admin/lesson-video", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "cancel",
            courseId,
            lessonId,
            bunnyVideoId: videoId,
          }),
        });
      } catch {
        // best-effort cleanup
      }
    },
    [courseId, lessonId],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("video/")) {
        toast.error("กรุณาเลือกไฟล์วิดีโอ");
        return;
      }

      reset();
      currentFileRef.current = file;
      setPhase("creating");

      // Step 1: Ask server to create Bunny video + DB records.
      let config: { bunnyVideoId: string; uploadUrl: string; apiKey: string };
      try {
        const res = await fetch("/api/admin/lesson-video", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "create",
            courseId,
            lessonId,
            fileName: file.name,
          }),
        });
        const body = (await res.json()) as {
          ok?: boolean;
          bunnyVideoId?: string;
          uploadUrl?: string;
          apiKey?: string;
          message?: string;
        };
        if (!res.ok || !body.ok || !body.bunnyVideoId || !body.uploadUrl || !body.apiKey) {
          throw new Error(body.message || `สร้างวิดีโอล้มเหลว (${res.status})`);
        }
        config = {
          bunnyVideoId: body.bunnyVideoId,
          uploadUrl: body.uploadUrl,
          apiKey: body.apiKey,
        };
        currentConfigRef.current = config;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "สร้างวิดีโอล้มเหลว";
        setPhase("error");
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }

      // Step 2: Upload raw bytes directly to Bunny.
      setPhase("uploading");
      setProgress(0);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("PUT", config.uploadUrl);
      xhr.setRequestHeader("AccessKey", config.apiKey);
      xhr.setRequestHeader("content-type", "application/octet-stream");

      xhr.upload.onprogress = (ev) => {
        if (!ev.lengthComputable) return;
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setProgress(Math.min(pct, 99));
      };
      xhr.upload.onload = () => {
        setPhase("processing");
      };

      xhr.onerror = () => {
        void callCancel(config.bunnyVideoId);
        xhrRef.current = null;
        setPhase("error");
        const msg = "เครือข่ายขัดข้องระหว่างอัปโหลดไป Bunny — ลองใหม่";
        setErrorMsg(msg);
        toast.error(msg);
      };

      xhr.onabort = () => {
        void callCancel(config.bunnyVideoId);
        xhrRef.current = null;
        setPhase("idle");
      };

      xhr.onload = () => {
        xhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress(100);
          setPhase("done");
          setErrorMsg(null);
          setBunnyVideoId(config.bunnyVideoId);
          toast.success("อัปโหลดเสร็จแล้ว วิดีโอกำลังเข้ารหัสที่ Bunny (1–5 นาที)");
          onUploadComplete?.();
          return;
        }
        // Bunny rejected the upload (e.g. CORS, auth, size mismatch).
        void callCancel(config.bunnyVideoId);
        let msg = `อัปโหลดไป Bunny ไม่สำเร็จ (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText) as { message?: string };
          if (body?.message) msg = body.message;
        } catch {
          // ignore
        }
        setPhase("error");
        setErrorMsg(msg);
        toast.error(msg);
      };

      xhr.send(file);
    },
    [courseId, lessonId, onUploadComplete, callCancel],
  );

  const handleCancelClick = useCallback(() => {
    const xhr = xhrRef.current;
    const cfg = currentConfigRef.current;
    if (xhr) {
      xhr.abort();
    }
    if (cfg) {
      void callCancel(cfg.bunnyVideoId);
    }
    reset();
  }, [callCancel]);

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
            disabled={phase === "creating" || phase === "uploading" || phase === "processing"}
          />
          <Button size="sm" variant="outline" asChild>
            <span>{buttonLabel}</span>
          </Button>
        </label>

        {(phase === "uploading" || phase === "processing") && (
          <button
            type="button"
            onClick={handleCancelClick}
            className="text-xs text-destructive hover:underline"
          >
            ยกเลิก
          </button>
        )}

        {phase === "uploading" && (
          <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
        )}
        {phase === "processing" && (
          <span className="text-xs text-muted-foreground">กำลังประมวลผล…</span>
        )}
      </div>

      {(phase === "uploading" || phase === "processing") && (
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

      {bunnyVideoId && phase === "done" && (
        <EncodingStatus
          videoId={bunnyVideoId}
          onReady={() => {
            toast.success("วิดีโอพร้อมเล่นแล้ว");
            onUploadComplete?.();
          }}
        />
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errorMsg}
        </div>
      )}
    </div>
  );
}
