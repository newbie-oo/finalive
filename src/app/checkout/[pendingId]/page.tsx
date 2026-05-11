import { Shield, Sparkle, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { InlineSlipUpload } from "@/components/checkout/inline-slip-upload";
import { CheckoutShell } from "@/components/layouts/checkout-shell";
import { ReferenceCodeBlock } from "@/components/checkout/reference-code-block";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/server/auth-session";
import { resolveCheckout } from "@/server/presenters/checkout";
import { formatTHB } from "@/lib/format";
import { PaymentMethodTabs } from "@/components/checkout/payment-method-tabs";
import { SlipPendingPoll } from "@/components/checkout/slip-pending-poll";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
	params,
}: {
	params: Promise<{ pendingId: string }>;
}) {
	const { pendingId } = await params;
	const { user } = await requireSession();
	const vm = await resolveCheckout(pendingId, user.id);

	return (
		<CheckoutShell step={0}>
			<div className="mx-auto max-w-[560px]">
				<div className="mt-8 space-y-4">
					<Card className="p-6">
						<h2 className="text-h4 mb-4">สรุปการสั่งซื้อ</h2>
						<div className="flex gap-3.5 pb-4 mb-4 border-b border-border">
							<div className="h-16 w-24 shrink-0 overflow-hidden rounded-button bg-primary/10"></div>
							<div className="flex-1 min-w-0">
								<div className="text-ui font-semibold text-foreground mb-1">
									{vm.pending.courseTitle}
								</div>
							</div>
						</div>
						<div className="flex justify-between mb-2 text-sm">
							<span className="text-muted-foreground">ราคาคอร์ส</span>
							<span className="num font-semibold text-foreground">
								{formatTHB(vm.pending.amount)}
							</span>
						</div>
						<div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
							<span className="text-ui font-semibold text-foreground">
								รวมทั้งสิ้น
							</span>
							<span className="num text-2xl font-bold text-primary">
								{formatTHB(vm.pending.amount)}
							</span>
						</div>
					</Card>

					<div className="space-y-3">
						<h2 className="text-h4">วิธีชำระเงิน</h2>
						<PaymentMethodTabs
							bankText={vm.bankText}
							qrImageUrl={vm.qrImageUrl}
						/>
					</div>

					<ReferenceCodeBlock
						value={vm.pending.refCode}
						helper="โอนเงินแล้วระบุเลขนี้ในหมายเหตุการโอน"
					/>

					{vm.rejectedSlip && (
						<Card className="flex items-start gap-3 border-destructive bg-destructive-bg">
							<WarningIcon
								size={24}
								weight="fill"
								className="text-destructive shrink-0"
							/>
							<div className="flex-1 text-body text-destructive-foreground">
								<p className="font-medium">สลิปก่อนหน้าถูกปฏิเสธ</p>
								<p className="mt-1 text-uism">
									เหตุผล: {vm.rejectedSlip.reasonLabel}
									{vm.rejectedSlip.note ? ` — ${vm.rejectedSlip.note}` : ""}
								</p>
								<p className="mt-1 text-uism">
									กรุณาอัปโหลดสลิปใหม่ตามเลขอ้างอิงด้านบน
								</p>
							</div>
						</Card>
					)}

					{vm.alreadySubmitted ? (
						<SlipPendingPoll
							pendingId={vm.pending.id}
							fallbackCourseSlug={vm.pending.courseSlug}
						/>
					) : (
						<InlineSlipUpload pendingId={vm.pending.id} />
					)}

					<p className="flex items-center justify-center gap-1.5 text-center text-caption text-foreground-subtle">
						<Shield size={14} className="text-success" />
						ข้อมูลของคุณปลอดภัย · เข้ารหัส SSL 256-bit
					</p>

					<div className="flex items-start gap-3 rounded-card bg-muted p-4">
						<Sparkle size={18} className="mt-0.5 shrink-0 text-primary" />
						<div>
							<div className="text-ui font-semibold text-foreground mb-0.5">
								ขั้นตอนต่อไป
							</div>
							<p className="text-uism text-muted-foreground">
								เมื่อคุณยืนยันการชำระ ทีมงานจะตรวจสอบสลิปภายใน 1-2 ชม.
								และส่งอีเมลแจ้งเปิดคอร์สให้คุณทันที
							</p>
						</div>
					</div>
				</div>
			</div>
		</CheckoutShell>
	);
}
