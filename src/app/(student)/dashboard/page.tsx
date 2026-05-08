import Link from "next/link";
import { redirect } from "next/navigation";
import {
	Books,
	Clock,
	Flame,
	Trophy,
	ArrowRight,
	CaretRight,
	Info,
} from "@phosphor-icons/react/dist/ssr";
import { Progress } from "@/components/ui/progress";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getSession } from "@/server/auth-session";
import { getStudentDashboard } from "@/server/services/student-dashboard";
import { coverImageUrl } from "@/lib/media-url";
import { formatDurationAuto } from "@/lib/format";
import { formatActivityTime } from "@/lib/format-time";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { AchievementIcon } from "@/components/dashboard/achievement-icon";
import { WelcomeHero } from "@/components/dashboard/welcome-hero";
import { UpNextList } from "@/components/dashboard/up-next-list";
import {
	getActivityIcon,
	getActivityBadge,
} from "@/components/dashboard/activity-icons";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
	const session = await getSession();
	if (!session?.user) {
		redirect("/login");
	}

	const data = await getStudentDashboard(session.user.id);
	const inProgress = data.enrollments.filter((e) => !e.completedAt);
	const continueCourse = inProgress[0];
	const watchedDuration = formatDurationAuto(data.totalWatchedSeconds);
	const isNewStudent = data.enrollments.length === 0;
	const firstName = session.user.name?.split(/\s+/)[0] ?? null;

	return (
		<section className="space-y-8">
			{isNewStudent ? (
				<WelcomeHero firstName={firstName} />
			) : (
				<div className="relative overflow-hidden rounded-card border border-border bg-linear-to-br from-primary/8 to-accent/6 p-6 md:p-8">
					<div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
						<div>
							<h1 className="mb-1.5 text-h1 font-bold text-foreground">
								สวัสดี {firstName ?? "นักเรียน"} 👋
							</h1>
							{continueCourse ? (
								<p className="text-bodylg text-muted-foreground">
									เรียนต่อจาก{" "}
									<strong className="num font-bold text-foreground">
										{continueCourse.courseTitle}
									</strong>{" "}
									— ทำไปแล้ว{" "}
									<strong className="num font-bold text-foreground">
										{continueCourse.doneLessons}/{continueCourse.totalLessons}
									</strong>{" "}
									บทเรียน
								</p>
							) : (
								<p className="text-bodylg text-muted-foreground">
									เลือกคอร์สถัดไปได้เลย
								</p>
							)}
						</div>
						{/* Single prominent CTA: "เรียนต่อ" wins over "ดูคอร์ส" when a
						    lesson is in progress so the dashboard's primary intent is
						    obvious. */}
						{continueCourse ? (
							<div className="flex flex-col items-end gap-1.5">
								<Link
									href={`/learn/${continueCourse.courseSlug}`}
									className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
								>
									เรียนต่อ <ArrowRight size={16} />
								</Link>
								<Link
									href="/courses"
									className="text-uism font-medium text-muted-foreground hover:text-foreground"
								>
									หรือดูคอร์สใหม่
								</Link>
							</div>
						) : (
							<Link
								href="/courses"
								className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
							>
								ดูคอร์ส <ArrowRight size={16} />
							</Link>
						)}
					</div>
				</div>
			)}

			<TooltipProvider>
				<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
					<StatCard
						icon={Books}
						value={String(data.enrollments.length)}
						label="คอร์สที่เรียนอยู่"
						color="var(--primary)"
					/>
					<StatCard
						icon={Clock}
						value={watchedDuration.value}
						label={`${watchedDuration.unit}เรียนรวม`}
						color="var(--success)"
					/>
					<StatCard
						icon={Flame}
						value={String(data.streak)}
						label="วันต่อเนื่อง"
						color="var(--accent)"
						tooltip="เรียนอย่างน้อย 1 บทต่อวันเพื่อรักษาสตรีค"
					/>
					<StatCard
						icon={Trophy}
						value={String(data.certCount)}
						label="ใบประกาศ"
						color="var(--avatar-to)"
					/>
				</div>
			</TooltipProvider>

			{data.upNext.length > 0 && (
				<div>
					<div className="mb-4 flex items-baseline justify-between">
						<h2 className="text-h2 font-bold text-foreground">
							บทถัดไปที่แนะนำ
						</h2>
						<Link
							href="/account/enrollments"
							className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
						>
							ดูทั้งหมด <CaretRight size={14} />
						</Link>
					</div>
					<UpNextList items={data.upNext} />
				</div>
			)}

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
											<div className="flex h-full w-full items-center justify-center bg-linear-to-br from-hero-from to-hero-to text-white">
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
				<ActivityHeatmap
					heatmap={data.heatmap}
					weeklyWatchedSeconds={data.weeklyWatchedSeconds}
				/>

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

interface StatCardProps {
	icon: React.ComponentType<{ size?: number; weight?: "bold" }>;
	value: string;
	label: string;
	color: string;
	/** When set, renders an info icon next to the label that explains the metric. */
	tooltip?: string;
}

function StatCard({ icon: Icon, value, label, color, tooltip }: StatCardProps) {
	return (
		<div className="rounded-card border border-border bg-card p-5">
			<div className="flex items-center gap-3.5">
				<div
					className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
					style={{ background: `${color}15`, color }}
				>
					<Icon size={20} weight="bold" />
				</div>
				<div>
					<div className="num text-h2 leading-none font-bold text-foreground">
						{value}
					</div>
					<div className="mt-1 flex items-center gap-1 text-caption text-muted-foreground">
						<span>{label}</span>
						{tooltip && (
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										aria-label={`คำอธิบาย: ${label}`}
										className="inline-flex items-center text-foreground-subtle transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
									>
										<Info size={12} aria-hidden />
									</button>
								</TooltipTrigger>
								<TooltipContent side="top">{tooltip}</TooltipContent>
							</Tooltip>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
