"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { PublicShell } from "@/components/layouts/public-shell";
import { AuthCard } from "@/components/layouts/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

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
        <AuthCard title="ส่งลิงก์แล้ว" subtitle="ตรวจสอบกล่องอีเมลของคุณ">
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <EnvelopeSimple size={56} weight="duotone" className="text-(--primary)" />
            <p className="text-body text-(--foreground-muted)">
              หากอีเมลนี้มีบัญชีในระบบ คุณจะได้รับลิงก์สำหรับรีเซ็ตรหัสผ่าน
            </p>
            <Button asChild variant="primary" size="lg" className="w-full">
              <Link href="/login">กลับไปเข้าสู่ระบบ</Link>
            </Button>
          </div>
        </AuthCard>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <AuthCard
        title="ลืมรหัสผ่าน"
        subtitle="กรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน"
        footer={
          <Link href="/login" className="font-medium text-(--primary) hover:underline">
            กลับไปเข้าสู่ระบบ
          </Link>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email" required>อีเมล</Label>
            <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register("email")} />
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </div>

          {serverError && (
            <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-uism text-destructive-foreground">
              {serverError}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
          </Button>
        </form>
      </AuthCard>
    </PublicShell>
  );
}
