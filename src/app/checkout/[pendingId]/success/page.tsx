import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle,
  Clock,
  ArrowRight,
  ListBullets,
} from "@phosphor-icons/react/dist/ssr";
import { CheckoutShell } from "@/components/layouts/checkout-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/server/auth-session";
import { getCheckoutPending } from "@/server/repos/checkout";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ pendingId: string }>;
}) {
  const { pendingId } = await params;
  const { user } = await requireSession();
  const pending = await getCheckoutPending(pendingId, user.id);
  if (!pending) notFound();

  return (
    <CheckoutShell step={1}>
      <div className="mx-auto max-w-[560px] mt-8 space-y-6">
        <Card className="p-8 text-center space-y-4">
          <CheckCircle
            size={64}
            weight="fill"
            className="mx-auto text-(--success)"
          />
          <h1 className="text-h2">ส่งสลิปสำเร็จ</h1>
          <p className="text-body text-(--foreground-muted)">
            เราได้รับสลิปการโอนของคุณแล้ว
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-(--warning-bg) px-4 py-2 text-uism text-(--warning)">
            <Clock size={16} />
            รอตรวจสอบ 1-2 ชั่วโมง
          </div>
        </Card>

        <div className="rounded-card border border-(--border) bg-(--surface-muted) p-5 space-y-3">
          <h2 className="text-h4">ขั้นตอนต่อไป</h2>
          <ol className="space-y-2 text-body text-(--foreground-muted)">
            <li className="flex gap-2">
              <span className="num text-(--primary) font-bold">1.</span>
              ทีมงานตรวจสอบสลิปภายใน 1-2 ชม.
            </li>
            <li className="flex gap-2">
              <span className="num text-(--primary) font-bold">2.</span>
              คุณจะได้รับอีเมลแจ้งผลอนุมัติ
            </li>
            <li className="flex gap-2">
              <span className="num text-(--primary) font-bold">3.</span>
              เข้าเรียนได้ทันทีผ่าน &quot;คอร์สของฉัน&quot;
            </li>
          </ol>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="primary" size="lg" className="w-full">
            <Link href="/account/enrollments">
              <ListBullets size={16} weight="bold" /> ดูคอร์สของฉัน
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link href="/courses">
              ค้นหาคอร์สเพิ่ม <ArrowRight size={16} />
            </Link>
          </Button>
        </div>

        <p className="text-center text-caption text-(--foreground-subtle)">
          เลขอ้างอิน:{" "}
          <span className="mono font-semibold">{pending.refCode}</span>
        </p>
      </div>
    </CheckoutShell>
  );
}
