"use client";

import { useActionState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { PublicShell } from "@/components/layouts/public-shell";

async function verifyAction(_prev: unknown, formData: FormData) {
  const token = formData.get("token") as string | null;
  if (!token) return { ok: false, message: "ลิงก์ยืนยันไม่ถูกต้อง กรุณาขอลิงก์ใหม่" };
  const result = await authClient.verifyEmail({ query: { token } });
  if (result.error) {
    return { ok: false, message: "ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่" };
  }
  return { ok: true, message: "ยืนยันอีเมลสำเร็จ กรุณาเข้าสู่ระบบ" };
}

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, dispatch] = useActionState(verifyAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (token && formRef.current) {
      formRef.current.requestSubmit();
    }
  }, [token]);

  const heading =
    state?.ok ? "ยืนยันสำเร็จ" : state ? "ไม่สามารถยืนยันได้" : "กำลังยืนยัน";

  return (
    <PublicShell>
      <section className="mx-auto max-w-sm p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold">{heading}</h1>
        <p className="text-sm text-muted-foreground">
          {state?.message ?? "กำลังยืนยันอีเมล..."}
        </p>
        {state?.ok && (
          <a
            href="/login"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            เข้าสู่ระบบ
          </a>
        )}
        <form ref={formRef} action={dispatch} className="hidden">
          <input type="hidden" name="token" value={token} />
        </form>
      </section>
    </PublicShell>
  );
}
