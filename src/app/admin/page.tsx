import Link from "next/link";
import { AdminStatsRepo } from "@/server/repos/admin-stats";
import { RevenueRepo } from "@/server/repos/revenue";
import { formatMonthlyRevenue } from "@/server/services/admin-dashboard-presenter";
import { listAdminCourses } from "@/server/repos/admin-course";
import { listPendingSlips } from "@/server/repos/slip";
import { formatTHB } from "@/lib/format";
import { thaiDateString, thaiTimeString } from "@/lib/format-time";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import {
	Calendar,
	UploadSimple,
	Money,
	Users,
	Books,
	Hourglass,
	ArrowRight,
	CheckCircle,
	WarningCircle,
	Plus,
	Receipt,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const fmtCount = (n: number) => n.toLocaleString("th-TH");

interface KpiCardProps {
	icon: React.ElementType;
	iconColorClass: string;
	iconBgClass: string;
	value: string | number;
	label: string;
	trend: string;
	trendPositive?: boolean;
	href?: string;
}

function KpiCard({
	icon: Icon,
	iconColorClass,
	iconBgClass,
	value,
	label,
	trend,
	trendPositive = true,
	href,
}: KpiCardProps) {
	const content = (
		<div className="flex h-full flex-col rounded-[14px] border border-(--border) bg-(--surface) p-5 shadow-sm transition-colors hover:border-(--border-strong)">
			<div className="mb-4 flex items-start justify-between">
				<div
					className={cn(
						"flex h-10 w-10 items-center justify-center rounded-[10px]",
						iconBgClass,
					)}
				>
					<Icon size={22} weight="bold" className={iconColorClass} />
				</div>
				<span
					className={cn(
						"text-uism num font-semibold",
						trendPositive ? "text-(--success)" : "text-(--warning)",
					)}
				>
					{trend}
				</span>
			</div>
			<div className="text-h1 num mb-1 font-semibold text-(--foreground)">
				{value}
			</div>
			<div className="text-caption text-(--foreground-muted)">{label}</div>
		</div>
	);
	return href ? (
		<Link
			href={href}
			className="block focus-visible:rounded-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
		>
			{content}
		</Link>
	) : (
		content
	);
}

type StatusVariant = "success" | "warning" | "primary" | "muted";

function StatusBadge({
	variant,
	children,
}: {
	variant: StatusVariant;
	children: React.ReactNode;
}) {
	const map: Record<StatusVariant, string> = {
		success: "bg-(--success-bg) text-(--success-fg) border-(--success)/20",
		warning: "bg-(--warning-bg) text-(--warning-fg) border-(--warning)/20",
		primary: "bg-(--review-bg) text-(--review-fg) border-(--primary)/20",
		muted: "bg-(--surface-muted) text-(--foreground-muted) border-(--border)",
	};
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold",
				map[variant],
			)}
		>
			{variant === "success" && <CheckCircle size={12} weight="bold" />}
			{variant === "warning" && <WarningCircle size={12} weight="bold" />}
			{children}
		</span>
	);
}

