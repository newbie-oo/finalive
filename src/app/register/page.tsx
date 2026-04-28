"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signUp } from "@/lib/auth-client";
import { PublicShell } from "@/components/layouts/public-shell";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

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
        <section className="mx-auto max-w-sm p-8 text-center">
          <h1 className="mb-2 text-xl font-semibold">สมัครสมาชิกสำเร็จ</h1>
          <p className="text-sm text-muted-foreground">
            กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี จากนั้นจึงเข้าสู่ระบบได้
          </p>
          <a
            href="/login"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            ไปหน้าเข้าสู่ระบบ
          </a>
        </section>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <section className="mx-auto max-w-sm p-8">
        <h1 className="mb-6 text-xl font-semibold">สมัครสมาชิก</h1>
        <GoogleSignInButton mode="register" />
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">หรือ</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              ชื่อ
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              {...register("name")}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

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

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              รหัสผ่าน
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
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          มีบัญชีอยู่แล้ว?{" "}
          <a href="/login" className="text-primary underline">
            เข้าสู่ระบบ
          </a>
        </p>
      </section>
    </PublicShell>
  );
}
