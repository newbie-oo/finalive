import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/layouts/public-shell";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/server/auth-session";
import { getCheckoutPending } from "@/server/repos/checkout";
import { formatTHB } from "@/lib/format";
import { isExpired } from "@/server/services/pending-fsm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ pendingId: string }>;
}) {
  const { pendingId } = await params;
  const { user } = await requireSession();
  const pending = await getCheckoutPending(pendingId, user.id);
  if (!pending) notFound();
  const expired = isExpired(pending.expiresAt);

  return (
    <PublicShell>
      <section className="mx-auto max-w-md p-8">
        <p className="text-xs text-muted-foreground">
          <Link href={`/courses/${pending.courseSlug}`} className="hover:underline">
            ← {pending.courseTitle}
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold">ชำระเงิน</h1>

        {expired ? (
          <p className="mt-4 rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            การชำระเงินหมดอายุแล้ว กรุณาเริ่มใหม่
          </p>
        ) : (
          <>
            <div className="mt-4 space-y-2 rounded border border-border bg-card p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">คอร์ส</span>
                <span className="font-medium">{pending.courseTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ยอดที่ต้องโอน</span>
                <span className="font-medium">{formatTHB(pending.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">เลขอ้างอิง</span>
                <span className="font-mono">{pending.refCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">หมดอายุ</span>
                <span>
                  {pending.expiresAt.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              โอนเข้าบัญชีที่ admin ตั้งค่าไว้ในระบบ จากนั้นอัปสลิปด้านล่าง
            </p>

            <Button asChild className="mt-4">
              <Link href={`/checkout/${pending.id}/upload-slip`}>อัปโหลดสลิป</Link>
            </Button>
          </>
        )}
      </section>
    </PublicShell>
  );
}
