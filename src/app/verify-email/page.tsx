"use client";

import Link from "next/link";
import { Suspense, useActionState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, CircleNotch } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import { PublicShellClient as PublicShell } from "@/components/layouts/public-shell-client";
import { AuthCard } from "@/components/layouts/auth-card";
import { Button } from "@/components/ui/button";

async function verifyAction(_prev: unknown, formData: FormData) {
  const token = formData.get("token") as string | null;
  if (!token)
    return { ok: false, message: "ลิงก์ยืนยันไม่ถูกต้อง กรุณาขอลิงก์ใหม่" };
  const result = await authClient.verifyEmail({ query: { token } });
  if (result.error) {
    return {
      ok: false,
      message: "ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่",
    };
  }
  return { ok: true, message: "ยืนยันอีเมลสำเร็จ กรุณาเข้าสู่ระบบ" };
}

export const dynamic = "force-dynamic";

export default function VerifyEmailPage() {
  return (
    <PublicShell>
      <Suspense fallback={null}>
        <VerifyEmailInner />
      </Suspense>
    </PublicShell>
  );
}

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, dispatch] = useActionState(verifyAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (token && formRef.current) formRef.current.requestSubmit();
  }, [token]);

  const heading = state?.ok
    ? "ยืนยันสำเร็จ"
    : state
      ? "ไม่สามารถยืนยันได้"
      : "กำลังยืนยัน";

  const failed = state !== null && !state.ok;

  return (
    <AuthCard title={heading}>
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        {!state && (
          <CircleNotch
            size={48}
            weight="bold"
            className="animate-spin text-primary"
          />
        )}
        {state?.ok && (
          <CheckCircle size={56} weight="fill" className="text-success" />
        )}
        {failed && (
          <XCircle size={56} weight="fill" className="text-destructive" />
        )}
        <p className="text-body text-muted-foreground">
          {state?.message ?? "กำลังยืนยันอีเมล..."}
        </p>
        {state?.ok && (
          <Button asChild variant="primary" size="lg" className="w-full">
            <Link href="/login">เข้าสู่ระบบ</Link>
          </Button>
        )}
        {failed && (
          <div className="flex w-full flex-col gap-2.5">
            <Button asChild variant="primary" size="lg" className="w-full">
              <Link href="/login">ไปหน้าเข้าสู่ระบบ</Link>
            </Button>
            <p className="text-uism text-muted-foreground">
              หากยังเข้าระบบไม่ได้{" "}
              <a
                href="mailto:support@finalive.co"
                className="text-primary hover:underline"
              >
                ติดต่อทีมงาน
              </a>
            </p>
          </div>
        )}
      </div>
      <form ref={formRef} action={dispatch} className="hidden">
        <input type="hidden" name="token" value={token} />
      </form>
    </AuthCard>
  );
}
