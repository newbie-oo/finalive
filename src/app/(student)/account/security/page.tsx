"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle, SignOut } from "@phosphor-icons/react";
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
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SecurityForm>();

  async function handleLogoutAllDevices() {
    if (
      !confirm(
        "ออกจากระบบทุกอุปกรณ์? เซสชันบนอุปกรณ์ทั้งหมดจะถูกตัด รวมถึงอุปกรณ์นี้",
      )
    ) {
      return;
    }
    setRevokingAll(true);
    setRevokeError(null);
    try {
      // /revoke-sessions terminates every session for the current user, this
      // device included — same effect as clicking "ออกจากระบบ" on every
      // device manually. Better Auth route name follows the proxy mapping
      // from the server endpoint.
      const res = await fetch("/api/auth/revoke-sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        setRevokeError("ไม่สามารถออกจากระบบได้ในตอนนี้");
        setRevokingAll(false);
        return;
      }
      // Force a full reload so the now-revoked session cookie is cleared and
      // every other open tab also bounces to /login on its next request.
      router.replace("/login");
      router.refresh();
    } catch {
      setRevokeError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setRevokingAll(false);
    }
  }

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

      <Card>
        <div className="space-y-3">
          <h2 className="text-h3">เซสชัน</h2>
          <p className="text-body text-(--foreground-muted)">
            หากคุณสงสัยว่าบัญชีถูกเข้าใช้งานจากอุปกรณ์อื่น
            กดปุ่มด้านล่างเพื่อออกจากระบบทุกอุปกรณ์รวมถึงอุปกรณ์นี้
          </p>
          {revokeError && (
            <p
              role="alert"
              className="rounded-md bg-destructive-bg px-3 py-2 text-uism text-destructive-foreground"
            >
              {revokeError}
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="md"
            disabled={revokingAll}
            onClick={handleLogoutAllDevices}
          >
            <SignOut size={16} className="mr-1" />
            {revokingAll ? "กำลังออกจากระบบ..." : "ออกจากระบบทุกอุปกรณ์"}
          </Button>
        </div>
      </Card>
    </section>
  );
}
