import Link from "next/link";
import { notFound } from "next/navigation";
import {
	Clock,
	Check,
	EnvelopeSimple,
	House,
	ArrowRight,
	CaretRight,
} from "@phosphor-icons/react/dist/ssr";
import { CheckoutShell } from "@/components/layouts/checkout-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/server/auth-session";
import { getCheckoutPending } from "@/server/repos/checkout";
import { formatTHB } from "@/lib/format";

export const dynamic = "force-dynamic";

const PENDING_STEPS = [
	{ label: "ข้อมูล" },
	{ label: "ชำระเงิน" },
	{ label: "รอตรวจสอบ" },
];

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
	const pending = await getCheckoutPending(pendingId, user.id);
	if (!pending) notFound();

	return (
		<CheckoutShell step={2} steps={PENDING_STEPS}>
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
				{/* Hero status card */}
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
							{/* Pulsing rings */}
							<div className="fa-pulse-ring absolute h-24 w-24 rounded-full bg-(--warning)/15" />
							<div className="fa-pulse-ring fa-pulse-ring-delay absolute h-24 w-24 rounded-full bg-(--warning)/15" />
							<div className="relative z-[2] flex h-[72px] w-[72px] items-center justify-center rounded-full bg-(--warning) text-white shadow-[0_8px_24px_rgba(245,158,11,0.3)]">
								<Clock size={32} weight="fill" />
							</div>
						</div>
						<div className="mb-2 text-uism font-semibold uppercase tracking-[0.08em] text-(--warning)">
							กำลังตรวจสอบ
						</div>
						<h1 className="text-h2 mb-3 text-(--foreground)">
							เราได้รับสลิปของคุณแล้ว
						</h1>
						<p className="text-body text-(--foreground-muted) mx-auto max-w-[440px] text-pretty">
							ทีมงานกำลังตรวจสอบการชำระเงิน — โดยปกติใช้เวม{" "}
							<strong className="text-(--foreground)">1-2 ชั่วโมง</strong>{" "}
							เราจะส่งอีเมลแจ้งเมื่อเปิดสิทธิ์เรียบร้อย
						</p>
					</div>
				</Card>

				{/* Order ref + amount strip */}
				<Card className="mt-6 overflow-hidden p-0">
					<div className="grid grid-cols-3">
						<div className="border-r border-(--border) px-6 py-5">
							<div className="text-caption mb-1.5 text-(--foreground-muted)">
								เลขอ้างอิง
							</div>
							<div className="mono text-ui font-semibold tracking-[0.02em] text-(--foreground)">
								{pending.refCode}
							</div>
						</div>
						<div className="border-r border-(--border) px-6 py-5">
							<div className="text-caption mb-1.5 text-(--foreground-muted)">
								ยอดชำระ
							</div>
							<div className="num text-[22px] font-bold text-(--primary)">
								{formatTHB(pending.amount)}
							</div>
						</div>
						<div className="px-6 py-5">
							<div className="text-caption mb-1.5 text-(--foreground-muted)">
								ส่งสลิปเมื่อ
							</div>
							<div className="num text-ui font-semibold text-(--foreground)">
								{fmtDateTime(pending.updatedAt)}
							</div>
						</div>
					</div>
				</Card>

				{/* Timeline */}
				<Card className="mt-6 p-7">
					<div className="text-ui mb-6 font-semibold text-(--foreground)">
						สถานะการตรวจสอบ
					</div>
					<div className="relative">
						{/* vertical rail */}
						<div className="absolute bottom-3.5 left-3.5 top-3.5 w-0.5 bg-(--border)" />
						<TimelineItem
							state="done"
							title="ส่งสลิปเรียบร้อย"
							desc={`เราได้รับไฟล์สลิปของคุณ`}
							time={fmtDateTime(pending.updatedAt)}
							isLast={false}
						/>
						<TimelineItem
							state="active"
							title="กำลังตรวจสอบ"
							desc="ทีมงานกำลังเทียบยอดและเลขอ้างอิง"
							time="ขณะนี้"
							isLast={false}
						/>
						<TimelineItem
							state="future"
							title="ยืนยันการชำระ"
							desc="เมื่อตรวจสอบเสร็จ คุณจะได้รับอีเมลแจ้ง"
							time="ภายใน 1-2 ชม."
							isLast={false}
						/>
						<TimelineItem
							state="future"
							title="เปิดสิทธิ์เรียน"
							desc="เริ่มเรียนได้ทันทีจาก Dashboard"
							time=""
							isLast={true}
						/>
					</div>
				</Card>

				{/* Email confirmation note */}
				<div className="mt-6 flex items-center gap-3.5 rounded-[12px] border border-(--primary)/15 bg-(--primary)/5 p-4">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-(--surface) text-(--primary)">
						<EnvelopeSimple size={18} weight="fill" />
					</div>
					<div className="flex-1 min-w-0">
						<div className="text-ui font-semibold text-(--foreground)">
							ส่งการแจ้งเตือนไปยัง{" "}
							<span className="mono text-uism font-medium">{user.email}</span>
						</div>
						<div className="text-uism text-(--foreground-muted)">
							เปลี่ยนอีเมลแจ้งเตือน หรือเพิ่มเบอร์มือถือ?
						</div>
					</div>
					<Button variant="ghost" size="sm" className="shrink-0">
						แก้ไข
					</Button>
				</div>

				{/* Actions */}
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

				{/* FAQ */}
				<Card className="mt-8 p-6">
					<div className="text-ui mb-4 font-semibold text-(--foreground)">
						คำถามที่พบบ่อย
					</div>
					<div className="flex flex-col gap-3">
						<details className="border-b border-(--border) pb-3">
							<summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-(--foreground)">
								ตรวจสอบสลิปนานแค่ไหน?
								<CaretRight
									size={16}
									className="text-(--foreground-subtle) shrink-0"
								/>
							</summary>
							<p className="text-uism text-(--foreground-muted) pt-2 text-pretty">
								โดยปกติภายใน 1-2 ชั่วโมงในเวลาทำการ (9:00-22:00)
								นอกเวลาดังกล่าวอาจช้ากว่าปกติ
							</p>
						</details>
						<details className="border-b border-(--border) pb-3">
							<summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-(--foreground)">
								ถ้าโอนผิดยอดทำอย่างไร?
								<CaretRight
									size={16}
									className="text-(--foreground-subtle) shrink-0"
								/>
							</summary>
							<p className="text-uism text-(--foreground-muted) pt-2 text-pretty">
								ทีมงานจะติดต่อกลับทางอีเมลพร้อมรายละเอียดการแก้ไขภายใน 24 ชม.
							</p>
						</details>
						<details>
							<summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-(--foreground)">
								ขอใบเสร็จได้ไหม?
								<CaretRight
									size={16}
									className="text-(--foreground-subtle) shrink-0"
								/>
							</summary>
							<p className="text-uism text-(--foreground-muted) pt-2 text-pretty">
								ได้ — ใบเสร็จและใบกำกับภาษีจะส่งทางอีเมลพร้อมการเปิดสิทธิ์เรียน
							</p>
						</details>
					</div>
				</Card>

				{/* Support footer */}
				<p className="mt-6 text-center text-caption text-(--foreground-subtle)">
					มีปัญหา? ติดต่อเราที่{" "}
					<a
						href="mailto:support@finalive.co"
						className="font-medium text-(--primary)"
					>
						support@finalive.co
					</a>{" "}
					หรือ Line: @finalive
				</p>
			</div>
		</CheckoutShell>
	);
}

