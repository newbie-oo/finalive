import Link from "next/link";
import { notFound } from "next/navigation";
import { WarningCircle, Shield, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { InlineSlipUpload } from "@/components/checkout/inline-slip-upload";
import { CheckoutShell } from "@/components/layouts/checkout-shell";
import { RefCodeCopy } from "./ref-code-copy";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/server/auth-session";
import { getCheckoutPending } from "@/server/repos/checkout";
import {
	getBankDisplay,
	getPromptPayQrImageUrl,
} from "@/server/repos/app-setting";
import { formatTHB } from "@/lib/format";
import { isExpired } from "@/server/services/pending-fsm";
import { CountdownTimer } from "@/components/checkout/countdown-timer";
import { PaymentMethodTabs } from "@/components/checkout/payment-method-tabs";

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
		<CheckoutShell step={1}>
			<div className="mx-auto max-w-[560px]">
				{expired ? (
					<div className="mt-8 space-y-4">
						<Card className="flex items-start gap-3 border-destructive bg-destructive-bg">
							<WarningCircle
								size={24}
								weight="fill"
								className="text-destructive shrink-0"
							/>
							<div className="flex-1 text-body text-destructive-foreground">
								<p className="font-medium">การชำระเงินหมดอายุแล้ว</p>
								<p className="mt-1 text-uism">
									เลขอ้างอิง <span className="mono">{pending.refCode}</span>{" "}
									ไม่สามารถใช้ได้ — ต้องเริ่มชำระเงินใหม่
								</p>
							</div>
						</Card>
						<form action="/checkout/start" method="post">
							<input
								type="hidden"
								name="courseSlug"
								value={pending.courseSlug}
							/>
							<Button
								type="submit"
								variant="primary"
								size="lg"
								className="w-full"
							>
								เริ่มชำระเงินใหม่
							</Button>
						</form>
						<Button asChild variant="ghost" size="lg" className="w-full">
							<Link href={`/courses/${pending.courseSlug}`}>กลับไปหน้าคอร์ส</Link>
						</Button>
					</div>
				) : (
					<div className="mt-8 space-y-4">
						{/* Order summary */}
						<Card className="p-6">
							<h2 className="text-h4 mb-4">สรุปการสั่งซื้อ</h2>
							<div className="flex gap-3.5 pb-4 mb-4 border-b border-(--border)">
								<div className="h-16 w-24 shrink-0 overflow-hidden rounded-[10px] bg-primary/10">
									{/* Course thumbnail placeholder */}
								</div>
								<div className="flex-1 min-w-0">
									<div className="text-ui font-semibold text-(--foreground) mb-1">
										{pending.courseTitle}
									</div>
								</div>
							</div>
							<div className="flex justify-between mb-2 text-sm">
								<span className="text-(--foreground-muted)">ราคาคอร์ส</span>
								<span className="num font-semibold text-(--foreground)">
									{formatTHB(pending.amount)}
								</span>
							</div>
							<div className="mt-3 flex items-baseline justify-between border-t border-(--border) pt-3">
								<span className="text-ui font-semibold text-(--foreground)">
									รวมทั้งสิ้น
								</span>
								<span className="num text-2xl font-bold text-primary">
									{formatTHB(pending.amount)}
								</span>
							</div>
						</Card>

						{/* Payment method */}
						<div className="space-y-3">
							<h2 className="text-h4">วิธีชำระเงิน</h2>
							<PaymentMethodTabs
								bankText={bank?.text ?? null}
								qrImageUrl={qrImageUrl}
							/>
						</div>

						{/* Reference code */}
						<div className="rounded-card border border-primary/20 bg-primary/5 p-5">
							<div className="mb-2 flex items-center justify-between gap-2">
								<span className="text-uism text-(--foreground-muted)">
									เลขอ้างอิง{" "}
									<span className="text-(--foreground-subtle)">
										(โอนเงินแล้วระบุในสลิป)
									</span>
								</span>
								<CountdownTimer expiresAt={pending.expiresAt} />
							</div>
							<div className="flex items-center justify-between gap-3">
								<span className="mono text-[28px] font-bold tracking-wide text-primary">
									{pending.refCode}
								</span>
								<RefCodeCopy refCode={pending.refCode} />
							</div>
						</div>

						{/* Inline slip upload */}
						<InlineSlipUpload pendingId={pending.id} />

						{/* Security */}
						<p className="flex items-center justify-center gap-1.5 text-center text-caption text-(--foreground-subtle)">
							<Shield size={14} className="text-(--success)" />
							ข้อมูลของคุณปลอดภัย · เข้ารหัส SSL 256-bit
						</p>

						{/* Next steps */}
						<div className="flex items-start gap-3 rounded-card bg-(--surface-muted) p-4">
							<Sparkle size={18} className="mt-0.5 shrink-0 text-primary" />
							<div>
								<div className="text-ui font-semibold text-(--foreground) mb-0.5">
									ขั้นตอนต่อไป
								</div>
								<p className="text-uism text-(--foreground-muted)">
									เมื่อคุณยืนยันการชำระ ทีมงานจะตรวจสอบสลิปภายใน 1-2 ชม.
									และส่งอีเมลแจ้งเปิดคอร์สให้คุณทันที
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</CheckoutShell>
	);
}
