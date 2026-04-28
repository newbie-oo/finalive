"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signIn } from "@/lib/auth-client";
import { PublicShell } from "@/components/layouts/public-shell";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

const loginSchema = z.object({
  email: z.string().email("กรุณากรอกอีเมลที่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
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

    router.push("/account");
    router.refresh();
  }

  return (
    <PublicShell>
      <section className="mx-auto max-w-sm p-8">
        <h1 className="mb-6 text-xl font-semibold">เข้าสู่ระบบ</h1>
        <GoogleSignInButton mode="login" />
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">หรือ</span>
          <div className="h-px flex-1 bg-border" />
        </div>
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

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              รหัสผ่าน
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
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
            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          ยังไม่มีบัญชี?{" "}
          <a href="/register" className="text-primary underline">
            สมัครสมาชิก
          </a>
        </p>
      </section>
    </PublicShell>
  );
}
