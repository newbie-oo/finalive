import Link from "next/link";
import {
	CheckCircle,
	Clock,
	ArrowRight,
	ListBullets,
} from "@phosphor-icons/react/dist/ssr";
import { CheckoutShell } from "@/components/layouts/checkout-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfettiBurst } from "@/components/ui/confetti-burst";
import { requireSession } from "@/server/auth-session";
import { resolveCheckoutPending } from "@/server/presenters/checkout";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
	params,
}: {
	params: Promise<{ pendingId: string }>;
}) {
	const { pendingId } = await params;
	const { user } = await requireSession();
	const vm = await resolveCheckoutPending(pendingId, user.id, user.email);

	return (
		<CheckoutShell step={3}>
			<div className="mx-auto max-w-[560px] mt-8 space-y-6">
				<Card className="relative overflow-hidden p-8 text-center space-y-4">
					<ConfettiBurst pieces={28} />
					<CheckCircle
						size={64}
						weight="fill"
						className="relative mx-auto text-success"
					/>
					<h1 className="relative text-h2">ส่งสลิปสำเร็จ</h1>
					<p className="text-body text-muted-foreground">
						เราได้รับสลิปการโอนของคุณแล้ว
					</p>
					<div className="inline-flex items-center gap-2 rounded-full bg-warning-bg px-4 py-2 text-uism text-warning">
						<Clock size={16} />
						รอตรวจสอบ 1-2 ชั่วโมง
					</div>
				</Card>

				<div className="rounded-card border border-border bg-muted p-5 space-y-3">
					<h2 className="text-h4">ขั้นตอนต่อไป</h2>
					<ol className="space-y-2 text-body text-muted-foreground">
						<li className="flex gap-2">
							<span className="num text-primary font-bold">1.</span>
							ทีมงานตรวจสอบสลิปภายใน 1-2 ชม.
						</li>
						<li className="flex gap-2">
							<span className="num text-primary font-bold">2.</span>
							คุณจะได้รับอีเมลแจ้งผลอนุมัติ
						</li>
						<li className="flex gap-2">
							<span className="num text-primary font-bold">3.</span>
							เข้าเรียนได้ทันทีผ่าน &quot;คอร์สของฉัน&quot;
						</li>
					</ol>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button
						asChild
						variant="primary"
						size="lg"
						className="w-full sm:w-auto sm:flex-1"
					>
						<Link
							href="/account/enrollments"
							className="flex items-center justify-center gap-2"
						>
							<ListBullets size={16} weight="bold" /> ดูคอร์สของฉัน
						</Link>
					</Button>
					<Button
						asChild
						variant="secondary"
						size="lg"
						className="w-full sm:w-auto sm:flex-1"
					>
						<Link
							href="/courses"
							className="flex items-center justify-center gap-2"
						>
							ค้นหาคอร์สเพิ่ม <ArrowRight size={16} />
						</Link>
					</Button>
				</div>

				<p className="text-center text-caption text-foreground-subtle">
					เลขอ้างอิง:{" "}
					<span className="mono font-semibold">{vm.pending.refCode}</span>
				</p>
			</div>
		</CheckoutShell>
	);
}
