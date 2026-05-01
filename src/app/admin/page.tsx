import Link from "next/link";
import { getAdminDashboardCounts } from "@/server/repos/admin-dashboard";
import { formatTHB } from "@/lib/format";
import { Plus, Files, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { type Icon as IconCmp } from "@phosphor-icons/react";

interface StatCardProps {
	label: string;
	/** Pre-formatted display value. Pass through formatTHB() for currency,
	 * .toLocaleString() for plain counts, etc. */
	value: string;
	href?: string;
	hint?: string;
	trend?: { value: string; positive: boolean };
}

function StatCard({ label, value, href, hint, trend }: StatCardProps) {
	const inner = (
		<div className="flex h-full flex-col gap-2 rounded-[12px] border border-(--border) bg-(--surface) p-5 transition-colors hover:border-(--primary)">
			<span className="text-caption font-semibold uppercase tracking-wide text-foreground-subtle">
				{label}
			</span>
			<span className="num text-h1 font-semibold text-(--foreground)">
				{value}
			</span>
			{trend ? (
				<span
					className={`text-uism font-medium ${trend.positive ? "text-(--success)" : "text-(--foreground-muted)"}`}
				>
					{trend.positive ? "↑" : "→"} {trend.value}
				</span>
			) : hint ? (
				<span className="text-uism text-(--foreground-muted)">{hint}</span>
			) : null}
		</div>
	);
	return href ? (
		<Link
			href={href}
			className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
		>
			{inner}
		</Link>
	) : (
		inner
	);
}

function QuickAction({
	href,
	icon: Icon,
	label,
	description,
	badge,
}: {
	href: string;
	icon: IconCmp;
	label: string;
	description: string;
	badge?: number;
}) {
	return (
		<Link
			href={href}
			className="flex items-center gap-4 rounded-[12px] border border-(--border) bg-(--surface) p-4 transition-colors hover:border-(--primary) hover:bg-(--surface-muted)"
		>
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--primary)/10 text-(--primary)">
				<Icon size={20} weight="bold" />
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="text-ui font-semibold text-(--foreground)">
						{label}
					</span>
					{badge ? (
						<span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-(--accent) px-1.5 text-[11px] font-bold text-(--accent-fg)">
							{badge}
						</span>
					) : null}
				</div>
				<p className="text-caption text-(--foreground-muted)">{description}</p>
			</div>
		</Link>
	);
}

// Thai-locale thousands separator. Stat counts are integers, currency is
// handled separately via formatTHB so the ฿ prefix renders right.
const fmtCount = (n: number) => n.toLocaleString("th-TH");

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
	const c = await getAdminDashboardCounts();
	return (
		<section className="space-y-8">
			<header>
				<h1 className="text-h1">แผงควบคุม</h1>
				<p className="mt-1 text-body text-(--foreground-muted)">
					ภาพรวมสถานะระบบและการดำเนินการล่าสุด
				</p>
			</header>

			{/* Quick actions */}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<QuickAction
					href="/admin/courses/new"
					icon={Plus}
					label="สร้างคอร์สใหม่"
					description="เพิ่มคอร์สเรียนเข้าสู่ระบบ"
				/>
				<QuickAction
					href="/admin/slips?status=submitted"
					icon={Files}
					label="ตรวจสลิป"
					description="ตรวจสอบการชำระเงิน"
					badge={c.slipsSubmitted > 0 ? c.slipsSubmitted : undefined}
				/>
				<QuickAction
					href="mailto:hello@finalive.dev"
					icon={EnvelopeSimple}
					label="ส่งอีเมล"
					description="ติดต่อทีมงาน"
				/>
			</div>

			{/* Stats grid */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					label="สลิปรอตรวจ"
					value={fmtCount(c.slipsSubmitted)}
					href="/admin/slips?status=submitted"
					trend={{ value: "รอดำเนินการ", positive: c.slipsSubmitted > 0 }}
				/>
				<StatCard
					label="อนุมัติวันนี้"
					value={fmtCount(c.slipsAcceptedToday)}
					href="/admin/slips?status=accepted"
				/>
				<StatCard
					label="ปฏิเสธวันนี้"
					value={fmtCount(c.slipsRejectedToday)}
					href="/admin/slips?status=rejected"
				/>
				<StatCard
					label="นักเรียนกำลังเรียน"
					value={fmtCount(c.enrollmentsActive)}
				/>
				<StatCard
					label="คอร์สเผยแพร่"
					value={fmtCount(c.coursesPublished)}
					href="/admin/courses"
				/>
				<StatCard
					label="รายได้เดือนนี้"
					value={formatTHB(c.revenueMtd)}
					trend={{ value: "เดือนปัจจุบัน", positive: c.revenueMtd > 0 }}
				/>
				<StatCard
					label="ใบประกาศเดือนนี้"
					value={fmtCount(c.certsMtd)}
					href="/admin/certificates"
				/>
			</div>

			<p className="text-uism text-foreground-subtle">
				ตัวเลข &quot;วันนี้&quot; นับจากเที่ยงคืนตามเวลา server (UTC)
			</p>
		</section>
	);
}
