import Link from "next/link";
import { redirect } from "next/navigation";
import {
	Books,
	Clock,
	Flame,
	Trophy,
	ArrowRight,
	CaretRight,
} from "@phosphor-icons/react/dist/ssr";
import { Progress } from "@/components/ui/progress";
import { getSession } from "@/server/auth-session";
import { getStudentDashboard } from "@/server/services/student-dashboard";
import { coverImageUrl } from "@/lib/media-url";
import { formatActivityTime } from "@/lib/format-time";
import { AchievementIcon } from "@/components/dashboard/achievement-icon";
import {
	getActivityIcon,
	getActivityBadge,
} from "@/components/dashboard/activity-icons";

export const dynamic = "force-dynamic";

function formatDuration(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const mins = Math.floor((totalSeconds % 3600) / 60);
	if (hours > 0) return `${hours}.${Math.round((mins / 60) * 10)}`;
	return `${mins}`;
}

function formatDurationLabel(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	if (hours > 0) return `ชั่วโมง`;
	return `นาที`;
}

export default async function DashboardPage() {
	const session = await getSession();
	if (!session?.user) {
		redirect("/login");
	}

	const data = await getStudentDashboard(session.user.id);
	const inProgress = data.enrollments.filter((e) => !e.completedAt);

	return (
		<section className="space-y-8">
			<div
				className="relative overflow-hidden rounded-card border border-border p-6 md:p-8"
				style={{
					background:
						"linear-gradient(120deg, rgba(79,70,229,0.08) 0%, rgba(249,115,22,0.06) 100%)",
				}}
			>
				<div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
					<div>
						<h1 className="mb-1.5 text-h1 font-bold text-foreground">
							สวัสดี {session.user.name?.split(/\s+/)[0] ?? "นักเรียน"} 👋
						</h1>
						{inProgress[0] ? (
							<p className="text-bodylg text-muted-foreground">
								เรียนต่อจาก{" "}
								<strong className="num font-bold text-foreground">
									{inProgress[0].courseTitle}
								</strong>{" "}
								— ทำไปแล้ว{" "}
								<strong className="num font-bold text-foreground">
									{inProgress[0].doneLessons}/{inProgress[0].totalLessons}
								</strong>{" "}
								บทเรียน
							</p>
						) : (
							<p className="text-bodylg text-muted-foreground">
								เริ่มเรียนคอร์สใหม่ได้เลย
							</p>
						)}
					</div>
					<div className="flex gap-3">
						<Link
							href="/courses"
							className="inline-flex h-10 items-center gap-2 rounded-button border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
						>
							ดูคอร์สใหม่
						</Link>
						{inProgress[0] && (
							<Link
								href={`/learn/${inProgress[0].courseSlug}`}
								className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
							>
								เรียนต่อ <ArrowRight size={16} />
							</Link>
						)}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				{[
					{
						icon: Books,
						value: String(data.enrollments.length),
						label: "คอร์สที่เรียนอยู่",
						color: "var(--primary)",
					},
					{
						icon: Clock,
						value: formatDuration(data.totalWatchedSeconds),
						label: formatDurationLabel(data.totalWatchedSeconds) + "เรียนรวม",
						color: "#10B981",
					},
					{
						icon: Flame,
						value: String(data.streak),
						label: "วันต่อเนื่อง",
						color: "var(--accent)",
					},
					{
						icon: Trophy,
						value: String(data.certCount),
						label: "ใบประกาศ",
						color: "#8B5CF6",
					},
				].map((s) => (
					<div
						key={s.label}
						className="rounded-card border border-border bg-card p-5"
					>
						<div className="flex items-center gap-3.5">
							<div
								className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
								style={{ background: `${s.color}15`, color: s.color }}
							>
								<s.icon size={20} weight="bold" />
							</div>
							<div>
								<div className="num text-h2 font-bold leading-none text-foreground">
									{s.value}
								</div>
								<div className="mt-1 text-caption text-muted-foreground">
									{s.label}
								</div>
							</div>
						</div>
					</div>
				))}
			</div>

			{inProgress.length > 0 && (
				<div>
					<div className="mb-5 flex items-baseline justify-between">
						<h2 className="text-h2 font-bold text-foreground">
							เรียนต่อจากจุดที่ค้างไว้
						</h2>
						<Link
							href="/account/enrollments"
							className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
						>
							คอร์สของฉันทั้งหมด <CaretRight size={14} />
						</Link>
					</div>
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{inProgress.slice(0, 3).map((e) => {
							const pct =
								e.totalLessons > 0
									? Math.round((e.doneLessons / e.totalLessons) * 100)
									: 0;
							return (
								<div
									key={e.enrollmentId}
									className="flex flex-col overflow-hidden rounded-card border border-border bg-card"
								>
									<div className="relative aspect-16/7 w-full overflow-hidden bg-muted">
										{e.coverStorageKey ? (
											<img
												src={coverImageUrl(e.coverStorageKey) ?? ""}
												alt=""
												className="h-full w-full object-cover"
											/>
										) : (
											<div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#312E81] to-[#1E1B4B] text-white">
												<span className="text-h2">
													{e.courseTitle.trim().charAt(0).toUpperCase()}
												</span>
											</div>
										)}
									</div>
									<div className="flex flex-1 flex-col p-5">
										<h3 className="line-clamp-1 text-h4 font-semibold text-foreground">
											{e.courseTitle}
										</h3>
										<p className="mt-1 text-caption text-muted-foreground">
											{e.doneLessons}/{e.totalLessons} บทเรียน
										</p>
										<div className="mt-4 space-y-2">
											<Progress value={pct} className="h-1.5" />
											<div className="flex items-center justify-between">
												<span className="text-uism font-semibold text-primary">
													{pct}%
												</span>
												<Link
													href={`/learn/${e.courseSlug}`}
													className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
												>
													เรียนต่อ <ArrowRight size={14} />
												</Link>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
				<div className="rounded-card border border-border bg-card p-6">
					<div className="mb-1 flex items-baseline justify-between">
						<h3 className="text-h3 font-bold text-foreground">
							ความคืบหน้า 5 สัปดาห์
						</h3>
						<span className="text-uism font-semibold text-primary">
							<span className="num">
								{(data.weeklyWatchedSeconds / 3600).toFixed(1)}
							</span>{" "}
							ชม. สัปดาห์นี้
						</span>
					</div>
					<p className="mb-6 text-caption text-muted-foreground">
						แต่ละช่อง = 1 วัน · เข้มขึ้น = เรียนนานขึ้น
					</p>
					<div className="flex gap-4">
						<div className="flex flex-col gap-1 pt-7">
							{["", "อ.", "", "พฤ.", "", "ส.", ""].map((d, i) => (
								<div
									key={i}
									className="h-3 text-[11px] text-muted-foreground"
								>
									{d}
								</div>
							))}
						</div>
						<div className="flex-1">
							<div className="mb-2 flex justify-between px-1">
								{["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค."].map((m) => (
									<span
										key={m}
										className="text-[11px] text-muted-foreground"
									>
										{m}
									</span>
								))}
							</div>
							<div className="grid grid-flow-col grid-cols-[repeat(35,1fr)] grid-rows-7 gap-1">
								{data.heatmap.map((lvl, i) => (
									<div
										key={i}
										className="rounded-[3px]"
										style={{
											backgroundColor: `var(--heat-${lvl})`,
											aspectRatio: "1",
										}}
									/>
								))}
							</div>
						</div>
					</div>
					<div className="mt-4 flex items-center justify-end gap-2">
						<span className="text-caption text-muted-foreground">น้อย</span>
						{[0, 1, 2, 3, 4].map((l) => (
							<div
								key={l}
								className="h-3 w-3 rounded-[3px]"
								style={{ backgroundColor: `var(--heat-${l})` }}
							/>
						))}
						<span className="text-caption text-muted-foreground">มาก</span>
					</div>
				</div>

				<div className="rounded-card border border-border bg-card p-6">
					<div className="mb-5 flex items-baseline justify-between">
						<h3 className="text-h3 font-bold text-foreground">ความสำเร็จ</h3>
						<span className="text-uism font-semibold text-primary">
							ดูทั้งหมด →
						</span>
					</div>
					<div className="space-y-4">
						{data.achievements.map((a) => (
							<div key={a.title} className="flex items-center gap-3.5">
								<div
									className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
									style={{ background: `${a.color}15`, color: a.color }}
								>
									<AchievementIcon icon={a.icon} />
								</div>
								<div>
									<div className="text-ui font-semibold text-foreground">
										{a.title}
									</div>
									<div className="text-caption text-muted-foreground">
										{a.desc}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{data.recentActivity.length > 0 && (
				<div>
					<h2 className="mb-5 text-h2 font-bold text-foreground">
						กิจกรรมล่าสุด
					</h2>
					<div className="rounded-card border border-border bg-card">
						{data.recentActivity.map((a, i, arr) => (
							<div
								key={i}
								className={`flex items-center gap-4 px-5 py-4 ${i < arr.length - 1 ? "border-b border-border" : ""
									}`}
							>
								<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
									{getActivityIcon(a.type)}
								</div>
								<span className="min-w-0 flex-1 truncate text-ui font-semibold text-foreground">
									{a.title}
								</span>
								{a.meta && (
									<span className="hidden rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary sm:inline-block">
										{getActivityBadge(a.type)}
									</span>
								)}
								<span className="shrink-0 text-uism text-muted-foreground">
									{formatActivityTime(a.at)}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</section>
	);
}
