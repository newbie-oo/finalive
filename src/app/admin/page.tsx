import Link from "next/link";
import { getAdminDashboard } from "@/server/presenters/admin-dashboard";
import { formatTHB } from "@/lib/format";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { RevenueChart } from "@/components/admin/revenue-chart";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
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

function KpiCard({
	icon: Icon,
	iconColorClass,
	iconBgClass,
	value,
	label,
	delta,
	subtext,
	subtextTone = "muted",
	href,
}: {
	icon: React.ElementType;
	iconColorClass: string;
	iconBgClass: string;
	value: string | number;
	label: string;
	delta?: { value: number; label?: string };
	subtext?: string;
	subtextTone?: "muted" | "warning" | "success";
	href?: string;
}) {
	const positive = delta ? delta.value >= 0 : true;
	const subtextToneClass = {
		muted: "text-foreground-subtle",
		warning: "text-warning",
		success: "text-success",
	}[subtextTone];
	const content = (
		<div className="flex h-full flex-col rounded-card border border-border bg-card p-5 shadow-xs transition-colors hover:border-border-strong">
			<div className="mb-4 flex items-start justify-between">
				<div
					className={cn(
						"flex h-10 w-10 items-center justify-center rounded-button",
						iconBgClass,
					)}
				>
					<Icon size={22} weight="bold" className={iconColorClass} />
				</div>
				{delta && (
					<span
						className={cn(
							"text-uism num font-semibold",
							positive ? "text-success" : "text-destructive",
						)}
					>
						{positive ? "↑" : "↓"} {Math.abs(delta.value).toFixed(0)}%
						{delta.label ? (
							<span className="ml-1 font-normal text-foreground-subtle">
								{delta.label}
							</span>
						) : null}
					</span>
				)}
			</div>
			<div className="text-h1 num mb-1 font-semibold text-foreground">
				{value}
			</div>
			<div className="text-caption text-muted-foreground">{label}</div>
			{subtext && (
				<div className={cn("mt-1 text-caption", subtextToneClass)}>
					{subtext}
				</div>
			)}
		</div>
	);
	return href ? (
		<Link
			href={href}
			className="block focus-visible:rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
		>
			{content}
		</Link>
	) : (
		content
	);
}

