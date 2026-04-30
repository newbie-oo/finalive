"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle, SignOut, Warning } from "@phosphor-icons/react";
import { authClient, useSession } from "@/lib/auth-client";
import { deleteCurrentAccountAction } from "@/server/actions/delete-account";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, FieldError, FieldHelper } from "@/components/ui/label";
import { AvatarInitials } from "@/components/ui/avatar-initials";

const profileSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ"),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
  newPassword: z.string().min(8, "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"),
});
type PasswordForm = z.infer<typeof passwordSchema>;

export default function AccountPage() {
  const router = useRouter();
  const { data: session, refetch } = useSession();
  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <header className="flex items-center gap-4">
        <AvatarInitials name={session?.user?.name ?? "?"} size="xl" />
        <div>
          <h1 className="text-h1">บัญชีของฉัน</h1>
          <p className="mt-1 text-bodylg text-(--foreground-muted)">
            ภาพรวมและการตั้งค่าบัญชีของคุณ
          </p>
        </div>
      </header>

      <ProfileSection
        name={session?.user?.name ?? ""}
        email={session?.user?.email ?? ""}
        onSaved={refetch}
      />

      <ChangePasswordSection />

      <SessionSection
        onAllRevoked={() => {
          router.replace("/login");
          router.refresh();
        }}
      />

      <DangerZoneSection
        onDeleted={() => {
          router.replace("/login");
          router.refresh();
        }}
      />
    </section>
  );
}

function ProfileSection({
  name,
  email,
  onSaved,
}: {
  name: string;
  email: string;
  onSaved: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({ values: { name } });

  async function onSubmit(data: ProfileForm) {
    setSaved(false);
    setServerError(null);
    const parsed = profileSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof ProfileForm;
        setError(field, { message: issue.message });
      }
      return;
    }
    const result = await authClient.updateUser({ name: parsed.data.name });
    if (result.error) {
      setServerError("ไม่สามารถบันทึกได้");
      return;
    }
    setSaved(true);
    onSaved();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <h2 className="text-h3">ข้อมูลบัญชี</h2>
        <div>
          <Label htmlFor="name" required>ชื่อ</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && <FieldError>{errors.name.message}</FieldError>}
        </div>
        <div>
          <Label>อีเมล</Label>
          <p className="text-body text-(--foreground)">{email}</p>
        </div>
        {saved && (
          <p className="inline-flex items-center gap-2 rounded-md bg-success-bg px-3 py-2 text-uism text-success-foreground">
            <CheckCircle size={16} weight="fill" /> บันทึกสำเร็จ
          </p>
        )}
        {serverError && (
          <p
            role="alert"
            className="rounded-md bg-destructive-bg px-3 py-2 text-uism text-destructive-foreground"
          >
            {serverError}
          </p>
        )}
        <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
          {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </form>
    </Card>
  );
}

function ChangePasswordSection() {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>();

  async function onSubmit(data: PasswordForm) {
    setSaved(false);
    setServerError(null);
    const parsed = passwordSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof PasswordForm;
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
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <h2 className="text-h3">เปลี่ยนรหัสผ่าน</h2>
        <p className="text-body text-(--foreground-muted)">
          ถ้าคุณเข้าสู่ระบบด้วย Google เท่านั้น สามารถข้ามส่วนนี้ได้
        </p>
        <div>
          <Label htmlFor="currentPassword" required>รหัสผ่านปัจจุบัน</Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            invalid={!!errors.currentPassword}
            {...register("currentPassword")}
          />
          {errors.currentPassword && (
            <FieldError>{errors.currentPassword.message}</FieldError>
          )}
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
          <p
            role="alert"
            className="rounded-md bg-destructive-bg px-3 py-2 text-uism text-destructive-foreground"
          >
            {serverError}
          </p>
        )}
        <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
          {isSubmitting ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
        </Button>
      </form>
    </Card>
  );
}

