import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { CheckoutShell } from "@/components/layouts/checkout-shell";
import { SlipUploadForm } from "@/components/checkout/slip-upload-form";
import { SlipPendingPoll } from "@/components/checkout/slip-pending-poll";
import { requireSession } from "@/server/auth-session";
import { getCheckoutPending } from "@/server/repos/checkout";
import { isSubmitted, type PendingStatus } from "@/server/services/pending-fsm";
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

	const alreadySubmitted = isSubmitted(pending.status as PendingStatus);

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
					</div>

					{alreadySubmitted ? (
						<SlipPendingPoll
							pendingId={pending.id}
							fallbackCourseSlug={pending.courseSlug}
						/>
					) : (
						<SlipUploadForm pendingId={pending.id} />
					)}

					<div className="flex items-start gap-3 rounded-card bg-(--surface-muted)/40 p-5">
						<Sparkle
							size={20}
							weight="duotone"
							className="mt-0.5 shrink-0 text-(--primary)"
						/>
						<div className="space-y-1 text-uism text-(--foreground-muted)">
							<p className="font-medium text-(--foreground)">ขั้นตอนต่อไป</p>
							<p>
								เมื่อคุณยืนยันการชำระ ทีมงานจะตรวจสอบสลิปภายใน 1–2 ชม.
								และส่งอีเมลแจ้งเปิดคอร์สให้คุณทันที
							</p>
						</div>
					</div>
				</div>

				<aside className="lg:sticky lg:top-32">
					<div className="rounded-card border border-(--border) bg-(--background) p-6">
						<p className="mb-4 text-base font-semibold text-(--foreground)">
							สรุปการสั่งซื้อ
						</p>
						<div className="space-y-4">
							<div>
								<p className="text-uism text-(--foreground-subtle)">คอร์ส</p>
								<p className="mt-1 text-body font-medium leading-snug text-(--foreground)">
									{pending.courseTitle}
								</p>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-uism text-(--foreground-subtle)">
										ยอดที่ต้องโอน
									</p>
									<p className="num mt-1 text-[22px] font-bold leading-tight text-(--primary)">
										{formatTHB(pending.amount)}
									</p>
								</div>
								<div>
									<p className="text-uism text-(--foreground-subtle)">
										เลขอ้างอิง
									</p>
									<p className="mono mt-1 text-uism font-semibold text-(--foreground)">
										{pending.refCode}
									</p>
								</div>
							</div>
						</div>
					</div>
				</aside>
			</div>
		</CheckoutShell>
	);
}
