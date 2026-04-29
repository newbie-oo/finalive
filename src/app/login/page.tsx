"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signIn } from "@/lib/auth-client";
import { PublicShell } from "@/components/layouts/public-shell";
import { AuthCard } from "@/components/layouts/auth-card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("กรุณากรอกอีเมลที่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

type LoginForm = z.infer<typeof loginSchema>;

// Default landing after login depends on role:
//   admin → /admin (work surface)
//   student → /account/enrollments ("คอร์สของฉัน")
// Going to /account (profile form) was confusing — students expect to see
// their courses, not a settings page.
const STUDENT_DEFAULT = "/account/enrollments";
const ADMIN_DEFAULT = "/admin";

function defaultFor(role: string | null | undefined): string {
  return role === "admin" ? ADMIN_DEFAULT : STUDENT_DEFAULT;
}

// Only allow internal redirect targets to defend against open-redirect attacks.
function safeNext(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next");
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  async function onSubmit(data: LoginForm) {
    setServerError(null);
    const parsed = loginSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof LoginForm;
        setError(field, { message: issue.message });
      }
      return;
    }

    const result = await signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (result.error) {
      setServerError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    // Role lives on the user object that better-auth returns from signIn.
    const role = (result.data as { user?: { role?: string } } | null)?.user?.role;
    const next = safeNext(rawNext, defaultFor(role));
    router.push(next);
    router.refresh();
  }

  return (
    <PublicShell>
      <AuthCard
        title="เข้าสู่ระบบ"
        subtitle="ยินดีต้อนรับกลับมา"
        footer={
          <>
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="font-medium text-(--primary) hover:underline">
              สมัครสมาชิก
            </Link>
          </>
        }
      >
        <GoogleSignInButton mode="login" />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-(--border)" />
          <span className="text-uism text-(--foreground-muted)">หรือ</span>
          <div className="h-px flex-1 bg-(--border)" />
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email" required>อีเมล</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password" required>รหัสผ่าน</Label>
              <Link href="/forgot-password" className="mb-1.5 text-uism text-(--primary) hover:underline">
                ลืมรหัสผ่าน?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && <FieldError>{errors.password.message}</FieldError>}
          </div>

          {serverError && (
            <p role="alert" className="rounded-md bg-(--destructive-bg) px-3 py-2 text-uism text-(--destructive-fg)">
              {serverError}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>
      </AuthCard>
    </PublicShell>
  );
}