function SessionSection({ onAllRevoked }: { onAllRevoked: () => void }) {
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    if (
      !confirm(
        "ออกจากระบบทุกอุปกรณ์? เซสชันบนอุปกรณ์ทั้งหมดจะถูกตัด รวมถึงอุปกรณ์นี้",
      )
    ) {
      return;
    }
    setRevoking(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/revoke-sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        setError("ไม่สามารถออกจากระบบได้ในตอนนี้");
        setRevoking(false);
        return;
      }
      onAllRevoked();
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setRevoking(false);
    }
  }

  return (
    <Card>
      <div className="space-y-3">
        <h2 className="text-h3">เซสชัน</h2>
        <p className="text-body text-(--foreground-muted)">
          หากคุณสงสัยว่าบัญชีถูกเข้าใช้งานจากอุปกรณ์อื่น
          กดปุ่มด้านล่างเพื่อออกจากระบบทุกอุปกรณ์รวมถึงอุปกรณ์นี้
        </p>
        {error && (
          <p
            role="alert"
            className="rounded-md bg-destructive-bg px-3 py-2 text-uism text-destructive-foreground"
          >
            {error}
          </p>
        )}
        <Button
          type="button"
          variant="ghost"
          size="md"
          disabled={revoking}
          onClick={handleRevoke}
        >
          <SignOut size={16} className="mr-1" />
          {revoking ? "กำลังออกจากระบบ..." : "ออกจากระบบทุกอุปกรณ์"}
        </Button>
      </div>
    </Card>
  );
}

function DangerZoneSection({ onDeleted }: { onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirmText !== "DELETE") {
      setError("พิมพ์ DELETE เพื่อยืนยัน");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await deleteCurrentAccountAction({
      password: password || undefined,
    });
    if (!res.ok) {
      setSubmitting(false);
      if (res.error === "wrong_password") {
        setError("รหัสผ่านไม่ถูกต้อง");
      } else if (res.error === "unauthorized") {
        setError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
      } else {
        setError("ไม่สามารถลบบัญชีได้ กรุณาลองใหม่");
      }
      return;
    }
    onDeleted();
  }

  return (
    <Card className="border-(--destructive)/30">
      <div className="space-y-3">
        <h2 className="text-h3 inline-flex items-center gap-2 text-(--destructive-fg)">
          <Warning size={18} weight="fill" /> เขตอันตราย
        </h2>
        <p className="text-body text-(--foreground-muted)">
          ลบบัญชีถาวร — เนื้อหาที่เรียน ความคืบหน้า และคำถามจะถูกลบ ใบประกาศที่ออกแล้วยังคงตรวจสอบได้
          ไม่สามารถกู้คืนได้หลังจากกดยืนยัน
        </p>
        {!open ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            className="text-(--destructive-fg) hover:bg-(--destructive-bg)"
            onClick={() => setOpen(true)}
          >
            ลบบัญชีถาวร
          </Button>
        ) : (
          <div className="space-y-4 rounded-md border border-(--destructive)/30 bg-(--destructive-bg)/40 p-4">
            <p className="text-body">
              พิมพ์ <code className="rounded bg-(--surface-muted) px-1.5 py-0.5 font-mono text-uism">DELETE</code> เพื่อยืนยัน
              และกรอกรหัสผ่านปัจจุบัน (เฉพาะบัญชีที่ตั้งรหัสผ่านไว้)
            </p>
            <div>
              <Label htmlFor="confirm" required>คำยืนยัน</Label>
              <Input
                id="confirm"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="delete-password">รหัสผ่านปัจจุบัน</Label>
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <FieldHelper>เว้นว่างหากเข้าสู่ระบบด้วย Google เท่านั้น</FieldHelper>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-md bg-destructive-bg px-3 py-2 text-uism text-destructive-foreground"
              >
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={submitting || confirmText !== "DELETE"}
                onClick={handleDelete}
                className="bg-(--destructive) hover:bg-(--destructive)/90"
              >
                {submitting ? "กำลังลบ..." : "ยืนยันลบบัญชี"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                disabled={submitting}
                onClick={() => {
                  setOpen(false);
                  setConfirmText("");
                  setPassword("");
                  setError(null);
                }}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
