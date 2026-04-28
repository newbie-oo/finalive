"use client";

import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { updateLessonAction } from "@/server/actions/admin-curriculum";
import { VideoUploader } from "@/components/admin/video-uploader";
import type { AdminCurriculumLesson } from "@/server/repos/admin-course";

interface LessonEditorProps {
  courseId: string;
  lesson: AdminCurriculumLesson;
}

export function LessonEditor({ courseId, lesson }: LessonEditorProps) {
  const [title, setTitle] = useState(lesson.title);
  const [bodyMd, setBodyMd] = useState(lesson.bodyMd ?? "");
  const [isPreview, setIsPreview] = useState(lesson.isPreview);
  const [isFree, setIsFree] = useState(lesson.isFree);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [, startTransition] = useTransition();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoSave = useCallback(
    (updates: { title?: string; bodyMd?: string; isPreview?: boolean; isFree?: boolean }) => {
      setSaveStatus("saving");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const formData = new FormData();
        formData.append("courseId", courseId);
        formData.append("lessonId", lesson.id);
        if (updates.title !== undefined) formData.append("title", updates.title);
        if (updates.bodyMd !== undefined) formData.append("bodyMd", updates.bodyMd);
        if (updates.isPreview !== undefined) formData.append("isPreview", String(updates.isPreview));
        if (updates.isFree !== undefined) formData.append("isFree", String(updates.isFree));

        startTransition(async () => {
          const result = await updateLessonAction(formData);
          if (result.ok) {
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2000);
          } else {
            setSaveStatus("idle");
            toast.error("บันทึกไม่สำเร็จ");
          }
        });
      }, 1000);
    },
    [courseId, lesson.id],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">แก้ไขบทเรียน</h1>
          <p className="text-sm text-muted-foreground">
            {saveStatus === "saving" && "กำลังบันทึก…"}
            {saveStatus === "saved" && "บันทึกแล้ว"}
            {saveStatus === "idle" && "แก้ไขแล้วบันทึกอัตโนมัติ"}
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
              autoSave({ title: e.target.value });
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
                autoSave({ isPreview: e.target.checked });
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
                autoSave({ isFree: e.target.checked });
              }}
            />
            ฟรี
          </label>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">วิดีโอ</label>
          <VideoUploader
            courseId={courseId}
            lessonId={lesson.id}
            onUploadComplete={() => window.location.reload()}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">เนื้อหา (Markdown)</label>
          <textarea
            value={bodyMd}
            onChange={(e) => {
              setBodyMd(e.target.value);
              autoSave({ bodyMd: e.target.value });
            }}
            rows={20}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>
    </div>
  );
}
