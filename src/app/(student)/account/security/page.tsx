"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

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
    <section className="mx-auto max-w-lg">
      <h1 className="mb-2 text-xl font-semibold">ความปลอดภัย</h1>
      <p className="mb-6 text-sm text-muted-foreground">เปลี่ยนรหัสผ่านและจัดการความปลอดภัยบัญชี</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border p-4">
        <div>
          <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium">
            รหัสผ่านปัจจุบัน
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            {...register("currentPassword")}
          />
          {errors.currentPassword && (
            <p className="mt-1 text-sm text-destructive">{errors.currentPassword.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="newPassword" className="mb-1 block text-sm font-medium">
            รหัสผ่านใหม่
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            {...register("newPassword")}
          />
          {errors.newPassword && (
            <p className="mt-1 text-sm text-destructive">{errors.newPassword.message}</p>
          )}
        </div>

        {saved && <p className="text-sm text-success">เปลี่ยนรหัสผ่านสำเร็จ</p>}
        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
        </button>
      </form>
    </section>
  );
}
