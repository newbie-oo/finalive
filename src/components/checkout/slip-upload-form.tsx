"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SlipUploadFormProps {
  pendingId: string;
  amount: string;
}

const MAX_SLIP_BYTES = 5 * 1024 * 1024;

export function SlipUploadForm({ pendingId, amount }: SlipUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [reportedAmount, setReportedAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

      <button
        type="button"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        aria-label="เลือกไฟล์สลิป — ลากไฟล์มาวาง หรือคลิกเลือก"
        className={`relative flex min-h-[280px] w-full cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed p-6 text-center transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) ${
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
          ref={inputRef}
          name="slip"
          type="file"
          accept="image/png,image/jpeg"
          required
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </button>

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

      <div>
        <Label htmlFor="reportedAmount">ยอดที่โอน (THB) — ไม่บังคับ</Label>
        <Input
          id="reportedAmount"
          name="reportedAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder={amount}
          value={reportedAmount}
          onChange={(e) => setReportedAmount(e.target.value)}
          className="num"
        />
      </div>

      <Button type="submit" variant="accent" size="lg" disabled={!file || submitting} className="w-full">
        {submitting ? "กำลังส่ง…" : "ส่งสลิป"}
      </Button>
    </form>
  );
}