function StatusBadge({
	variant,
	children,
}: {
	variant: "success" | "warning" | "primary" | "muted";
	children: React.ReactNode;
}) {
	const map = {
		success: "bg-success-bg text-success-foreground border-success/20",
		warning: "bg-warning-bg text-warning-foreground border-warning/20",
		primary: "bg-review-bg text-review-foreground border-primary/20",
		muted: "bg-muted text-muted-foreground border-border",
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

export default async function AdminDashboardPage() {
	const vm = await getAdminDashboard();

	return (
		<section className="space-y-6">
			<div>
				<h1 className="text-h1 font-bold text-foreground">ภาพรวมธุรกิจ</h1>
				<p className="mt-1 text-body text-muted-foreground">
					ข้อมูลล่าสุด · {vm.nowLabel}
				</p>
			</div>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<QuickLinkCard
					href="/admin/courses/new"
					icon={Plus}
					iconColor="text-primary"
					iconBg="bg-primary/10"
					title="สร้างคอร์สใหม่"
					subtitle="เพิ่มคอร์สเรียนเข้าสู่ระบบ"
				/>
				<QuickLinkCard
					href="/admin/slips?status=submitted"
					icon={Receipt}
					iconColor="text-warning"
					iconBg="bg-warning/10"
					title="ตรวจสลิป"
					subtitle="ตรวจสอบการชำระเงิน"
					badge={
						vm.counts.slipsSubmitted > 0 ? vm.counts.slipsSubmitted : undefined
					}
				/>
				<QuickLinkCard
					href="/admin/courses"
					icon={Books}
					iconColor="text-success"
					iconBg="bg-success/10"
					title="จัดการคอร์ส"
					subtitle={`${vm.counts.coursesPublished} คอร์สเผยแพร่`}
				/>
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<KpiCard
					icon={Money}
					iconColorClass="text-success"
					iconBgClass="bg-success/10"
					value={formatTHB(vm.counts.revenueMtd)}
					label="รายได้เดือนนี้"
					delta={vm.revenueDelta}
				/>
				<KpiCard
					icon={Users}
					iconColorClass="text-primary"
					iconBgClass="bg-primary/10"
					value={fmtCount(vm.counts.enrollmentsActive)}
					label="นักเรียน"
					subtext="ลงทะเบียนใช้งาน"
				/>
				<KpiCard
					icon={Books}
					iconColorClass="text-accent"
					iconBgClass="bg-accent/10"
					value={fmtCount(vm.counts.coursesPublished)}
					label="คอร์ส"
					subtext="เผยแพร่อยู่"
				/>
				<KpiCard
					icon={Hourglass}
					iconColorClass="text-warning"
					iconBgClass="bg-warning/10"
					value={fmtCount(vm.counts.slipsSubmitted)}
					label="สลิปรอตรวจ"
					subtext={vm.counts.slipsSubmitted === 0 ? "ทันสมัย" : "ต้องดำเนินการ"}
					subtextTone={vm.counts.slipsSubmitted === 0 ? "success" : "warning"}
					href="/admin/slips?status=submitted"
				/>
			</div>
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
				<RevenueSection data={vm.revenueData} />
				<TopCoursesSection courses={vm.topCourses} maxEnroll={vm.maxEnroll} />
			</div>
			{vm.counts.slipsSubmitted > 0 && (
				<PendingSlipsAlert
					slips={vm.pendingSlips}
					count={vm.counts.slipsSubmitted}
				/>
			)}
			<ActivitySection rows={vm.activityRows} />
		</section>
	);
}

function QuickLinkCard({
	href,
	icon: Icon,
	iconColor,
	iconBg,
	title,
	subtitle,
	badge,
}: {
	href: string;
	icon: React.ElementType;
	iconColor: string;
	iconBg: string;
	title: string;
	subtitle: string;
	badge?: number;
}) {
	return (
		<Link
			href={href}
			className="flex items-center gap-3 rounded-[12px] border border-border bg-card p-4 transition-colors hover:border-primary hover:bg-muted"
		>
			<div
				className={cn(
					"flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
					iconBg,
					iconColor,
				)}
			>
				<Icon size={18} weight="bold" />
			</div>
			<div className="flex-1">
				<div className="flex items-center gap-2">
					<span className="text-ui font-semibold text-foreground">{title}</span>
					{badge !== undefined && badge > 0 && (
						<span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground">
							{badge}
						</span>
					)}
				</div>
				<div className="text-caption text-muted-foreground">{subtitle}</div>
			</div>
		</Link>
	);
}

function RevenueSection({
	data,
}: {
	data: { month: string; year: number; current: number; previous: number }[];
}) {
	return (
		<div className="rounded-card border border-border bg-card p-6 shadow-xs">
			<div className="mb-6 flex items-start justify-between">
				<div>
					<div className="text-ui font-semibold text-foreground">
						รายได้รายเดือน
					</div>
					<div className="text-caption text-muted-foreground">
						{data[0]?.month} – {data[data.length - 1]?.month}{" "}
						{data[data.length - 1]?.year}
					</div>
				</div>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<span className="h-2.5 w-2.5 rounded-sm bg-primary" />
						<span className="text-caption text-muted-foreground">ปัจจุบัน</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="h-2.5 w-2.5 rounded-sm bg-border-strong" />
						<span className="text-caption text-muted-foreground">ปีที่แล้ว</span>
					</div>
				</div>
			</div>
			<RevenueChart data={data} />
		</div>
	);
}

function TopCoursesSection({
	courses,
	maxEnroll,
}: {
	courses: {
		id: string;
		title: string;
		enrollmentCount: number;
		revenue: number;
		isFree: boolean;
	}[];
	maxEnroll: number;
}) {
	const colors = [
		"bg-primary",
		"bg-success",
		"bg-accent",
		"bg-review-foreground",
	];
	return (
		<div className="rounded-card border border-border bg-card p-6 shadow-xs">
			<div className="mb-1 text-ui font-semibold text-foreground">คอร์สขายดี</div>
			<div className="mb-5 text-caption text-muted-foreground">เดือนนี้</div>
			<div className="flex flex-col gap-4">
				{courses.length === 0 ? (
					<div className="py-8 text-center text-caption text-muted-foreground">
						ยังไม่มีข้อมูลการสมัคร
					</div>
				) : (
					courses.map((c, i) => {
						const pct =
							maxEnroll > 0 ? (c.enrollmentCount / maxEnroll) * 100 : 0;
						return (
							<div key={c.id}>
								<div className="mb-1.5 flex items-center justify-between gap-2">
									<span className="truncate text-uism font-medium text-foreground">
										{c.title}
									</span>
									<span className="shrink-0 text-uism text-muted-foreground">
										<span className="num">{c.enrollmentCount}</span>
										{" · "}
										<span className="num font-semibold text-foreground">
											{c.isFree ? "ฟรี" : formatTHB(c.revenue)}
										</span>
									</span>
								</div>
								<div className="h-1.5 overflow-hidden rounded-full bg-muted">
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
	);
}

function PendingSlipsAlert({
	slips,
	count,
}: {
	slips: {
		id: string;
		studentName: string | null;
		expectedAmount: string;
		courseTitle: string | null;
	}[];
	count: number;
}) {
	return (
		<div className="flex items-start gap-4 rounded-[16px] border border-warning/30 bg-warning-bg/60 p-5">
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-warning/15 text-warning">
				<Hourglass size={20} weight="bold" />
			</div>
			<div className="min-w-0 flex-1">
				<div className="mb-1 text-ui font-semibold text-foreground">
					มี <span className="num text-warning">{count}</span> สลิปรอการตรวจสอบ
				</div>
				<div className="mb-3 text-caption text-muted-foreground">
					สลิปแรกอัปโหลดมาเมื่อไม่นานนี้ — ตรวจสอบเพื่ออนุมัติการเข้าเรียน
				</div>
				<div className="flex flex-wrap gap-2">
					{slips.slice(0, 4).map((s) => (
						<div
							key={s.id}
							className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[13px]"
						>
							<AvatarInitials name={s.studentName ?? "Student"} size="xs" />
							<span className="truncate text-foreground">
								{s.studentName ?? "Student"}
							</span>
							<span className="num shrink-0 font-semibold text-foreground">
								{formatTHB(Number(s.expectedAmount))}
							</span>
							<span className="text-foreground-subtle">·</span>
							<span className="truncate text-muted-foreground">
								{s.courseTitle}
							</span>
						</div>
					))}
				</div>
			</div>
			<Link
				href="/admin/slips?status=submitted"
				className="inline-flex shrink-0 items-center gap-2 rounded-button bg-primary px-4 py-2.5 text-ui font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
			>
				ตรวจสอบเลย
				<ArrowRight size={16} weight="bold" />
			</Link>
		</div>
	);
}

function ActivitySection({
	rows,
}: {
	rows: {
		time: string;
		userName: string;
		action: string;
		amount: string | null;
		status: "success" | "warning" | "primary";
		statusLabel: string;
	}[];
}) {
	return (
		<div className="overflow-hidden rounded-card border border-border bg-card shadow-xs">
			<div className="flex items-center justify-between border-b border-border px-6 py-4">
				<div>
					<div className="text-ui font-semibold text-foreground">
						กิจกรรมล่าสุด
					</div>
					<div className="text-caption text-muted-foreground">
						ระบบบันทึกการกระทำล่าสุด
					</div>
				</div>
				<Link
					href="/admin/slips"
					className="text-uism font-medium text-primary hover:underline"
				>
					ดูทั้งหมด →
				</Link>
			</div>
			{rows.length === 0 ? (
				<div className="px-6 py-10 text-center text-caption text-muted-foreground">
					ยังไม่มีกิจกรรมล่าสุด
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow className="bg-muted hover:bg-muted">
							{["เวลา", "ผู้ใช้", "การกระทำ", "จำนวน", "สถานะ"].map((h) => (
								<TableHead
									key={h}
									className="px-6 py-3 text-[12px] font-semibold uppercase tracking-wider text-foreground-subtle"
								>
									{h}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((r, i) => (
							<TableRow key={i}>
								<TableCell className="px-6 py-3.5 text-[13px] tabular-nums text-muted-foreground">
									{r.time}
								</TableCell>
								<TableCell className="px-6 py-3.5">
									<div className="flex items-center gap-2.5">
										<AvatarInitials name={r.userName} size="sm" />
										<span className="text-uism font-medium text-foreground">
											{r.userName}
										</span>
									</div>
								</TableCell>
								<TableCell className="px-6 py-3.5 text-uism text-foreground">
									{r.action}
								</TableCell>
								<TableCell className="px-6 py-3.5 text-uism num font-semibold text-foreground">
									{r.amount ?? "—"}
								</TableCell>
								<TableCell className="px-6 py-3.5">
									<StatusBadge variant={r.status}>{r.statusLabel}</StatusBadge>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}
