"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle } from "@phosphor-icons/react";
import { signUp } from "@/lib/auth-client";
import { PublicShell } from "@/components/layouts/public-shell";
import { AuthCard } from "@/components/layouts/auth-card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError, FieldHelper } from "@/components/ui/label";

const registerSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ"),
  email: z.string().email("กรุณากรอกอีเมลที่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>();

  async function onSubmit(data: RegisterForm) {
    setServerError(null);
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof RegisterForm;
        setError(field, { message: issue.message });
      }
      return;
    }

    const result = await signUp.email({
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
    });

    if (result.error) {
      setServerError(result.error.message ?? "สมัครสมาชิกไม่สำเร็จ");
      return;
    }

    setRegistered(true);
  }

  if (registered) {
    return (
      <PublicShell>
        <AuthCard title="สมัครสมาชิกสำเร็จ" subtitle="ตรวจสอบอีเมลเพื่อยืนยันบัญชี">
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <CheckCircle size={56} weight="fill" className="text-success" />
            <p className="text-body text-(--foreground-muted)">
              เราส่งลิงก์ยืนยันไปยังอีเมลของคุณแล้ว
            </p>
            <Button asChild variant="primary" size="lg" className="w-full">
              <Link href="/login">ไปหน้าเข้าสู่ระบบ</Link>
            </Button>
          </div>
        </AuthCard>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <AuthCard
        title="สมัครสมาชิก"
        subtitle="เริ่มต้นเรียนคอร์สแรกของคุณ"
        footer={
          <>
            มีบัญชีอยู่แล้ว?{" "}
            <Link href="/login" className="font-medium text-(--primary) hover:underline">
              เข้าสู่ระบบ
            </Link>
          </>
        }
      >
        <GoogleSignInButton mode="register" />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-(--border)" />
          <span className="text-uism text-(--foreground-muted)">หรือ</span>
          <div className="h-px flex-1 bg-(--border)" />
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name" required>ชื่อ-นามสกุล</Label>
            <Input id="name" type="text" autoComplete="name" invalid={!!errors.name} {...register("name")} />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </div>

          <div>
            <Label htmlFor="email" required>อีเมล</Label>
            <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register("email")} />
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </div>

          <div>
            <Label htmlFor="password" required>รหัสผ่าน</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password ? (
              <FieldError>{errors.password.message}</FieldError>
            ) : (
              <FieldHelper>อย่างน้อย 8 ตัวอักษร</FieldHelper>
            )}
          </div>

          {serverError && (
            <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-uism text-destructive-foreground">
              {serverError}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </Button>
        </form>
      </AuthCard>
    </PublicShell>
  );
}
