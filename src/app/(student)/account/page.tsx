"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle, ShieldCheck } from "@phosphor-icons/react";
import { useSession, authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { AvatarInitials } from "@/components/ui/avatar-initials";

const profileSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ"),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function AccountPage() {
  const { data: session, refetch } = useSession();
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    values: { name: session?.user?.name ?? "" },
  });

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
    await refetch();
  }

  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <header className="flex items-center gap-4">
        <AvatarInitials name={session?.user?.name ?? "?"} size="xl" />
        <div>
          <h1 className="text-h1">บัญชีของฉัน</h1>
          <p className="mt-1 text-bodylg text-(--foreground-muted)">ภาพรวมและการตั้งค่าบัญชีของคุณ</p>
        </div>
      </header>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <h2 className="text-h3">ข้อมูลบัญชี</h2>
          <div>
            <Label htmlFor="name" required>ชื่อ</Label>
            <Input id="name" type="text" autoComplete="name" invalid={!!errors.name} {...register("name")} />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </div>

          <div>
            <Label>อีเมล</Label>
            <p className="text-body text-(--foreground)">{session?.user?.email}</p>
          </div>

          {saved && (
            <p className="inline-flex items-center gap-2 rounded-md bg-success-bg px-3 py-2 text-uism text-success-foreground">
              <CheckCircle size={16} weight="fill" /> บันทึกสำเร็จ
            </p>
          )}
          {serverError && (
            <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-uism text-destructive-foreground">
              {serverError}
            </p>
          )}

          <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </form>
      </Card>

      <Card className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck size={32} weight="duotone" className="text-(--primary)" />
          <div>
            <h3 className="text-h4">ความปลอดภัย</h3>
            <p className="text-body text-(--foreground-muted)">รหัสผ่าน, อุปกรณ์, และการลบบัญชี</p>
          </div>
        </div>
        <Button asChild variant="secondary">
          <Link href="/account/security">ตั้งค่า</Link>
        </Button>
      </Card>
    </section>
  );
}
