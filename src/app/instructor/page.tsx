import Link from "next/link";
import {
	Users,
	Clock,
	Certificate,
	Globe,
	ArrowUpRight,
	Check,
	ShieldCheck,
	Books,
	CaretRight,
} from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layouts/public-shell";
import { unstable_cache } from "next/cache";
import { getPublicHomeStats } from "@/server/repos/stats";
import { listPublishedCourses } from "@/server/repos/course";
import { CourseCard } from "@/components/course/course-card";
import { AvatarInitials } from "@/components/ui/avatar-initials";

export const metadata = {
	title: "ผู้สอน — Finalive",
	description: "เรียนรู้เกี่ยวกับผู้สอนและที่มาของ Finalive",
};

const getCachedStats = unstable_cache(
	async () => getPublicHomeStats(),
	["instructor-page-stats"],
	{ revalidate: 3600 },
);

function InfoRow({
	icon: Icon,
	label,
	value,
}: {
	icon: React.ComponentType<{ size?: number }>;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center gap-3">
			<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--primary)/10 text-(--primary)">
				<Icon size={16} />
			</div>
			<div className="min-w-0 flex-1">
				<div className="text-caption text-(--foreground-muted)">{label}</div>
				<div className="truncate text-uism font-semibold text-(--foreground)">
					{value}
				</div>
			</div>
		</div>
	);
}

