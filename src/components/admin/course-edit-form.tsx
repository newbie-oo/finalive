"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateCourseAction } from "@/server/actions/admin-course";
import { CoverImageUpload } from "@/components/admin/cover-image-upload";
import type { course } from "@/db/schema/course";

type Course = typeof course.$inferSelect;

interface CourseEditFormProps {
  course: Course;
  coverUrl?: string | null;
}

export function CourseEditForm({ course, coverUrl }: CourseEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFree, setIsFree] = useState(course.isFree);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("courseId", course.id);
    const res = await updateCourseAction(formData);

    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(res.error ?? "unknown");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div>
        <label className="block text-sm font-medium">รูปปกคอร์ส</label>
        <CoverImageUpload courseId={course.id} currentCoverUrl={coverUrl} />
      </div>

      <div>
        <label className="block text-sm font-medium">ชื่อคอร์ส</label>
        <input
          name="title"
          defaultValue={course.title}
          required
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">คำอธิบายสั้น</label>
        <textarea
          name="summary"
          defaultValue={course.summary}
          required
          rows={3}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">ราคา</label>
        <input
          name="price"
          type="text"
          defaultValue={course.price}
          required={!isFree}
          readOnly={isFree}
          aria-disabled={isFree}
          className={
            "mt-1 w-full rounded border px-3 py-2 text-sm" +
            (isFree ? " bg-muted text-muted-foreground" : "")
          }
        />
        {isFree && (
          <p className="mt-1 text-xs text-muted-foreground">
            ปลดล็อกช่อง “คอร์สฟรี” ก่อนหากต้องการตั้งราคา
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input type="hidden" name="isFree" value="" />
        <input
          name="isFree"
          type="checkbox"
          value="true"
          checked={isFree}
          onChange={(e) => setIsFree(e.target.checked)}
          className="h-4 w-4"
        />
        <label className="text-sm">คอร์สฟรี</label>
      </div>

      <div>
        <label className="block text-sm font-medium">สถานะ</label>
        <select
          name="status"
          defaultValue={course.status}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        >
          <option value="draft">ร่าง</option>
          <option value="published">เผยแพร่</option>
          <option value="archived">เก็บถาวร</option>
        </select>
      </div>

      {error && (
        <p className="text-sm text-destructive">เกิดข้อผิดพลาด: {error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {loading ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        <Link href="/admin/courses" className="rounded border px-4 py-2 text-sm">
          กลับ
        </Link>
      </div>
    </form>
  );
}
