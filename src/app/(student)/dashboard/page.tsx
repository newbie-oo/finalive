import Link from "next/link";
import { redirect } from "next/navigation";
import {
	Books,
	Clock,
	Flame,
	Trophy,
	ArrowRight,
	CaretRight,
	CheckCircle,
	XCircle,
	Play,
	Certificate,
} from "@phosphor-icons/react/dist/ssr";
import { getSession } from "@/server/auth-session";
import { getStudentDashboardData } from "@/server/repos/student-dashboard";
import { coverImageUrl } from "@/lib/media-url";

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

function timeAgo(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	if (minutes < 1) return "เมื่อสักครู่";
	if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
	if (hours < 24) return `${hours} ชม. ที่แล้ว`;
	if (days < 7) return `${days} วันที่แล้ว`;
	return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function getActivityIcon(type: string) {
	switch (type) {
		case "lesson_complete":
			return (
				<CheckCircle size={18} weight="fill" className="text-(--primary)" />
			);
		case "quiz_pass":
			return (
				<CheckCircle size={18} weight="fill" className="text-(--success)" />
			);
		case "quiz_fail":
			return (
				<XCircle size={18} weight="fill" className="text-(--destructive)" />
			);
		case "course_complete":
			return (
				<Certificate size={18} weight="fill" className="text-(--accent)" />
			);
		default:
			return <Play size={18} weight="fill" className="text-(--primary)" />;
	}
}

function getActivityBadge(type: string): string | null {
	switch (type) {
		case "lesson_complete":
			return "จบบทเรียน";
		case "quiz_pass":
			return "สอบผ่าน";
		case "quiz_fail":
			return "สอบไม่ผ่าน";
		case "course_complete":
			return "เรียนจบ";
		default:
			return null;
	}
}

function AchievementIcon({ icon }: { icon: string }) {
	switch (icon) {
		case "trophy":
			return <Trophy size={22} weight="bold" />;
		case "flame":
			return <Flame size={22} weight="bold" />;
		case "books":
			return <Books size={22} weight="bold" />;
		case "check-circle":
			return <CheckCircle size={22} weight="bold" />;
		case "certificate":
			return <Certificate size={22} weight="bold" />;
		default:
			return <Trophy size={22} weight="bold" />;
	}
}

export default async function DashboardPage() {
	const session = await getSession();
	if (!session?.user) {
		redirect("/login");
	}

	const data = await getStudentDashboardData(session.user.id);
	const inProgress = data.enrollments.filter((e) => !e.completedAt);

	return (
		<section className="space-y-8">
			{/* Welcome banner */}
			<div className="relative overflow-hidden rounded-card border border-(--border) bg-gradient-to-br from-[rgba(79,70,229,0.08)] to-[rgba(249,115,22,0.06)] p-6 md:p-8">
				<div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
					<div>
						<h1 className="text-h1 text-(--foreground)">
							สวัสดี {session.user.name?.split(/\s+/)[0] ?? "นักเรียน"} 👋
						</h1>
						<p className="mt-1 text-bodylg text-(--foreground-muted)">
							{inProgress.length > 0
								? "พร้อมเรียนต่อจากจุดที่ค้างไว้ไหม?"
								: "เริ่มเรียนคอร์สใหม่ได้เลย"}
						</p>
					</div>
					<div className="flex gap-3">
						<Link
							href="/courses"
							className="inline-flex h-10 items-center gap-2 rounded-button border border-(--border) bg-(--surface) px-4 text-sm font-medium text-(--foreground) transition-colors hover:bg-(--surface-muted)"
						>
							ดูคอร์สใหม่
						</Link>
						{inProgress[0] && (
							<Link
								href={`/learn/${inProgress[0].courseSlug}`}
								className="inline-flex h-10 items-center gap-2 rounded-button bg-(--primary) px-4 text-sm font-medium text-white transition-colors hover:bg-(--primary-700)"
							>
								เรียนต่อ <ArrowRight size={16} />
							</Link>
						)}
					</div>
				</div>
			</div>

			{/* Quick stats */}
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
						className="rounded-card border border-(--border) bg-(--surface) p-5"
					>
						<div className="flex items-center gap-3.5">
							<div
								className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
								style={{ background: `${s.color}15`, color: s.color }}
							>
								<s.icon size={20} weight="bold" />
							</div>
							<div>
								<div className="num text-h2 font-bold leading-none text-(--foreground)">
									{s.value}
								</div>
								<div className="mt-1 text-caption text-(--foreground-muted)">
									{s.label}
								</div>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Continue learning */}
			{inProgress.length > 0 && (
				<div>
					<div className="mb-5 flex items-baseline justify-between">
						<h2 className="text-h2 font-bold text-(--foreground)">
							เรียนต่อจากจุดที่ค้างไว้
						</h2>
						<Link
							href="/account/enrollments"
							className="inline-flex items-center gap-1 text-sm font-semibold text-(--primary) hover:underline"
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
									className="flex flex-col overflow-hidden rounded-card border border-(--border) bg-(--surface)"
								>
									<div className="relative aspect-[16/7] w-full overflow-hidden bg-(--surface-muted)">
										{e.coverStorageKey ? (
											<img
												src={coverImageUrl(e.coverStorageKey) ?? ""}
												alt=""
												className="h-full w-full object-cover"
											/>
										) : (
											<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#312E81] to-[#1E1B4B] text-white">
												<span className="text-h2">
													{e.courseTitle.trim().charAt(0).toUpperCase()}
												</span>
											</div>
										)}
									</div>
									<div className="flex flex-1 flex-col p-5">
										<h3 className="line-clamp-1 text-h4 font-semibold text-(--foreground)">
											{e.courseTitle}
										</h3>
										<p className="mt-1 text-caption text-(--foreground-muted)">
											{e.doneLessons}/{e.totalLessons} บทเรียน
										</p>
										<div className="mt-4 space-y-2">
											<div className="h-1.5 w-full overflow-hidden rounded-full bg-(--surface-muted)">
												<div
													className="h-full rounded-full bg-(--primary) transition-all"
													style={{ width: `${pct}%` }}
												/>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-uism font-semibold text-(--primary)">
													{pct}%
												</span>
												<Link
													href={`/learn/${e.courseSlug}`}
													className="inline-flex items-center gap-1 text-sm font-medium text-(--primary) hover:underline"
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

			{/* Heatmap + Achievements */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
				{/* Heatmap */}
				<div className="rounded-card border border-(--border) bg-(--surface) p-6">
					<div className="mb-1 flex items-baseline justify-between">
						<h3 className="text-h3 font-bold text-(--foreground)">
							ความคืบหน้า 5 สัปดาห์
						</h3>
						<span className="text-uism font-semibold text-(--primary)">
							<span className="num">
								{(data.weeklyWatchedSeconds / 3600).toFixed(1)}
							</span>{" "}
							ชม. สัปดาห์นี้
						</span>
					</div>
					<p className="mb-6 text-caption text-(--foreground-muted)">
						แต่ละช่อง = 1 วัน · เข้มขึ้น = เรียนนานขึ้น
					</p>
					<div className="flex gap-4">
						<div className="flex flex-col gap-1 pt-7">
							{["", "อ.", "", "พฤ.", "", "ส.", ""].map((d, i) => (
								<div
									key={i}
									className="h-3 text-[11px] text-(--foreground-muted)"
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
										className="text-[11px] text-(--foreground-muted)"
									>
										{m}
									</span>
								))}
							</div>
							<div className="grid grid-flow-col grid-cols-[repeat(35,1fr)] grid-rows-7 gap-1">
								{data.heatmap.map((lvl, i) => {
									const colors = [
										"#E5E7EB",
										"#C7D2FE",
										"#818CF8",
										"#4F46E5",
										"#3730A3",
									];
									return (
										<div
											key={i}
											className="rounded-[3px]"
											style={{
												backgroundColor: colors[lvl],
												aspectRatio: "1",
											}}
										/>
									);
								})}
							</div>
						</div>
					</div>
					<div className="mt-4 flex items-center justify-end gap-2">
						<span className="text-caption text-(--foreground-muted)">น้อย</span>
						{[0, 1, 2, 3, 4].map((l) => (
							<div
								key={l}
								className="h-3 w-3 rounded-[3px]"
								style={{
									backgroundColor: [
										"#E5E7EB",
										"#C7D2FE",
										"#818CF8",
										"#4F46E5",
										"#3730A3",
									][l],
								}}
							/>
						))}
						<span className="text-caption text-(--foreground-muted)">มาก</span>
					</div>
				</div>

				{/* Achievements */}
				<div className="rounded-card border border-(--border) bg-(--surface) p-6">
					<div className="mb-5 flex items-baseline justify-between">
						<h3 className="text-h3 font-bold text-(--foreground)">ความสำเร็จ</h3>
						<span className="text-uism font-semibold text-(--primary)">
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
									<div className="text-ui font-semibold text-(--foreground)">
										{a.title}
									</div>
									<div className="text-caption text-(--foreground-muted)">
										{a.desc}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Recent activity */}
			{data.recentActivity.length > 0 && (
				<div>
					<h2 className="mb-5 text-h2 font-bold text-(--foreground)">
						กิจกรรมล่าสุด
					</h2>
					<div className="rounded-card border border-(--border) bg-(--surface)">
						{data.recentActivity.map((a, i, arr) => (
							<div
								key={i}
								className={`flex items-center gap-4 px-5 py-4 ${
									i < arr.length - 1 ? "border-b border-(--border)" : ""
								}`}
							>
								<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--surface-muted)">
									{getActivityIcon(a.type)}
								</div>
								<span className="min-w-0 flex-1 truncate text-ui font-semibold text-(--foreground)">
									{a.title}
								</span>
								{a.meta && (
									<span className="hidden rounded-full bg-(--primary)/10 px-2.5 py-0.5 text-xs font-medium text-(--primary) sm:inline-block">
										{getActivityBadge(a.type)}
									</span>
								)}
								<span className="shrink-0 text-uism text-(--foreground-muted)">
									{timeAgo(a.at)}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</section>
	);
}