function RevenueChart({
	data,
}: {
	data: { month: string; current: number; previous: number }[];
}) {
	const labels = data.map((d) => d.month);
	const current = data.map((d) => d.current);
	const prev = data.map((d) => d.previous);
	const maxVal = Math.max(...current, ...prev, 1) * 1.1;
	const w = 600,
		h = 220,
		padLeft = 48,
		padRight = 20,
		padTop = 20,
		padBottom = 24;
	const chartW = w - padLeft - padRight;
	const chartH = h - padTop - padBottom;
	const x = (i: number) => padLeft + (i / (labels.length - 1)) * chartW;
	const y = (v: number) => padTop + chartH - (v / maxVal) * chartH;
	const currentPoints = current.map((v, i) => [x(i), y(v)] as const);
	const prevPoints = prev.map((v, i) => [x(i), y(v)] as const);
	const areaPath =
		`M ${currentPoints[0]![0]} ${currentPoints[0]![1]} ` +
		currentPoints
			.slice(1)
			.map(([px, py]) => `L ${px} ${py}`)
			.join(" ") +
		` L ${currentPoints[currentPoints.length - 1]![0]} ${padTop + chartH} ` +
		` L ${currentPoints[0]![0]} ${padTop + chartH} Z`;
	const yLabels = [
		`฿${Math.round(maxVal / 1000)}k`,
		`฿${Math.round((maxVal * 0.75) / 1000)}k`,
		`฿${Math.round((maxVal * 0.5) / 1000)}k`,
		`฿${Math.round((maxVal * 0.25) / 1000)}k`,
		"฿0",
	];
	return (
		<svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 220 }}>
			<defs>
				<linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
					<stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
				</linearGradient>
			</defs>
			{yLabels.map((_, i) => {
				const yp = padTop + (i / (yLabels.length - 1)) * chartH;
				return (
					<line
						key={i}
						x1={padLeft}
						y1={yp}
						x2={w - padRight}
						y2={yp}
						stroke="var(--border-strong)"
						strokeWidth="0.5"
						strokeDasharray="3 3"
					/>
				);
			})}
			{yLabels.map((l, i) => (
				<text
					key={i}
					x={padLeft - 8}
					y={padTop + i * (chartH / (yLabels.length - 1)) + 4}
					textAnchor="end"
					fill="var(--foreground-subtle)"
					fontSize="10"
					fontFamily="var(--font-numeric)"
				>
					{l}
				</text>
			))}
			<polyline
				points={prevPoints.map(([px, py]) => `${px},${py}`).join(" ")}
				fill="none"
				stroke="var(--border-strong)"
				strokeWidth="2"
				strokeDasharray="5 4"
			/>
			<path d={areaPath} fill="url(#revFill)" />
			<polyline
				points={currentPoints.map(([px, py]) => `${px},${py}`).join(" ")}
				fill="none"
				stroke="var(--primary)"
				strokeWidth="2.5"
			/>
			{currentPoints.map(([px, py], i) => (
				<circle
					key={i}
					cx={px}
					cy={py}
					r="4.5"
					fill="var(--surface)"
					stroke="var(--primary)"
					strokeWidth="2"
				/>
			))}
			{(() => {
				const last = currentPoints[currentPoints.length - 1]!;
				const [tx, ty] = last;
				return (
					<g>
						<line
							x1={tx}
							y1={padTop}
							x2={tx}
							y2={padTop + chartH}
							stroke="var(--accent)"
							strokeWidth="1"
							strokeDasharray="3 3"
						/>
						<circle cx={tx} cy={ty} r="6" fill="var(--accent)" />
						<rect
							x={tx - 52}
							y={padTop - 2}
							width={104}
							height={36}
							rx={6}
							fill="var(--surface)"
							stroke="var(--border-strong)"
							strokeWidth="1"
						/>
						<text
							x={tx}
							y={padTop + 12}
							textAnchor="middle"
							fill="var(--foreground-muted)"
							fontSize="10"
							fontFamily="var(--font-numeric)"
						>
							{labels[labels.length - 1]}
						</text>
						<text
							x={tx}
							y={padTop + 26}
							textAnchor="middle"
							fill="var(--foreground)"
							fontSize="12"
							fontWeight="600"
							fontFamily="var(--font-numeric)"
						>
							{formatTHB(current[current.length - 1]!)}
						</text>
					</g>
				);
			})()}
			{labels.map((m, i) => (
				<text
					key={i}
					x={x(i)}
					y={h - 4}
					textAnchor="middle"
					fill="var(--foreground-subtle)"
					fontSize="11"
				>
					{m}
				</text>
			))}
		</svg>
	);
}

