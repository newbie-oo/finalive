"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { authClient } from "@/lib/auth-client";
import { PublicShellClient as PublicShell } from "@/components/layouts/public-shell-client";
import { AuthCard } from "@/components/layouts/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError, FieldHelper } from "@/components/ui/label";
import { FormAlert } from "@/components/forms/form-alert";

const resetSchema = z.object({
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});

type ResetForm = z.infer<typeof resetSchema>;

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <PublicShell>
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </PublicShell>
  );
}

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  async function onSubmit(data: ResetForm) {
    setServerError(null);

    if (!token) {
      setServerError("ลิงก์ไม่ถูกต้องหรือหมดอายุ");
      return;
    }

    const result = await authClient.resetPassword({
      newPassword: data.password,
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
      <AuthCard title="รีเซ็ตรหัสผ่านสำเร็จ" subtitle="รหัสผ่านใหม่พร้อมใช้งาน">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <CheckCircle size={56} weight="fill" className="text-success" />
          <Button asChild variant="primary" size="lg" className="w-full">
            <Link href="/login">เข้าสู่ระบบ</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="รีเซ็ตรหัสผ่าน" subtitle="กรอกรหัสผ่านใหม่ของคุณ">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="password" required>
            รหัสผ่านใหม่
          </Label>
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

        <FormAlert message={serverError} variant="destructive" />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isSubmitting || !token}
        >
          {isSubmitting ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
        </Button>
      </form>
    </AuthCard>
  );
}
