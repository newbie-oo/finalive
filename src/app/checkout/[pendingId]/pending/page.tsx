import Link from "next/link";
import {
	Clock,
	EnvelopeSimple,
	House,
	ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { CheckoutShell } from "@/components/layouts/checkout-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/server/auth-session";
import { resolveCheckoutPending } from "@/server/presenters/checkout";
import { formatTHB } from "@/lib/format";
import { CheckoutTimeline } from "@/components/checkout/checkout-timeline";
import { CheckoutFaq } from "@/components/checkout/checkout-faq";

export const dynamic = "force-dynamic";

function fmtDateTime(d: Date) {
	const date = d.toLocaleDateString("th-TH", {
		day: "2-digit",
		month: "short",
	});
	const time = d.toLocaleTimeString("th-TH", {
		hour: "2-digit",
		minute: "2-digit",
	});
	return `${date} ${time}`;
}

export default async function CheckoutPendingPage({
	params,
}: {
	params: Promise<{ pendingId: string }>;
}) {
	const { pendingId } = await params;
	const { user } = await requireSession();
	const vm = await resolveCheckoutPending(pendingId, user.id, user.email);

	const timelineItems = [
		{
			state: "done" as const,
			title: "ส่งสลิปเรียบร้อย",
			desc: "เราได้รับไฟล์สลิปของคุณ",
			time: fmtDateTime(vm.pending.updatedAt),
		},
		{
			state: "active" as const,
			title: "กำลังตรวจสอบ",
			desc: "ทีมงานกำลังเทียบยอดและเลขอ้างอิง",
			time: "ขณะนี้",
		},
		{
			state: "future" as const,
			title: "ยืนยันการชำระ",
			desc: "เมื่อตรวจสอบเสร็จ คุณจะได้รับอีเมลแจ้ง",
			time: "ภายใน 1-2 ชม.",
		},
		{
			state: "future" as const,
			title: "เปิดสิทธิ์เรียน",
			desc: "เริ่มเรียนได้ทันทีจาก Dashboard",
			time: "",
		},
	];

	return (
		<CheckoutShell step={2}>
			<style>{`
        @keyframes fa-pulse-ring {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .fa-pulse-ring {
          animation: fa-pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .fa-pulse-ring-delay {
          animation-delay: 1s;
        }
      `}</style>
			<div className="mx-auto max-w-[560px]">
				<Card className="relative overflow-hidden p-10 text-center">
					<div
						className="pointer-events-none absolute inset-0"
						style={{
							background:
								"radial-gradient(circle at 50% 0%, rgba(245,158,11,0.08), transparent 60%)",
						}}
					/>
					<div className="relative">
						<div className="relative mx-auto mb-5 inline-flex items-center justify-center">
							<div className="fa-pulse-ring absolute h-24 w-24 rounded-full bg-warning/15" />
							<div className="fa-pulse-ring fa-pulse-ring-delay absolute h-24 w-24 rounded-full bg-warning/15" />
							<div className="relative z-[2] flex h-[72px] w-[72px] items-center justify-center rounded-full bg-warning text-white shadow-[0_8px_24px_rgba(245,158,11,0.3)]">
								<Clock size={32} weight="fill" />
							</div>
						</div>
						<div className="mb-2 text-uism font-semibold uppercase tracking-[0.08em] text-warning">
							กำลังตรวจสอบ
						</div>
						<h1 className="text-h2 mb-3 text-foreground">เราได้รับสลิปของคุณแล้ว</h1>
						<p className="text-body text-muted-foreground mx-auto max-w-[440px] text-pretty">
							ทีมงานกำลังตรวจสอบการชำระเงิน — โดยปกติใช้เวลา{" "}
							<strong className="text-foreground">1-2 ชั่วโมง</strong>{" "}
							เราจะส่งอีเมลแจ้งเมื่อเปิดสิทธิ์เรียบร้อย
						</p>
					</div>
				</Card>

				<Card className="mt-6 overflow-hidden p-0">
					<div className="grid grid-cols-3">
						<div className="border-r border-border px-6 py-5">
							<div className="text-caption mb-1.5 text-muted-foreground">
								เลขอ้างอิง
							</div>
							<div className="mono text-ui font-semibold tracking-[0.02em] text-foreground">
								{vm.pending.refCode}
							</div>
						</div>
						<div className="border-r border-border px-6 py-5">
							<div className="text-caption mb-1.5 text-muted-foreground">
								ยอดชำระ
							</div>
							<div className="num text-[22px] font-bold text-primary">
								{formatTHB(vm.pending.amount)}
							</div>
						</div>
						<div className="px-6 py-5">
							<div className="text-caption mb-1.5 text-muted-foreground">
								ส่งสลิปเมื่อ
							</div>
							<div className="num text-ui font-semibold text-foreground">
								{fmtDateTime(vm.pending.updatedAt)}
							</div>
						</div>
					</div>
				</Card>

				<Card className="mt-6 p-7">
					<div className="text-ui mb-6 font-semibold text-foreground">
						สถานะการตรวจสอบ
					</div>
					<CheckoutTimeline items={timelineItems} />
				</Card>

				<div className="mt-6 flex items-center gap-3.5 rounded-[12px] border border-primary/15 bg-primary/5 p-4">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-card text-primary">
						<EnvelopeSimple size={18} weight="fill" />
					</div>
					<div className="flex-1 min-w-0">
						<div className="text-ui font-semibold text-foreground">
							ส่งการแจ้งเตือนไปยัง{" "}
							<span className="mono text-uism font-medium">{user.email}</span>
						</div>
						<div className="text-uism text-muted-foreground">
							เปลี่ยนอีเมลแจ้งเตือน หรือเพิ่มเบอร์มือถือ?
						</div>
					</div>
					<Button variant="ghost" size="sm" className="shrink-0">
						แก้ไข
					</Button>
				</div>

				<div className="mt-8 grid grid-cols-2 gap-3">
					<Button asChild variant="secondary" size="lg" className="w-full">
						<Link href="/">
							<House size={16} />
							กลับหน้าแรก
						</Link>
					</Button>
					<Button asChild variant="primary" size="lg" className="w-full">
						<Link href="/dashboard">
							ไปหน้า Dashboard
							<ArrowRight size={16} />
						</Link>
					</Button>
				</div>

				<CheckoutFaq />

				<p className="mt-6 text-center text-caption text-foreground-subtle">
					มีปัญหา? ติดต่อเราที่{" "}
					<a
						href="mailto:support@finalive.co"
						className="font-medium text-primary"
					>
						support@finalive.co
					</a>{" "}
					หรือ Line: @finalive
				</p>
			</div>
		</CheckoutShell>
	);
}
