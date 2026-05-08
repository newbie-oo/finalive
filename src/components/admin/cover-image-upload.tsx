"use client";

import Image from "next/image";
import { useState, useTransition, useCallback } from "react";
import { toast } from "sonner";
import { updateCourseCoverAction } from "@/server/actions/admin-course";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-limits";

interface CoverImageUploadProps {
  courseId: string;
  currentCoverUrl?: string | null;
}

export function CoverImageUpload({
  courseId,
  currentCoverUrl,
}: CoverImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(
    currentCoverUrl ?? null,
  );
  const [pending, startTransition] = useTransition();

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("กรุณาเลือกไฟล์รูปภาพ");
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error("ไฟล์ต้องไม่เกิน 5MB");
        return;
      }

      // Local preview.
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload.
      const formData = new FormData();
      formData.append("file", file);

      startTransition(async () => {
        try {
          const res = await fetch("/api/upload/image", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            toast.error("อัปโหลดรูปไม่สำเร็จ");
            setPreview(currentCoverUrl ?? null);
            return;
          }
          const data = (await res.json()) as {
            mediaAssetId: string;
            urls: { cover: string };
          };

          const result = await updateCourseCoverAction({
            courseId,
            mediaAssetId: data.mediaAssetId,
          });

          if (result.ok) {
            setPreview(data.urls.cover);
            toast.success("อัปโหลดรูปปกสำเร็จ");
          } else {
            toast.error("บันทึกรูปปกไม่สำเร็จ");
            setPreview(currentCoverUrl ?? null);
          }
        } catch {
          toast.error("อัปโหลดไม่สำเร็จ");
          setPreview(currentCoverUrl ?? null);
        }
      });
    },
    [courseId, currentCoverUrl],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div
      className="relative flex h-40 w-full cursor-pointer items-center justify-center rounded-sm border border-dashed border-border bg-muted"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {preview ? (
        <>
          <Image
            src={preview}
            alt="Cover preview"
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="rounded-sm object-cover"
            unoptimized
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-black/40 opacity-0 transition-opacity hover:opacity-100">
            <label className="cursor-pointer text-sm text-white">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] && handleFile(e.target.files[0])
                }
                disabled={pending}
              />
              {pending ? "กำลังอัปโหลด…" : "เปลี่ยนรูปปก"}
            </label>
          </div>
        </>
      ) : (
        <label className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) =>
              e.target.files?.[0] && handleFile(e.target.files[0])
            }
            disabled={pending}
          />
          <span>คลิกหรือลากรูปมาที่นี่</span>
          <span className="text-xs">PNG, JPG สูงสุด 5MB</span>
        </label>
      )}
    </div>
  );
}
