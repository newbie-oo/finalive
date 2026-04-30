import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft, Info } from "@phosphor-icons/react/dist/ssr";
import { CheckoutShell } from "@/components/layouts/checkout-shell";
import { Card } from "@/components/ui/card";
import { CountdownTimer } from "@/components/checkout/countdown-timer";
import { SlipUploadForm } from "@/components/checkout/slip-upload-form";
import { SlipPendingPoll } from "@/components/checkout/slip-pending-poll";
import { requireSession } from "@/server/auth-session";
import { getCheckoutPending } from "@/server/repos/checkout";
import { isSubmitted } from "@/server/services/pending-fsm";
import { formatTHB } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function UploadSlipPage({
  params,
}: {
  params: Promise<{ pendingId: string }>;
}) {
  const { pendingId } = await params;
  const { user } = await requireSession();
  const pending = await getCheckoutPending(pendingId, user.id);
  if (!pending) notFound();

  const alreadySubmitted = isSubmitted(pending.status);

  return (
    <CheckoutShell step={2}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <div>
            <Link
              href={`/checkout/${pending.id}`}
              className="inline-flex items-center gap-1 text-uism text-(--foreground-muted) hover:text-(--foreground)"
            >
              <CaretLeft size={14} /> กลับไปหน้าชำระเงิน
            </Link>
            <h1 className="mt-2 text-h1">อัปโหลดสลิป</h1>
            <p className="mt-1 text-body text-(--foreground-muted)">
              อัปโหลดสลิปการโอนเงิน เราจะตรวจสอบและเปิดให้คุณเริ่มเรียนได้ทันทีเมื่ออนุมัติ
            </p>
          </div>

          {alreadySubmitted ? (
            <SlipPendingPoll
              pendingId={pending.id}
              fallbackCourseSlug={pending.courseSlug}
            />
          ) : (
            <Card>
              <SlipUploadForm pendingId={pending.id} />
            </Card>
          )}

          <Card className="bg-(--surface-muted)/40">
            <div className="flex items-start gap-3">
              <Info size={20} weight="duotone" className="text-(--primary) shrink-0" />
              <div className="space-y-1.5 text-uism text-(--foreground-muted)">
                <p className="font-medium text-(--foreground)">หลังส่งสลิป</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>admin ใช้เวลาตรวจสอบประมาณ 1–2 ชั่วโมง (ในเวลาทำการ)</li>
                  <li>เมื่ออนุมัติแล้วระบบจะพาคุณไปหน้าคอร์สโดยอัตโนมัติ ไม่ต้องรีเฟรช</li>
                  <li>คุณจะได้รับอีเมลยืนยันการชำระเงินด้วย</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-32">
          <Card>
            <div className="space-y-4">
              <div>
                <p className="text-uism text-(--foreground-subtle)">คอร์ส</p>
                <p className="mt-1 text-body font-medium text-(--foreground)">
                  {pending.courseTitle}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-uism text-(--foreground-subtle)">ยอดที่ต้องโอน</p>
                  <p className="mt-1 text-h4 num font-semibold text-(--foreground)">
                    {formatTHB(pending.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-uism text-(--foreground-subtle)">เลขอ้างอิง</p>
                  <p className="mono mt-1 text-uism font-medium text-(--foreground)">
                    {pending.refCode}
                  </p>
                </div>
              </div>
              <div className="border-t border-(--border) pt-3">
                <p className="text-uism text-(--foreground-subtle)">หมดอายุใน</p>
                <div className="mt-1 text-uism text-(--foreground)">
                  <CountdownTimer expiresAt={pending.expiresAt} />
                </div>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </CheckoutShell>
  );
}