export default async function AdminDashboardPage() {
	const [counts, courses, slipsRes, revenueData] = await Promise.all([
		AdminStatsRepo.getCounts(),
		listAdminCourses({ status: "published" }),
		listPendingSlips({ status: "submitted", per_page: 5 }),
		RevenueRepo.getMonthlyRevenue().then(formatMonthlyRevenue),
	]);
	const topCourses = courses
		.filter((c) => c.enrollmentCount > 0)
		.sort((a, b) => b.enrollmentCount - a.enrollmentCount)
		.slice(0, 4)
		.map((c) => ({
			id: c.id,
			title: c.title,
			enrollmentCount: c.enrollmentCount,
			isFree: c.isFree,
			price: c.price,
		}));
	const maxEnroll = topCourses[0]?.enrollmentCount ?? 1;
	const pendingSlips = slipsRes.data;
	const nowLabel = `${thaiDateString(new Date())} · ${thaiTimeString(new Date())}`;
	return (
		<section className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-h1 font-bold text-(--foreground)">ภาพรวมธุรกิจ</h1>
					<p className="mt-1 text-body text-(--foreground-muted)">
						ข้อมูลล่าสุด · {nowLabel}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						disabled
						title="เร็วๆ นี้"
						className="inline-flex cursor-not-allowed items-center gap-2 rounded-[10px] border border-(--border) bg-(--surface-muted) px-4 py-2.5 text-ui text-(--foreground-muted) opacity-60 transition-colors"
					>
						<Calendar size={16} weight="bold" />
						30 วันล่าสุด
					</button>
					<button
						type="button"
						disabled
						title="เร็วๆ นี้"
						className="inline-flex cursor-not-allowed items-center gap-2 rounded-[10px] bg-(--primary) px-4 py-2.5 text-ui font-semibold text-(--primary-fg) opacity-60 transition-colors"
					>
						<UploadSimple size={16} weight="bold" />
						Export
					</button>
				</div>
			</div>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<Link
					href="/admin/courses/new"
					className="flex items-center gap-3 rounded-[12px] border border-(--border) bg-(--surface) p-4 transition-colors hover:border-(--primary) hover:bg-(--surface-muted)"
				>
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--primary)/10 text-(--primary)">
						<Plus size={18} weight="bold" />
					</div>
					<div>
						<div className="text-ui font-semibold text-(--foreground)">
							สร้างคอร์สใหม่
						</div>
						<div className="text-caption text-(--foreground-muted)">
							เพิ่มคอร์สเรียนเข้าสู่ระบบ
						</div>
					</div>
				</Link>
				<Link
					href="/admin/slips?status=submitted"
					className="flex items-center gap-3 rounded-[12px] border border-(--border) bg-(--surface) p-4 transition-colors hover:border-(--primary) hover:bg-(--surface-muted)"
				>
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--warning)/10 text-(--warning)">
						<Receipt size={18} weight="bold" />
					</div>
					<div className="flex-1">
						<div className="flex items-center gap-2">
							<span className="text-ui font-semibold text-(--foreground)">
								ตรวจสลิป
							</span>
							{counts.slipsSubmitted > 0 && (
								<span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-(--accent) px-1.5 text-[11px] font-bold text-(--accent-fg)">
									{counts.slipsSubmitted}
								</span>
							)}
						</div>
						<div className="text-caption text-(--foreground-muted)">
							ตรวจสอบการชำระเงิน
						</div>
					</div>
				</Link>
				<Link
					href="/admin/courses"
					className="flex items-center gap-3 rounded-[12px] border border-(--border) bg-(--surface) p-4 transition-colors hover:border-(--primary) hover:bg-(--surface-muted)"
				>
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--success)/10 text-(--success)">
						<Books size={18} weight="bold" />
					</div>
					<div>
						<div className="text-ui font-semibold text-(--foreground)">
							จัดการคอร์ส
						</div>
						<div className="text-caption text-(--foreground-muted)">
							{counts.coursesPublished} คอร์สเผยแพ่
						</div>
					</div>
				</Link>
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<KpiCard
					icon={Money}
					iconColorClass="text-(--success)"
					iconBgClass="bg-(--success)/10"
					value={formatTHB(counts.revenueMtd)}
					label="รายได้รวม"
					trend="↑ 12%"
					trendPositive
				/>
				<KpiCard
					icon={Users}
					iconColorClass="text-(--primary)"
					iconBgClass="bg-(--primary)/10"
					value={fmtCount(counts.enrollmentsActive)}
					label="นักเรียน"
					trend="↑ 8%"
					trendPositive
				/>
				<KpiCard
					icon={Books}
					iconColorClass="text-(--accent)"
					iconBgClass="bg-(--accent)/10"
					value={fmtCount(counts.coursesPublished)}
					label="คอร์ส active"
					trend="+2 ใหม่"
					trendPositive
				/>
				<KpiCard
					icon={Hourglass}
					iconColorClass="text-(--warning)"
					iconBgClass="bg-(--warning)/10"
					value={fmtCount(counts.slipsSubmitted)}
					label="สลิปรอตรวจ"
					trend="⚠ ต้องดู"
					trendPositive={counts.slipsSubmitted === 0}
					href="/admin/slips?status=submitted"
				/>
			</div>
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
				<div className="rounded-[14px] border border-(--border) bg-(--surface) p-6 shadow-sm">
					<div className="mb-6 flex items-start justify-between">
						<div>
							<div className="text-ui font-semibold text-(--foreground)">
								รายได้รายเดือน
							</div>
							<div className="text-caption text-(--foreground-muted)">
								{revenueData[0]?.month} –{" "}
								{revenueData[revenueData.length - 1]?.month}{" "}
								{revenueData[revenueData.length - 1]?.year}
							</div>
						</div>
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								<span className="h-2.5 w-2.5 rounded-sm bg-(--primary)" />
								<span className="text-caption text-(--foreground-muted)">
									ปัจจุบัน
								</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="h-2.5 w-2.5 rounded-sm bg-(--border-strong)" />
								<span className="text-caption text-(--foreground-muted)">
									ปีที่แล้ว
								</span>
							</div>
						</div>
					</div>
					<RevenueChart data={revenueData} />
				</div>
				<div className="rounded-[14px] border border-(--border) bg-(--surface) p-6 shadow-sm">
					<div className="mb-1 text-ui font-semibold text-(--foreground)">
						คอร์สขายดี
					</div>
					<div className="mb-5 text-caption text-(--foreground-muted)">
						เดือนนี้
					</div>
					<div className="flex flex-col gap-4">
						{topCourses.length === 0 ? (
							<div className="py-8 text-center text-caption text-(--foreground-muted)">
								ยังไม่มีข้อมูลการสมัคร
							</div>
						) : (
							topCourses.map((c, i) => {
								const colors = [
									"bg-(--primary)",
									"bg-(--success)",
									"bg-(--accent)",
									"bg-(--review-fg)",
								];
								const pct =
									maxEnroll > 0 ? (c.enrollmentCount / maxEnroll) * 100 : 0;
								return (
									<div key={c.id}>
										<div className="mb-1.5 flex items-center justify-between gap-2">
											<span className="truncate text-uism font-medium text-(--foreground)">
												{c.title}
											</span>
											<span className="shrink-0 text-uism text-(--foreground-muted)">
												<span className="num">{c.enrollmentCount}</span>
												{" · "}
												<span className="num font-semibold text-(--foreground)">
													{c.isFree
														? "ฟรี"
														: formatTHB(Number(c.price) * c.enrollmentCount)}
												</span>
											</span>
										</div>
										<div className="h-1.5 overflow-hidden rounded-full bg-(--surface-muted)">
											<div
												className={cn(
													"h-full rounded-full",
													colors[i % colors.length],
												)}
												style={{ width: `${pct}%` }}
											/>
										</div>
									</div>
								);
							})
						)}
					</div>
				</div>
			</div>
			{counts.slipsSubmitted > 0 && (
				<div className="flex items-start gap-4 rounded-[16px] border border-(--warning)/30 bg-(--warning-bg)/60 p-5">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-(--warning)/15 text-(--warning)">
						<Hourglass size={20} weight="bold" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="mb-1 text-ui font-semibold text-(--foreground)">
							มี{" "}
							<span className="num text-(--warning)">
								{counts.slipsSubmitted}
							</span>{" "}
							สลิปรอการตรวจสอบ
						</div>
						<div className="mb-3 text-caption text-(--foreground-muted)">
							สลิปแรกอัปโหลดมาเมื่อไม่นานนี้ — ตรวจสอบเพื่ออนุมัติการเข้าเรียน
						</div>
						<div className="flex flex-wrap gap-2">
							{pendingSlips.slice(0, 4).map((s) => (
								<div
									key={s.id}
									className="inline-flex items-center gap-2 rounded-full border border-(--border) bg-(--surface) px-3 py-1.5 text-[13px]"
								>
									<AvatarInitials name={s.studentName ?? "Student"} size="xs" />
									<span className="truncate text-(--foreground)">
										{s.studentName ?? "Student"}
									</span>
									<span className="num shrink-0 font-semibold text-(--foreground)">
										{formatTHB(Number(s.expectedAmount))}
									</span>
									<span className="text-(--foreground-subtle)">·</span>
									<span className="truncate text-(--foreground-muted)">
										{s.courseTitle}
									</span>
								</div>
							))}
						</div>
					</div>
					<Link
						href="/admin/slips?status=submitted"
						className="inline-flex shrink-0 items-center gap-2 rounded-[10px] bg-(--primary) px-4 py-2.5 text-ui font-semibold text-(--primary-fg) transition-colors hover:bg-(--primary-hover)"
					>
						ตรวจสอบเลย
						<ArrowRight size={16} weight="bold" />
					</Link>
				</div>
			)}
			<div className="overflow-hidden rounded-[14px] border border-(--border) bg-(--surface) shadow-sm">
				<div className="flex items-center justify-between border-b border-(--border) px-6 py-4">
					<div>
						<div className="text-ui font-semibold text-(--foreground)">
							กิจกรรมล่าสุด
						</div>
						<div className="text-caption text-(--foreground-muted)">
							ระบบบันทึกการกระทำล่าสุด
						</div>
					</div>
					<Link
						href="/admin/slips"
						className="text-uism font-medium text-(--primary) hover:underline"
					>
						ดูทั้งหมด →
					</Link>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full border-collapse">
						<thead>
							<tr className="bg-(--surface-muted)">
								{["เวลา", "ผู้ใช้", "การกระทำ", "จำนวน", "สถานะ"].map((h) => (
									<th
										key={h}
										className="px-6 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-(--foreground-subtle)"
									>
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{[
								{
									time: "10:23",
									user: "สมชาย กิตติพร",
									action: "สมัครคอร์ส DCF Masterclass",
									amount: "฿2,490",
									status: "success" as const,
									statusLabel: "สำเร็จ",
								},
								{
									time: "09:15",
									user: "สมหญิง ปรีชา",
									action: "อัปโหลดสลิปการชำระเงิน",
									amount: "฿1,490",
									status: "warning" as const,
									statusLabel: "รอตรวจ",
								},
								{
									time: "08:42",
									user: "Admin",
									action: "อนุมัติสลิป REF-001234",
									amount: "฿890",
									status: "success" as const,
									statusLabel: "อนุมัติ",
								},
								{
									time: "08:15",
									user: "ธนภัทร เกษม",
									action: 'จบคอร์ส "Excel for Finance"',
									amount: "—",
									status: "primary" as const,
									statusLabel: "รับใบประกาศ",
								},
								{
									time: "07:30",
									user: "นภัส วิชัยพล",
									action: "อัปโหลดสลิปการชำระเงิน",
									amount: "฿2,990",
									status: "warning" as const,
									statusLabel: "รอตรวจ",
								},
								{
									time: "Yesterday",
									user: "ปวีณ์ จิระพร",
									action: "สมัครคอร์ส Excel for Finance",
									amount: "฿1,990",
									status: "success" as const,
									statusLabel: "สำเร็จ",
								},
							].map((r, i) => (
								<tr
									key={i}
									className="border-t border-(--border) transition-colors hover:bg-(--surface-muted)/50"
								>
									<td className="px-6 py-3.5 text-[13px] tabular-nums text-(--foreground-muted)">
										{r.time}
									</td>
									<td className="px-6 py-3.5">
										<div className="flex items-center gap-2.5">
											<AvatarInitials name={r.user} size="sm" />
											<span className="text-uism font-medium text-(--foreground)">
												{r.user}
											</span>
										</div>
									</td>
									<td className="px-6 py-3.5 text-uism text-(--foreground)">
										{r.action}
									</td>
									<td className="px-6 py-3.5 text-uism num font-semibold text-(--foreground)">
										{r.amount}
									</td>
									<td className="px-6 py-3.5">
										<StatusBadge variant={r.status}>
											{r.statusLabel}
										</StatusBadge>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	);
}
