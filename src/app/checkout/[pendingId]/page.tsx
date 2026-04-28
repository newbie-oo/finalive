import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/layouts/public-shell";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/server/auth-session";
import { getCheckoutPending } from "@/server/repos/checkout";
import { getBankDisplay, getPromptPayQrImageUrl } from "@/server/repos/app-setting";
import { formatTHB } from "@/lib/format";
import { isExpired } from "@/server/services/pending-fsm";
import { CountdownTimer } from "@/components/checkout/countdown-timer";

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
  const [bank, qrImageUrl] = await Promise.all([
    getBankDisplay(),
    getPromptPayQrImageUrl(),
  ]);

  return (
    <PublicShell>
      <section className="mx-auto max-w-md p-4 sm:p-8">
        <p className="text-xs text-muted-foreground">
          <Link href={`/courses/${pending.courseSlug}`} className="hover:underline">
            ← {pending.courseTitle}
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold">ชำระเงิน</h1>

        {expired ? (
          <div className="mt-6 space-y-4">
            <div
              role="alert"
              className="rounded border border-destructive bg-destructive/10 p-4 text-sm text-destructive"
            >
              การชำระเงินหมดอายุแล้ว — เลขอ้างอิง{" "}
              <span className="font-mono">{pending.refCode}</span>{" "}
              ไม่สามารถใช้ได้ ต้องเริ่มชำระเงินใหม่
            </div>
            <form action="/checkout/start" method="post">
              <input type="hidden" name="courseSlug" value={pending.courseSlug} />
              <Button type="submit" className="w-full">
                เริ่มชำระเงินใหม่
              </Button>
            </form>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/courses/${pending.courseSlug}`}>กลับไปหน้าคอร์ส</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Summary card */}
            <div className="rounded-lg border border-border bg-card p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">คอร์ส</span>
                <span className="font-medium">{pending.courseTitle}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">ยอดที่ต้องโอน</span>
                <span className="text-lg font-semibold">{formatTHB(pending.amount)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">เลขอ้างอิง</span>
                <span className="font-mono text-sm">{pending.refCode}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-muted-foreground">เหลือเวลา</span>
                <CountdownTimer expiresAt={pending.expiresAt} />
              </div>
            </div>

            {/* Bank info */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-medium">โอนเข้าบัญชี</h2>
              {bank ? (
                <p className="mt-1 text-sm text-muted-foreground">{bank.text}</p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  กรุณาติดต่อ admin สำหรับข้อมูลบัญชี
                </p>
              )}
              <div className="mt-3 flex flex-col items-center gap-2">
                {qrImageUrl ? (
                  // QR image is uploaded by an admin in app_setting:
                  // promptpay_qr_image_url. We render it as-is — no QR
                  // generation in app code; the payer enters the amount
                  // manually from the summary above.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrImageUrl}
                    width={224}
                    height={224}
                    alt="PromptPay QR สำหรับโอนค่าคอร์ส"
                    className="h-56 w-56 rounded-lg border border-border bg-white object-contain p-2"
                  />
                ) : (
                  <div
                    className="flex h-40 w-40 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/40 text-center"
                    role="img"
                    aria-label="ยังไม่ได้ตั้งค่า QR — โอนผ่านเลขบัญชีด้านบน"
                  >
                    <span className="px-2 text-xs text-muted-foreground">
                      QR ยังไม่พร้อม — โอนตามเลขบัญชีด้านบน
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  โอนยอด {formatTHB(pending.amount)} แล้วกดปุ่มอัปโหลดสลิปด้านล่าง
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href={`/checkout/${pending.id}/upload-slip`}>อัปโหลดสลิป</Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                กรุณาโอนภายในเวลาที่กำหนด จากนั้นกด &ldquo;อัปโหลดสลิป&rdquo;
              </p>
            </div>
          </div>
        )}
      </section>
    </PublicShell>
  );
}
