"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { File, CheckCircle } from "@phosphor-icons/react";
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
    // Browser-reported MIME is loose; the server re-validates via magic
    // bytes (see src/lib/file-sniff.ts). This client-side check is just
    // for early UX feedback.
    const allowed = f.type.startsWith("image/") || f.type === "application/pdf";
    const looksHeic =
      /\.(heic|heif)$/i.test(f.name) || /heic|heif/i.test(f.type);
    if (!allowed && !looksHeic) {
      toast.error("รองรับเฉพาะ PNG, JPG, PDF, HEIC");
      return;
    }
    if (f.size > MAX_SLIP_BYTES) {
      toast.error("ไฟล์ใหญ่เกิน 5 MB");
      return;
    }
    setFile(f);
    // Only image files render an inline preview; PDFs and HEIC are listed
    // by name (HEIC won't decode in <img> on most browsers anyway).
    if (f.type.startsWith("image/") && !looksHeic) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
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
        className={`relative flex min-h-[280px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
          dragOver
            ? "border-primary bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
            : file
              ? "border-primary bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]"
              : "border-primary bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
        }`}
      >
        {file ? (
          <>
            <div className="flex w-full max-w-sm items-center gap-4 rounded-xl border border-border bg-background p-3.5 text-left">
              <div className="flex h-[72px] w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-linear-to-br from-orange-50 to-orange-200">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt=""
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <File size={24} weight="fill" className="text-orange-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {file.name}
                </p>
                <p className="text-uism text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(1)} MB · อัปโหลดแล้ว
                </p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
                  <div className="h-full w-full bg-success" />
                </div>
              </div>
              <CheckCircle
                size={24}
                weight="fill"
                className="shrink-0 text-success"
              />
            </div>
            <span className="mt-4 text-sm font-medium text-primary hover:underline">
              เปลี่ยนไฟล์
            </span>
          </>
        ) : (
          <div className="space-y-1.5">
            <p className="text-h4 text-foreground">
              ลากไฟล์มาวาง หรือคลิกเลือก
            </p>
            <p className="text-uism text-muted-foreground">
              PNG / JPG / PDF / HEIC ขนาดไม่เกิน 5 MB
            </p>
          </div>
        )}
        <input
          id="slip-file"
          name="slip"
          type="file"
          accept="image/png,image/jpeg,image/heic,image/heif,application/pdf,.heic,.heif"
          required
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {file && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleFile(null);
            }}
            aria-label="Remove file"
            className="text-uism text-muted-foreground transition-colors hover:text-destructive"
          >
            ลบไฟล์
          </button>
        </div>
      )}

      <Button
        type="submit"
        variant="accent"
        size="lg"
        disabled={!file || submitting}
        className="w-full"
      >
        {submitting ? "กำลังส่ง…" : "ส่งสลิป"}
      </Button>
    </form>
  );
}
