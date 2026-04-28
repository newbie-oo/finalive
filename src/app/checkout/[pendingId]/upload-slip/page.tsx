import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { CheckoutShell } from "@/components/layouts/checkout-shell";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/server/auth-session";
import { getCheckoutPending } from "@/server/repos/checkout";
import { isSubmitted } from "@/server/services/pending-fsm";
import { SlipUploadForm } from "@/components/checkout/slip-upload-form";

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
      <div className="mx-auto max-w-[640px]">
        <Link
          href={`/checkout/${pending.id}`}
          className="inline-flex items-center gap-1 text-uism text-(--foreground-muted) hover:text-(--foreground)"
        >
          <CaretLeft size={14} /> กลับไปหน้าชำระเงิน
        </Link>
        <h1 className="mt-2 text-h1">อัปโหลดสลิป</h1>
        <p className="mt-1 text-uism text-(--foreground-muted)">
          เลขอ้างอิง <span className="mono">{pending.refCode}</span>
        </p>

        {alreadySubmitted ? (
          <Card className="mt-6 flex items-start gap-3 border-success bg-success-bg">
            <CheckCircle size={24} weight="fill" className="text-success shrink-0" />
            <div className="text-body text-success-foreground">
              <p className="font-medium">ส่งสลิปแล้ว</p>
              <p className="mt-1 text-uism">รอ admin ตรวจสอบ — เราจะแจ้งผลทางอีเมลเมื่อพร้อม</p>
            </div>
          </Card>
        ) : (
          <Card className="mt-6">
            <SlipUploadForm pendingId={pending.id} amount={pending.amount} />
          </Card>
        )}
      </div>
    </CheckoutShell>
  );
}
