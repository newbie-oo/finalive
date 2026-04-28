"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { PublicShell } from "@/components/layouts/public-shell";

const resetSchema = z.object({
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>();

  async function onSubmit(data: ResetForm) {
    setServerError(null);
    const parsed = resetSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof ResetForm;
        setError(field, { message: issue.message });
      }
      return;
    }

    if (!token) {
      setServerError("ลิงก์ไม่ถูกต้องหรือหมดอายุ");
      return;
    }

    const result = await authClient.resetPassword({
      newPassword: parsed.data.password,
      token,
    });

    if (result.error) {
      setServerError("ไม่สามารถรีเซ็ตรหัสผ่านได้ กรุณาลองใหม่");
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <PublicShell>
        <section className="mx-auto max-w-sm p-8 text-center">
          <h1 className="mb-2 text-xl font-semibold">รีเซ็ตรหัสผ่านสำเร็จ</h1>
          <p className="text-sm text-muted-foreground">รหัสผ่านใหม่ของคุณพร้อมใช้งานแล้ว</p>
          <a
            href="/login"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            เข้าสู่ระบบ
          </a>
        </section>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <section className="mx-auto max-w-sm p-8">
        <h1 className="mb-6 text-xl font-semibold">รีเซ็ตรหัสผ่าน</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              รหัสผ่านใหม่
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
          </button>
        </form>
      </section>
    </PublicShell>
  );
}
