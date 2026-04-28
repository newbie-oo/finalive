"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCourseAction } from "@/server/actions/admin-course";

export default function NewCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await createCourseAction(formData);

    setLoading(false);
    if (res.ok) {
      router.push("/admin/courses");
    } else {
      setError(res.error ?? "unknown");
    }
  };

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-xl font-semibold">สร้างคอร์สใหม่</h1>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium">Slug</label>
          <input
            name="slug"
            required
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            placeholder="my-course"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">ชื่อคอร์ส</label>
          <input
            name="title"
            required
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">คำอธิบายสั้น</label>
          <textarea
            name="summary"
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
            required
            defaultValue="0.00"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            name="isFree"
            type="checkbox"
            value="true"
            className="h-4 w-4"
          />
          <label className="text-sm">คอร์สฟรี</label>
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
            {loading ? "กำลังสร้าง..." : "สร้างคอร์ส"}
          </button>
          <Link
            href="/admin/courses"
            className="rounded border px-4 py-2 text-sm"
          >
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
