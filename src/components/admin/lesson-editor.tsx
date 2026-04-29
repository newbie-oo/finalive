"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Clock, FloppyDisk } from "@phosphor-icons/react";
import { updateLessonAction } from "@/server/actions/admin-curriculum";
import { VideoUploader } from "@/components/admin/video-uploader";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { useUnsavedChangesWarning } from "@/lib/use-unsaved-changes";
import type { AdminCurriculumLesson } from "@/server/repos/admin-course";

interface LessonEditorProps {
  courseId: string;
  lesson: AdminCurriculumLesson;
}

export function LessonEditor({ courseId, lesson }: LessonEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(lesson.title);
  const [bodyMd, setBodyMd] = useState(lesson.bodyMd ?? "");
  const [isPreview, setIsPreview] = useState(lesson.isPreview);
  const [isFree, setIsFree] = useState(lesson.isFree);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, startSave] = useTransition();
  useUnsavedChangesWarning(isDirty);

  function handleSave() {
    startSave(async () => {
      const formData = new FormData();
      formData.append("courseId", courseId);
      formData.append("lessonId", lesson.id);
      formData.append("title", title);
      formData.append("bodyMd", bodyMd);
      formData.append("isPreview", String(isPreview));
      formData.append("isFree", String(isFree));

      const result = await updateLessonAction(formData);
      if (result.ok) {
        setIsDirty(false);
        toast.success("บันทึกสำเร็จ");
      } else {
        toast.error("บันทึกไม่สำเร็จ");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">แก้ไขบทเรียน</h1>
          <p className="text-sm text-muted-foreground">
            {isDirty ? "มีการเปลี่ยนแปลงยังไม่บันทึก" : "บันทึกแล้ว"}
          </p>
        </div>
        <Link
          href={`/admin/courses/${courseId}/curriculum`}
          className="text-sm text-primary hover:underline"
        >
          ← กลับไปเนื้อหา
        </Link>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">ชื่อบทเรียน</label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDirty(true);
            }}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPreview}
              onChange={(e) => {
                setIsPreview(e.target.checked);
                setIsDirty(true);
              }}
            />
            ดูตัวอย่างได้
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => {
                setIsFree(e.target.checked);
                setIsDirty(true);
              }}
            />
            ฟรี
          </label>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">วิดีโอ</label>
          {lesson.bunnyVideoId ? (
            <div className="mb-3 rounded-[10px] border border-(--border) bg-(--surface-muted) p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--primary)/10 text-(--primary)">
                  <Play size={18} weight="fill" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-ui font-medium text-(--foreground)">มีวิดีโอแล้ว</div>
                  <div className="text-caption text-(--foreground-muted)">
                    Bunny ID: <span className="mono">{lesson.bunnyVideoId}</span>
                  </div>
                </div>
                {lesson.durationSeconds && (
                  <div className="flex items-center gap-1 text-caption text-(--foreground-muted)">
                    <Clock size={12} />
                    <span className="num">{Math.floor(lesson.durationSeconds / 60)}:{(lesson.durationSeconds % 60).toString().padStart(2, "0")}</span>
                  </div>
                )}
                <ReencodeButton courseId={courseId} lessonId={lesson.id} />
              </div>
            </div>
          ) : null}
          <VideoUploader
            courseId={courseId}
            lessonId={lesson.id}
            onUploadComplete={() => {
              // Pull the fresh lesson row (with the duration the Bunny webhook
              // wrote on encode) instead of a hard reload — preserves any
              // unsaved title/body edits in the form above.
              router.refresh();
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">เนื้อหา</label>
          <p className="mb-2 text-xs text-muted-foreground">
            ตัวแก้ไขแบบ rich-text — กล่องเครื่องมือด้านบนสำหรับจัดรูปแบบ
          </p>
          <TiptapEditor
            value={bodyMd}
            onChange={(html) => {
              setBodyMd(html);
              setIsDirty(true);
            }}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            <FloppyDisk size={16} />
            {saving ? "กำลังบันทึก…" : "บันทึก"}
          </button>
          {isDirty && (
            <span className="text-sm text-muted-foreground">มีการเปลี่ยนแปลงยังไม่ได้บันทึก</span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Triggers Bunny `reencode` for the lesson's video. Used as a recovery
 * lever when Bunny's HLS output ends up shorter than the source — the
 * source MP4 is fine, but the renditions need rebuilding. Marks the
 * mediaAsset back to 'encoding' so the UI shows the spinner again.
 */
function ReencodeButton({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!confirm(
          "เข้ารหัสวิดีโอใหม่ที่ Bunny?\nใช้เมื่อความยาวที่เล่นได้สั้นกว่าไฟล์ต้นฉบับ — ใช้เวลา 1–5 นาที",
        )) return;
        setBusy(true);
        try {
          const res = await fetch("/api/admin/reencode-video", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ lessonId, courseId }),
          });
          if (!res.ok) throw new Error(`http ${res.status}`);
          toast.success("ส่งคำสั่งเข้ารหัสใหม่แล้ว");
          router.refresh();
        } catch {
          toast.error("เข้ารหัสใหม่ไม่สำเร็จ");
        } finally {
          setBusy(false);
        }
      }}
      className="rounded border border-(--border) px-2 py-1 text-caption text-(--foreground-muted) hover:bg-(--surface) hover:text-(--foreground) disabled:opacity-50"
      title="สั่งให้ Bunny เข้ารหัสวิดีโอใหม่"
    >
      {busy ? "กำลังส่ง…" : "เข้ารหัสใหม่"}
    </button>
  );
}