function TimelineItem({
	state,
	title,
	desc,
	time,
	isLast,
}: {
	state: "done" | "active" | "future";
	title: string;
	desc: string;
	time: string;
	isLast: boolean;
}) {
	return (
		<div className={`relative flex gap-4 ${isLast ? "" : "pb-6"}`}>
			<div
				className={`relative z-[2] flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
					state === "done"
						? "bg-(--success) text-white"
						: state === "active"
							? "bg-(--warning) text-white shadow-[0_0_0_4px_rgba(245,158,11,0.18)]"
							: "border-2 border-(--border) bg-(--surface)"
				}`}
			>
				{state === "done" && <Check weight="bold" className="h-3.5 w-3.5" />}
				{state === "active" && (
					<div className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
				)}
			</div>
			<div className="flex-1 pt-0.5">
				<div className="mb-0.5 flex items-baseline justify-between gap-3">
					<div
						className={`text-ui font-semibold ${
							state === "future"
								? "text-(--foreground-subtle)"
								: "text-(--foreground)"
						}`}
					>
						{title}
					</div>
					{time && (
						<div className="text-caption num shrink-0 text-(--foreground-muted)">
							{time}
						</div>
					)}
				</div>
				<div
					className={`text-uism ${
						state === "future"
							? "text-(--foreground-subtle)"
							: "text-(--foreground-muted)"
					}`}
				>
					{desc}
				</div>
			</div>
		</div>
	);
}
