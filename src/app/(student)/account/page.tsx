"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSession } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";

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
    defaultValues: { name: session?.user?.name ?? "" },
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
    <section className="mx-auto max-w-lg">
      <h1 className="mb-2 text-xl font-semibold">บัญชีของฉัน</h1>
      <p className="mb-6 text-sm text-muted-foreground">ภาพรวมของบัญชีและคอร์ส</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border p-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            ชื่อ
          </label>
          <input
            id="name"
            type="text"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            {...register("name")}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">
            อีเมล
          </label>
          <p className="text-sm">{session?.user?.email}</p>
        </div>

        {saved && <p className="text-sm text-success">บันทึกสำเร็จ</p>}
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
          {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </form>

      <div className="mt-4">
        <a href="/account/security" className="text-sm text-primary underline">
          ตั้งค่าความปลอดภัย
        </a>
      </div>
    </section>
  );
}
