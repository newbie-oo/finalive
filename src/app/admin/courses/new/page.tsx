"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCourseAction } from "@/server/actions/admin-course";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-h1">สร้างคอร์สใหม่</h1>
      </header>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="slug" required>Slug</Label>
            <Input id="slug" name="slug" required placeholder="my-course" className="mono" />
          </div>

          <div>
            <Label htmlFor="title" required>ชื่อคอร์ส</Label>
            <Input id="title" name="title" required />
          </div>

          <div>
            <Label htmlFor="summary" required>คำอธิบายสั้น</Label>
            <Textarea id="summary" name="summary" required rows={3} />
          </div>

          <div>
            <Label htmlFor="price" required>ราคา</Label>
            <Input id="price" name="price" type="text" required defaultValue="0.00" className="num" />
          </div>

          <label className="flex items-center gap-2 text-ui">
            <input name="isFree" type="checkbox" value="true" className="h-4 w-4 accent-(--primary)" />
            คอร์สฟรี
          </label>

          {error && (
            <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-uism text-destructive-foreground">
              เกิดข้อผิดพลาด: {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "กำลังสร้าง..." : "สร้างคอร์ส"}
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin/courses">ยกเลิก</Link>
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
