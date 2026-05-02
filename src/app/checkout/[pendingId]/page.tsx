import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft, WarningCircle } from "@phosphor-icons/react/dist/ssr";
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
			<div className="mx-auto max-w-[640px]">
				<Link
					href={`/courses/${pending.courseSlug}`}
					className="inline-flex items-center gap-1 text-uism text-(--foreground-muted) hover:text-(--foreground)"
				>
					<CaretLeft size={14} /> {pending.courseTitle}
				</Link>
				<h1 className="mt-2 text-h1">ชำระเงิน</h1>

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
					<div className="mt-8 space-y-5">
						<Card className="space-y-3">
							<h2 className="text-h4">สรุปการสั่งซื้อ</h2>
							<Row label="คอร์ส" value={pending.courseTitle} />
							<Row
								label="ยอดที่ต้องโอน"
								value={
									<span className="num text-h2 font-semibold text-success">
										{formatTHB(pending.amount)}
									</span>
								}
							/>
							<div className="flex items-center justify-between gap-3">
								<span className="text-uism text-(--foreground-muted)">
									เลขอ้างอิง
								</span>
								<RefCodeCopy refCode={pending.refCode} />
							</div>
							<Row
								label="เหลือเวลา"
								value={<CountdownTimer expiresAt={pending.expiresAt} />}
							/>
						</Card>

						<Card className="space-y-4">
							<h2 className="text-h4">โอนเข้าบัญชี</h2>
							<p className="text-body text-(--foreground-muted)">
								{bank ? bank.text : "กรุณาติดต่อ admin สำหรับข้อมูลบัญชี"}
							</p>
							<div className="flex flex-col items-center gap-3">
								{qrImageUrl ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										src={qrImageUrl}
										width={224}
										height={224}
										alt="PromptPay QR สำหรับโอนค่าคอร์ส"
										className="h-56 w-56 rounded-card border border-(--border) bg-white object-contain p-2"
									/>
								) : (
									<div
										role="img"
										aria-label="ยังไม่ได้ตั้งค่า QR — โอนผ่านเลขบัญชีด้านบน"
										className="flex h-40 w-40 items-center justify-center rounded-card border border-dashed border-(--border) bg-(--surface-muted) px-3 text-center text-caption text-(--foreground-muted)"
									>
										QR ยังไม่พร้อม — โอนตามเลขบัญชีด้านบน
									</div>
								)}
								<p className="text-uism text-(--foreground-muted)">
									โอนยอด{" "}
									<span className="num">{formatTHB(pending.amount)}</span>{" "}
									แล้วกดปุ่มอัปโหลดสลิปด้านล่าง
								</p>
							</div>
						</Card>

						<Button asChild variant="accent" size="lg" className="w-full">
							<Link href={`/checkout/${pending.id}/upload-slip`}>
								อัปโหลดสลิป
							</Link>
						</Button>
						<p className="text-center text-caption text-(--foreground-subtle)">
							กรุณาโอนภายในเวลาที่กำหนด จากนั้นกด &ldquo;อัปโหลดสลิป&rdquo;
						</p>
					</div>
				)}
			</div>
		</CheckoutShell>
	);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<span className="text-uism text-(--foreground-muted)">{label}</span>
			<span className="text-ui font-medium text-(--foreground)">{value}</span>
		</div>
	);
}
