"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PublicShell } from "@/components/layouts/public-shell";

const forgotSchema = z.object({
  email: z.string().email("กรุณากรอกอีเมลที่ถูกต้อง"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>();

  async function onSubmit(data: ForgotForm) {
    setServerError(null);
    const parsed = forgotSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof ForgotForm;
        setError(field, { message: issue.message });
      }
      return;
    }

    const res = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: parsed.data.email,
        redirectTo: "/reset-password",
      }),
    });

    if (!res.ok) {
      setServerError("ไม่สามารถส่งลิงก์ได้ กรุณาลองใหม่");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <PublicShell>
        <section className="mx-auto max-w-sm p-8 text-center">
          <h1 className="mb-2 text-xl font-semibold">ส่งลิงก์แล้ว</h1>
          <p className="text-sm text-muted-foreground">
            หากอีเมลนี้มีบัญชีในระบบ คุณจะได้รับลิงก์สำหรับรีเซ็ตรหัสผ่าน
          </p>
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
        <h1 className="mb-6 text-xl font-semibold">ลืมรหัสผ่าน</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              อีเมล
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <a href="/login" className="text-primary underline">
            กลับไปเข้าสู่ระบบ
          </a>
        </p>
      </section>
    </PublicShell>
  );
}
