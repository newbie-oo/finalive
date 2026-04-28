import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/layouts/public-shell";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/server/auth-session";
import { getCheckoutPending } from "@/server/repos/checkout";

export const dynamic = "force-dynamic";

export default async function UploadSlipPage({
  params,
}: {
  params: Promise<{ pendingId: string }>;
}) {
  const { pendingId } = await params;
  const { user } = await requireSession("/login");
  const pending = await getCheckoutPending(pendingId, user.id);
  if (!pending) notFound();

  const alreadySubmitted = pending.status === "slip_submitted" || pending.status === "paid";

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
          <p className="mt-4 rounded border border-border bg-muted p-3 text-sm">
            ส่งสลิปแล้ว — รอ admin ตรวจ
          </p>
        ) : (
          <form
            action="/api/slip/upload"
            method="post"
            encType="multipart/form-data"
            className="mt-4 space-y-3"
          >
            <input type="hidden" name="pendingId" value={pending.id} />
            <label className="block text-sm">
              <span className="block text-muted-foreground">ไฟล์สลิป (PNG/JPG)</span>
              <input
                name="slip"
                type="file"
                accept="image/png,image/jpeg"
                required
                className="mt-1 w-full rounded border border-border bg-background p-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="block text-muted-foreground">
                ยอดที่โอน (THB) — ไม่บังคับ
              </span>
              <input
                name="reportedAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder={pending.amount}
                className="mt-1 w-full rounded border border-border bg-background p-2 text-sm"
              />
            </label>
            <Button type="submit">ส่งสลิป</Button>
          </form>
        )}
      </section>
    </PublicShell>
  );
}