export default async function InstructorPage() {
	const [stats, courses] = await Promise.all([
		getCachedStats(),
		listPublishedCourses({ page: 1, per_page: 12 }),
	]);

	const formattedStudents =
		stats.activeStudents >= 100
			? `${stats.activeStudents.toLocaleString("en-US")}+`
			: `${stats.activeStudents}`;

	const yearsExp = 12;

	return (
		<PublicShell>
			{/* ─── Hero ─── */}
			<section className="relative overflow-hidden bg-gradient-to-br from-[#4F46E5] via-[#5B4AE3] to-[#7C6BED] text-white">
				{/* Dot pattern overlay */}
				<div
					className="pointer-events-none absolute inset-0 opacity-[0.08]"
					style={{
						backgroundImage:
							"radial-gradient(circle, #fff 1.5px, transparent 1.5px)",
						backgroundSize: "28px 28px",
					}}
				/>

				<div className="relative mx-auto max-w-[1200px] px-6 pb-24 pt-16">
					{/* Breadcrumb */}
					<nav className="mb-8 flex items-center gap-2 text-sm text-white/75">
						<span>หน้าแรก</span>
						<CaretRight size={14} />
						<span>ผู้สอน</span>
						<CaretRight size={14} />
						<span className="font-medium text-white">อาร์ม ริลีย์</span>
					</nav>

					<div className="flex flex-col items-start gap-8 md:flex-row md:items-start">
						{/* Avatar */}
						<div className="relative shrink-0">
							<div className="rounded-full border-4 border-white/25 bg-white/10 p-1">
								<AvatarInitials
									name="อาร์ม ริลีย์"
									size="xl"
									className="!h-36 !w-36 !text-4xl !bg-gradient-to-br !from-[#F97316] !to-[#EA580C]"
								/>
							</div>
							<div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#4F46E5] bg-[#10B981]">
								<Check size={16} weight="bold" className="text-white" />
							</div>
						</div>

						{/* Info */}
						<div className="min-w-0 flex-1">
							<div className="mb-3 flex flex-wrap items-center gap-2">
								<span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/[0.18] px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">
									<ShieldCheck size={12} weight="bold" />
									ผู้สอนยืนยันตัวตน
								</span>
								<span className="rounded-full bg-white/[0.18] px-2.5 py-1 text-xs font-semibold">
									CFA Charterholder
								</span>
							</div>

							<h1 className="text-4xl font-bold leading-tight md:text-[38px]">
								อาร์ม ริลีย์{" "}
								<span className="ml-2 text-lg font-normal text-white/70 md:text-[22px]">
									Arm Riley
								</span>
							</h1>

							<p className="mt-3 max-w-xl text-[17px] leading-relaxed text-white/85">
								Independent Equity Analyst · อดีต VP Investment
								ที่กองทุนใหญ่ในไทยและสิงคโปร์{" "}
								<span className="num font-semibold">{yearsExp}</span> ปี
								เชี่ยวชาญด้าน DCF valuation และ financial modeling
							</p>

							{/* Mini stats */}
							<div className="mt-6 flex flex-wrap gap-8">
								{[
									[String(stats.publishedCourses), "คอร์ส"],
									[formattedStudents, "นักเรียน"],
									[String(yearsExp), "ปีประสบการณ์"],
									["CFA", "Charterholder"],
								].map(([n, l]) => (
									<div key={l}>
										<div className="num text-[26px] font-bold leading-none">
											{n}
										</div>
										<div className="mt-1 text-sm text-white/70">{l}</div>
									</div>
								))}
							</div>
						</div>

						{/* CTAs */}
						<div className="flex shrink-0 flex-col gap-2.5 md:min-w-[200px]">
							<Link
								href="/courses"
								className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#F97316] px-6 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#EA580C] hover:shadow-lg"
							>
								<Books size={16} weight="bold" />
								ดูคอร์สทั้งหมด
							</Link>
							<a
								href="https://www.youtube.com/@armrileyquant"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex h-11 items-center justify-center gap-2 rounded-button border border-white/30 bg-white/[0.15] px-5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
							>
								<ArrowUpRight size={14} weight="bold" />
								YouTube
							</a>
						</div>
					</div>
				</div>
			</section>

			{/* ─── Body ─── */}
			<section className="mx-auto max-w-[1200px] px-6 pb-20 pt-12">
				<div className="flex flex-col gap-8 lg:flex-row lg:items-start">
					{/* ── Left column ── */}
					<div className="min-w-0 flex-1 space-y-8">
						{/* Bio */}
						<div className="rounded-card border border-(--border) bg-(--surface) p-6 md:p-8">
							<h2 className="text-h3 font-bold text-(--foreground)">
								ประวัติผู้สอน
							</h2>
							<div className="mt-4 space-y-4 text-body leading-relaxed text-(--foreground-muted)">
								<p>
									อาร์มเริ่มต้นอาชีพในสายการลงทุนตั้งแต่ปี{" "}
									<span className="num font-medium">2013</span> ในฐานะ Equity
									Analyst ที่ KBank Capital Markets ก่อนจะย้ายไปเป็น VP Investment
									ที่กองทุน hedge fund ในสิงคโปร์ ดูแลพอร์ต US/Asia ex-Japan
								</p>
								<p>
									ปัจจุบันเป็น independent analyst เขียน research note ให้กับ family
									office หลายแห่ง และสอนการประเมินมูลค่าหุ้นแบบ practical
									ที่นำไปใช้ในตลาดไทย-สหรัฐฯ ได้จริง
								</p>
							</div>

							<hr className="my-7 border-(--border)" />

							<h3 className="text-h4 font-bold text-(--foreground)">
								คุณวุฒิและประสบการณ์
							</h3>
							<div className="mt-4 space-y-3.5">
								{[
									["CFA Charterholder", "CFA Institute · 2018", "#4F46E5"],
									["MSc Finance", "Imperial College London · 2014", "#0EA5E9"],
									[
										"Independent Analyst",
										"Self-employed · 2022 – ปัจจุบัน",
										"#10B981",
									],
									["VP Investment", "Asia Hedge Fund · 2018 – 2022", "#F97316"],
									[
										"Equity Analyst",
										"KBank Capital Markets · 2013 – 2018",
										"#8B5CF6",
									],
								].map(([title, subtitle, color]) => (
									<div key={title} className="flex items-start gap-3.5">
										<div
											className="mt-2 h-2 w-2 shrink-0 rounded-full"
											style={{ backgroundColor: color }}
										/>
										<div>
											<div className="text-ui font-semibold text-(--foreground)">
												{title}
											</div>
											<div className="text-caption text-(--foreground-muted)">
												{subtitle}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Expertise */}
						<div className="rounded-card border border-(--border) bg-(--surface) p-6 md:p-8">
							<h2 className="text-h3 font-bold text-(--foreground)">
								เชี่ยวชาญด้าน
							</h2>
							<div className="mt-4 flex flex-wrap gap-2">
								{[
									"DCF Valuation",
									"Financial Modeling",
									"Equity Research",
									"Excel Modeling",
									"M&A Analysis",
									"Sector: Tech",
									"Sector: Banking",
									"Thai Stock",
									"US Stock",
									"Hedge Fund Strategy",
								].map((tag) => (
									<span
										key={tag}
										className="rounded-full bg-(--primary)/[0.08] px-3.5 py-2 text-sm font-medium text-(--primary)"
									>
										{tag}
									</span>
								))}
							</div>
						</div>

						{/* Courses */}
						<div>
							<div className="mb-5 flex items-baseline justify-between">
								<h2 className="text-h2 font-bold text-(--foreground)">
									คอร์สทั้งหมด
								</h2>
								<Link
									href="/courses"
									className="inline-flex items-center gap-1 text-sm font-semibold text-(--primary) hover:underline"
								>
									ดูทั้งหมด
									<CaretRight size={14} />
								</Link>
							</div>
							{courses.data.length === 0 ? (
								<p className="text-body text-(--foreground-muted)">ยังไม่มีคอร์ส</p>
							) : (
								<ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
									{courses.data.map((c) => (
										<li key={c.id}>
											<CourseCard course={c} />
										</li>
									))}
								</ul>
							)}
						</div>
					</div>

					{/* ── Right column (sticky) ── */}
					<aside className="shrink-0 space-y-4 lg:w-80 lg:sticky lg:top-6">
						{/* Info card */}
						<div className="rounded-card border border-(--border) bg-(--surface) p-5">
							<div className="mb-4 text-ui font-semibold text-(--foreground)">
								ข้อมูลผู้สอน
							</div>
							<div className="space-y-3.5">
								<InfoRow
									icon={Books}
									label="คอร์ส"
									value={`${stats.publishedCourses} คอร์สเปิดสอน`}
								/>
								<InfoRow
									icon={Users}
									label="นักเรียน"
									value={`${formattedStudents} คน`}
								/>
								<InfoRow icon={Clock} label="ประสบการณ์" value="12 ปีในวงการ" />
								<InfoRow
									icon={Certificate}
									label="คุณวุฒิ"
									value="CFA · MSc Finance"
								/>
								<InfoRow icon={Globe} label="ภาษาที่สอน" value="ไทย · อังกฤษ" />
							</div>
						</div>

						{/* Latest article */}
						<div className="overflow-hidden rounded-card border border-(--border) bg-(--surface)">
							<div className="relative flex h-24 items-end bg-gradient-to-br from-[#2E1065] to-[#4F46E5] p-4">
								<span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
									บทความล่าสุด
								</span>
							</div>
							<div className="p-4">
								<div className="text-ui font-semibold leading-snug text-(--foreground)">
									วิเคราะห์หุ้น banking ไทย Q4/2025
								</div>
								<div className="mt-1.5 text-caption text-(--foreground-muted)">
									เผยแพร่ ม.ค. 2026 · อ่าน 8 นาที
								</div>
								<a
									href="https://www.youtube.com/@armrileyquant"
									target="_blank"
									rel="noopener noreferrer"
									className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-(--primary) hover:underline"
								>
									อ่านบนเว็บผู้สอน
									<ArrowUpRight size={12} />
								</a>
							</div>
						</div>

						{/* Social */}
						<div className="rounded-card border border-(--border) bg-(--surface) p-5">
							<div className="mb-4 text-ui font-semibold text-(--foreground)">
								ติดตามผู้สอน
							</div>
							<div className="space-y-2">
								{(
									[
										["LinkedIn", "/in/armriley", "#0A66C2"],
										["Substack Newsletter", "armriley.substack.com", "#FF6719"],
										["Personal Site", "armriley.co", "#4F46E5"],
									] as const
								).map(([name, handle, color]) => (
									<a
										key={name}
										href="#"
										className="flex items-center justify-between rounded-lg border border-(--border) bg-(--surface) p-3 text-(--foreground) transition-colors hover:bg-(--surface-muted)"
									>
										<div>
											<div className="text-uism font-semibold">{name}</div>
											<div className="text-caption text-(--foreground-muted)">
												{handle}
											</div>
										</div>
										<ArrowUpRight size={14} style={{ color }} />
									</a>
								))}
							</div>
						</div>
					</aside>
				</div>
			</section>
		</PublicShell>
	);
}
