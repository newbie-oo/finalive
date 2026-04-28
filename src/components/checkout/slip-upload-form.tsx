"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface SlipUploadFormProps {
  pendingId: string;
  amount: string;
}

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
      alert("รองรับเฉพาะไฟล์รูปภาพ");
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

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : preview
              ? "border-border bg-background"
              : "border-muted-foreground/30 bg-muted/40 hover:bg-muted"
        }`}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="preview"
              className="mx-auto max-h-64 rounded object-contain"
            />
          </>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium">
              ลากไฟล์มาวาง หรือคลิกเลือก
            </p>
            <p className="text-xs text-muted-foreground">
              PNG / JPG ขนาดไม่เกิน 5 MB
            </p>
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
      </div>

      {file && (
        <div className="flex items-center justify-between rounded border border-border bg-card px-3 py-2 text-xs">
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => handleFile(null)}
            className="ml-2 text-muted-foreground hover:text-destructive"
          >
            ลบ
          </button>
        </div>
      )}

      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">
          ยอดที่โอน (THB) — ไม่บังคับ
        </span>
        <input
          name="reportedAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder={amount}
          value={reportedAmount}
          onChange={(e) => setReportedAmount(e.target.value)}
          className="w-full rounded border border-border bg-background p-2 text-sm"
        />
      </label>

      <Button type="submit" disabled={!file || submitting} className="w-full">
        {submitting ? "กำลังส่ง…" : "ส่งสลิป"}
      </Button>
    </form>
  );
}
