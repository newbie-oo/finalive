"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface SlipUploadFormProps {
  pendingId: string;
}

const MAX_SLIP_BYTES = 5 * 1024 * 1024;

/**
 * Slip upload UX:
 *  - The drop-zone is a `<label htmlFor>` so clicking it natively opens the
 *    file picker. The previous `<button>` wrapper trapped the synthetic
 *    click and the picker never opened.
 *  - Drag-and-drop also handled on the same label.
 *  - Amount field removed — the system already knows what amount the
 *    student owes (it's printed on the page above), so making the user
 *    re-type it is redundant. The server falls back to the pending's
 *    expected amount when the field isn't sent.
 */
export function SlipUploadForm({ pendingId }: SlipUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = useCallback((f: File | null) => {
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      toast.error("รองรับเฉพาะไฟล์รูปภาพ (PNG หรือ JPG)");
      return;
    }
    if (f.size > MAX_SLIP_BYTES) {
      toast.error("ไฟล์ใหญ่เกิน 5 MB");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0] ?? null;
      handleFile(f);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  return (
    <form
      action="/api/slip/upload"
      method="post"
      encType="multipart/form-data"
      onSubmit={() => setSubmitting(true)}
      className="space-y-4"
    >
      <input type="hidden" name="pendingId" value={pendingId} />

      <label
        htmlFor="slip-file"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`relative flex min-h-[280px] w-full cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed p-6 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--primary) ${
          dragOver
            ? "border-(--primary) bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
            : preview
              ? "border-(--border) bg-(--surface)"
              : "border-(--border) bg-(--surface-muted) hover:bg-(--surface-sunken)"
        }`}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="ตัวอย่างสลิปที่อัปโหลด"
              className="mx-auto max-h-64 rounded-md object-contain"
            />
          </>
        ) : (
          <div className="space-y-1.5">
            <p className="text-h4 text-(--foreground)">ลากไฟล์มาวาง หรือคลิกเลือก</p>
            <p className="text-uism text-(--foreground-muted)">PNG / JPG ขนาดไม่เกิน 5 MB</p>
          </div>
        )}
        <input
          id="slip-file"
          name="slip"
          type="file"
          accept="image/png,image/jpeg"
          required
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {file && (
        <div className="flex items-center justify-between rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-uism">
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => handleFile(null)}
            className="ml-2 text-(--foreground-muted) hover:text-destructive"
          >
            ลบ
          </button>
        </div>
      )}

      <Button type="submit" variant="accent" size="lg" disabled={!file || submitting} className="w-full">
        {submitting ? "กำลังส่ง…" : "ส่งสลิป"}
      </Button>
    </form>
  );
}
