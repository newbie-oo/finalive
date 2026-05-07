"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LockSimple, UploadSimple, X } from "@phosphor-icons/react";
import { createCourseAction } from "@/server/actions/admin-course";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleTiptapEditor } from "@/components/admin/simple-tiptap-editor";

function CoverUpload({
  onChange,
}: {
  onChange: (mediaAssetId: string | null, previewUrl: string | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("กรุณาเลือกไฟล์รูปภาพ");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("ไฟล์ต้องไม่เกิน 5MB");
        return;
      }

      // Local preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setPreview(url);
      };
      reader.readAsDataURL(file);

      // Upload
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "อัปโหลดไม่สำเร็จ");
          setPreview(null);
          onChange(null, null);
          return;
        }
        const data = await res.json();
        onChange(data.mediaAssetId, data.urls.cover);
      } catch {
        setError("อัปโหลดไม่สำเร็จ");
        setPreview(null);
        onChange(null, null);
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const clear = useCallback(() => {
    setPreview(null);
    setError(null);
    onChange(null, null);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <div
        className="relative flex h-48 w-full cursor-pointer items-center justify-center overflow-hidden rounded border border-dashed border-border bg-muted"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Cover preview"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <label className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && handleFile(e.target.files[0])
              }
              disabled={uploading}
            />
            <UploadSimple size={24} />
            <span>
              {uploading ? "กำลังอัปโหลด…" : "คลิกหรือลากรูปมาที่นี่"}
            </span>
            <span className="text-xs">JPG, PNG, WebP สูงสุด 5MB</span>
          </label>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function PreviewCard({
  title,
  summary,
  price,
  isFree,
  coverUrl,
}: {
  title: string;
  summary: string;
  price: string;
  isFree: boolean;
  coverUrl: string | null;
}) {
  return (
    <Card className="sticky top-24 overflow-hidden">
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {coverUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={coverUrl}
            alt="Cover"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#312E81] to-[#1E1B4B]">
            <span className="text-sm text-white/60">ไม่มีรูปปก</span>
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <h3 className="text-h4 line-clamp-2 text-(--foreground)">
          {title || "ชื่อคอร์ส"}
        </h3>
        <p className="text-uism text-(--foreground-muted) line-clamp-2">
          {summary || "คำอธิบายสั้น"}
        </p>
        <div className="text-h3 font-bold text-(--foreground)">
          {isFree || Number(price) === 0 ? (
            <span className="text-(--success)">ฟรี</span>
          ) : (
            <span className="num">฿{price}</span>
          )}
        </div>
        <Button variant="accent" size="lg" className="w-full" disabled>
          ลงทะเบียน
        </Button>
      </div>
    </Card>
  );
}

export function NewCourseForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFree, setIsFree] = useState(false);
  const [coverMediaId, setCoverMediaId] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [formValues, setFormValues] = useState({
    title: "",
    summary: "",
    price: "0.00",
  });

  const handleCoverChange = useCallback(
    (mediaAssetId: string | null, previewUrl: string | null) => {
      setCoverMediaId(mediaAssetId);
      setCoverPreviewUrl(previewUrl);
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      slug: formData.get("slug"),
      title: formData.get("title"),
      summary: formData.get("summary"),
      isFree,
      price: isFree ? "0.00" : formValues.price,
    };
    if (coverMediaId) payload.coverMediaId = coverMediaId;
    if (description) payload.description = description;

    const res = await createCourseAction(payload);

    setLoading(false);
    if (res.ok) {
      router.push("/admin/courses");
    } else {
      setError(res.error ?? "unknown");
    }
  };

  const displayPrice = isFree ? "0.00" : formValues.price;

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-h1">สร้างคอร์สใหม่</h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="slug" required>
                Slug
              </Label>
              <Input
                id="slug"
                name="slug"
                required
                placeholder="my-course"
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                title="ใช้ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น เช่น my-course-101"
                className="mono"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                ใช้ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น (เช่น my-course-101)
              </p>
            </div>

            <div>
              <Label htmlFor="title" required>
                ชื่อคอร์ส
              </Label>
              <Input
                id="title"
                name="title"
                required
                value={formValues.title}
                onChange={(e) =>
                  setFormValues((v) => ({ ...v, title: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="summary" required>
                คำอธิบายสั้น
              </Label>
              <Textarea
                id="summary"
                name="summary"
                required
                rows={3}
                value={formValues.summary}
                onChange={(e) =>
                  setFormValues((v) => ({ ...v, summary: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>รูปปกคอร์ส</Label>
              <input
                type="hidden"
                name="coverMediaId"
                value={coverMediaId ?? ""}
              />
              <CoverUpload onChange={handleCoverChange} />
            </div>

            <div>
              <Label htmlFor="description">รายละเอียดคอร์ส</Label>
              <SimpleTiptapEditor
                value={description}
                onChange={setDescription}
                placeholder="พิมพ์รายละเอียดคอร์ส…"
              />
            </div>

            <div>
              <Label htmlFor="price" required={!isFree}>
                <span className="inline-flex items-center gap-1.5">
                  ราคา
                  {isFree && (
                    <LockSimple
                      size={12}
                      weight="fill"
                      className="text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </span>
              </Label>
              {/* readOnly + aria-disabled rather than disabled — disabled
                  inputs aren't serialized into FormData, which previously
                  caused "invalid_input" when isFree=true. */}
              <Input
                id="price"
                name="price"
                type="text"
                required={!isFree}
                readOnly={isFree}
                aria-disabled={isFree}
                value={displayPrice}
                onChange={(e) =>
                  setFormValues((v) => ({ ...v, price: e.target.value }))
                }
                className={
                  "num" +
                  (isFree
                    ? " bg-muted text-muted-foreground cursor-not-allowed"
                    : "")
                }
              />
              {isFree && (
                <p className="mt-1 text-xs text-muted-foreground">
                  ปลดล็อกช่อง “คอร์สฟรี” ก่อนหากต้องการตั้งราคา
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 text-ui">
              <input
                name="isFree"
                type="checkbox"
                value="true"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="h-4 w-4 accent-(--primary)"
              />
              คอร์สฟรี
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-md bg-destructive-bg px-3 py-2 text-uism text-destructive-foreground"
              >
                เกิดข้อผิดพลาด: {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "กำลังสร้าง…" : "สร้างคอร์ส"}
              </Button>
              <Button asChild variant="ghost">
                <Link href="/admin/courses">ยกเลิก</Link>
              </Button>
            </div>
          </form>
        </Card>

        <aside className="hidden lg:block">
          <PreviewCard
            title={formValues.title}
            summary={formValues.summary}
            price={formValues.price}
            isFree={isFree}
            coverUrl={coverPreviewUrl}
          />
        </aside>
      </div>
    </section>
  );
}
