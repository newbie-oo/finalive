import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/layouts/public-shell";
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
    <PublicShell>
      <section className="mx-auto max-w-md p-8">
        <p className="text-xs text-muted-foreground">
          <Link href={`/checkout/${pending.id}`} className="hover:underline">
            ← กลับไปหน้าชำระเงิน
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold">อัปโหลดสลิป</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          เลขอ้างอิง <span className="font-mono">{pending.refCode}</span>
        </p>

        {alreadySubmitted ? (
          <div className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm">
            ส่งสลิปแล้ว — รอ admin ตรวจสอบ
          </div>
        ) : (
          <div className="mt-6">
            <SlipUploadForm pendingId={pending.id} amount={pending.amount} />
          </div>
        )}
      </section>
    </PublicShell>
  );
}
