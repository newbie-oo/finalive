"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, FieldError, FieldHelper } from "@/components/ui/label";

const securitySchema = z.object({
  currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
  newPassword: z.string().min(8, "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"),
});

type SecurityForm = z.infer<typeof securitySchema>;

export default function SecurityPage() {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SecurityForm>();

  async function onSubmit(data: SecurityForm) {
    setSaved(false);
    setServerError(null);
    const parsed = securitySchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof SecurityForm;
        setError(field, { message: issue.message });
      }
      return;
    }

    const result = await authClient.changePassword({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });

    if (result.error) {
      setServerError("รหัสผ่านปัจจุบันไม่ถูกต้อง หรือไม่สามารถเปลี่ยนได้");
      return;
    }

    setSaved(true);
    reset();
  }

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-h1">ความปลอดภัย</h1>
        <p className="mt-2 text-bodylg text-(--foreground-muted)">
          เปลี่ยนรหัสผ่านและจัดการความปลอดภัยบัญชี
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <h2 className="text-h3">เปลี่ยนรหัสผ่าน</h2>
          <div>
            <Label htmlFor="currentPassword" required>รหัสผ่านปัจจุบัน</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              invalid={!!errors.currentPassword}
              {...register("currentPassword")}
            />
            {errors.currentPassword && <FieldError>{errors.currentPassword.message}</FieldError>}
          </div>

          <div>
            <Label htmlFor="newPassword" required>รหัสผ่านใหม่</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              invalid={!!errors.newPassword}
              {...register("newPassword")}
            />
            {errors.newPassword ? (
              <FieldError>{errors.newPassword.message}</FieldError>
            ) : (
              <FieldHelper>อย่างน้อย 8 ตัวอักษร</FieldHelper>
            )}
          </div>

          {saved && (
            <p className="inline-flex items-center gap-2 rounded-md bg-success-bg px-3 py-2 text-uism text-success-foreground">
              <CheckCircle size={16} weight="fill" /> เปลี่ยนรหัสผ่านสำเร็จ
            </p>
          )}
          {serverError && (
            <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-uism text-destructive-foreground">
              {serverError}
            </p>
          )}

          <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
          </Button>
        </form>
      </Card>
    </section>
  );
}
