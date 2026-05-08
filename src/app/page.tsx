import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import {
	ArrowRight,
	Books,
	CurrencyCircleDollar,
	GraduationCap,
	ShieldCheck,
	Certificate,
	Play,
	VideoCamera,
	Translate,
	Trophy,
	Check,
	BookOpen,
} from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layouts/public-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { CourseCard } from "@/components/course/course-card";
import { listFeaturedCourses } from "@/server/repos/course";
import { getPublicHomeStats } from "@/server/repos/stats";
import { coverImageUrl } from "@/lib/media-url";

const STEPS = [
	{
		n: "01",
		icon: Books,
		title: "เลือกคอร์ส",
		body: "เลือกคอร์สที่ตรงกับเป้าหมาย ดูตัวอย่างฟรีก่อนตัดสินใจ",
	},
	{
		n: "02",
		icon: CurrencyCircleDollar,
		title: "ชำระเงิน",
		body: "โอนผ่านธนาคารหรือ PromptPay อัปสลิป — ตรวจภายใน 24 ชม.",
	},
	{
		n: "03",
		icon: GraduationCap,
		title: "เริ่มเรียน",
		body: "เรียนได้ทุกอุปกรณ์ จบคอร์สรับใบประกาศที่ตรวจสอบออนไลน์",
	},
];

const FEATURES = [
	{
		icon: VideoCamera,
		title: "วิดีโอคุณภาพสูง",
		body: "สตรีมผ่าน HLS คมชัดทุกอุปกรณ์ ไม่มีโฆษณาคั่น เรียนได้ทั้งบนมือถือและคอมพิวเตอร์",
	},
	{
		icon: Translate,
		title: "เนื้อหาภาษาไทย",
		body: "อธิบายเป็นภาษาไทยละเอียดเข้าใจง่าย ไม่ต้องพึ่งคำบรรยายภาษาอังกฤษ อ่านงบการเงินได้จริง",
	},
	{
		icon: Trophy,
		title: "ใบประกาศนียบัตร",
		body: "รับใบประกาศที่ตรวจสอบออนไลน์ได้ แชร์ลง LinkedIn หรือโชว์ผลงานได้ทันที",
	},
];

const INSTRUCTOR_BADGES = [
	"CFA Charterholder",
	"Independent Equity Analyst",
	"อดีต VP Investment",
];

const getCachedHomeData = unstable_cache(
	async () => {
		const [stats, featured] = await Promise.all([
			getPublicHomeStats(),
			listFeaturedCourses(3),
		]);
		return {
			stats,
			featured: featured.map((c) => ({
				...c,
				coverImageUrl: coverImageUrl(c.coverStorageKey),
			})),
		};
	},
	["home-page-data"],
	{ revalidate: 600 },
);

export default async function Home() {
	const { stats, featured } = await getCachedHomeData();

	const formattedStudents =
		stats.activeStudents >= 100
			? `${stats.activeStudents.toLocaleString("en-US")}+`
			: stats.activeStudents.toLocaleString("en-US");

	const heroCourse = featured[0] ?? null;
	const hasStats =
		stats.publishedCourses > 0 ||
		stats.activeStudents > 0 ||
		stats.publishedLessons > 0;

	return (
		<PublicShell>
			<section className="mx-auto max-w-[1200px] px-6 py-16 md:py-24">
				<div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
					<div>
						<Badge variant="outline" className="mb-6 h-auto gap-2 px-3 py-1.5">
							<span
								className="h-2 w-2 rounded-full bg-primary"
								aria-hidden
							/>
							{heroCourse
								? `คอร์สแนะนำ: ${heroCourse.title}`
								: "เปิดคอร์สใหม่ทุกเดือน"}
						</Badge>
						<h1 className="text-display text-foreground">
							เรียนวิเคราะห์การเงิน
							<br />
							กับ <span className="text-primary">creator ไทย</span>
							<br />
							เรียนจบ ได้ใบประกาศ
						</h1>
						<p className="mt-5 max-w-xl text-bodylg text-muted-foreground">
							คอร์สสำหรับคนทำงานสายการเงิน นักวิเคราะห์ และผู้สนใจลงทุน
							เรียนผ่านวิดีโอที่อธิบายทีละขั้น พร้อมไฟล์ Excel ตัวอย่างจริง
							และสอบรับใบประกาศที่ตรวจสอบได้ออนไลน์
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
							<Button asChild variant="accent" size="lg">
								<Link href="/courses">
									ดูคอร์สทั้งหมด <ArrowRight size={16} weight="bold" />
								</Link>
							</Button>
							<Button asChild variant="secondary" size="lg">
								<Link href="/register">ลงทะเบียนฟรี</Link>
							</Button>
						</div>

						{hasStats && (
							<div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
								{stats.activeStudents > 0 && (
									<TrustStat
										value={formattedStudents}
										label="นักเรียนที่ลงทะเบียน"
									/>
								)}
								{stats.publishedCourses > 0 && (
									<>
										<span
											className="hidden h-8 w-px bg-border sm:block"
											aria-hidden
										/>
										<TrustStat
											value={stats.publishedCourses.toLocaleString("en-US")}
											label="คอร์สเปิดสอน"
										/>
									</>
								)}
								{stats.publishedLessons > 0 && (
									<>
										<span
											className="hidden h-8 w-px bg-border sm:block"
											aria-hidden
										/>
										<TrustStat
											value={stats.publishedLessons.toLocaleString("en-US")}
											label="บทเรียน"
										/>
									</>
								)}
							</div>
						)}
					</div>

					<HeroVisual
						course={heroCourse}
						publishedCourses={stats.publishedCourses}
						publishedLessons={stats.publishedLessons}
					/>
				</div>
			</section>

			{featured.length > 0 && (
				<section className="bg-muted py-16 md:py-24">
					<div className="mx-auto max-w-[1200px] px-6">
						<div className="mb-8 flex flex-wrap items-end justify-between gap-3">
							<div>
								<Eyebrow>คอร์สแนะนำ</Eyebrow>
								<h2 className="mt-2 text-h2">เริ่มต้นจากคอร์สล่าสุด</h2>
							</div>
							<Link
								href="/courses"
								className="inline-flex items-center gap-1.5 text-ui font-medium text-primary hover:underline"
							>
								ดูทั้งหมด <ArrowRight size={14} weight="bold" />
							</Link>
						</div>
						<ul className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
							{featured.map((c) => (
								<li key={c.id} className="h-full">
									<CourseCard course={c} />
								</li>
							))}
						</ul>
					</div>
				</section>
			)}

			<section id="about" className="py-16 md:py-24">
				<div className="mx-auto max-w-[1200px] px-6">
					<div className="mb-12 text-center">
						<Eyebrow>วิธีใช้งาน</Eyebrow>
						<h2 className="mt-2 text-h2">เริ่มเรียนใน 3 ขั้นตอน</h2>
					</div>
					<div className="grid gap-6 md:grid-cols-3">
						{STEPS.map((s) => {
							const Ic = s.icon;
							return (
								<Card key={s.n}>
									<CardContent className="p-0">
										<div className="mb-5 flex items-center justify-between">
											<div className="inline-flex h-14 w-14 items-center justify-center rounded-card border border-border bg-muted text-primary">
												<Ic size={28} weight="bold" />
											</div>
											<span
												className="num text-foreground-subtle"
												style={{
													fontSize: 32,
													fontWeight: 700,
													letterSpacing: "-0.02em",
												}}
											>
												{s.n}
											</span>
										</div>
										<h3 className="text-h3">{s.title}</h3>
										<p className="mt-2 text-body text-muted-foreground">
											{s.body}
										</p>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</div>
			</section>

			<section className="bg-muted py-16 md:py-24">
				<div className="mx-auto max-w-[1200px] px-6">
					<div className="mb-12 text-center">
						<Eyebrow>ทำไมต้อง Finalive</Eyebrow>
						<h2 className="mt-2 text-h2">เรียนกับผู้เชี่ยวชาญตัวจริง</h2>
					</div>
					<div className="grid gap-6 md:grid-cols-3">
						{FEATURES.map((f) => (
							<Card key={f.title}>
								<CardContent className="p-0">
									<div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-card border border-border bg-muted text-primary">
										<f.icon size={28} weight="bold" />
									</div>
									<h3 className="text-h3">{f.title}</h3>
									<p className="mt-2 text-body text-muted-foreground">
										{f.body}
									</p>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			<section className="py-16 md:py-24">
				<div className="mx-auto max-w-[1200px] px-6">
					<div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
						<div className="relative overflow-hidden rounded-card border border-border bg-linear-to-br from-[#312E81] to-[#1E1B4B] p-8 md:p-10">
							<svg
								aria-hidden
								className="absolute inset-0 h-full w-full opacity-20"
								viewBox="0 0 400 400"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<circle cx="80" cy="80" r="120" fill="#818CF8" />
								<circle cx="350" cy="300" r="100" fill="#F97316" />
								<circle cx="200" cy="350" r="80" fill="#6366F1" />
							</svg>
							<div className="relative">
								<AvatarInitials
									name="อาร์ม ริลีย์"
									size="xl"
									className="h-20! w-20! text-2xl! bg-linear-to-br! from-[#F97316]! to-[#EA580C]!"
								/>
								<div className="mt-4 text-uism font-medium text-white/70">
									ผู้ก่อตั้ง &amp; ผู้สอนหลัก
								</div>
								<div className="mt-1 text-h3 text-white">
									อาร์ม ริลีย์{" "}
									<span className="ml-1 text-base font-normal text-white/70">
										Arm Riley
									</span>
								</div>
								<div className="mt-1 text-body text-white/70">
									CFA Charterholder · Independent Equity Analyst
								</div>
							</div>
						</div>

						<div>
							<Eyebrow>ผู้สอน</Eyebrow>
							<h2 className="mt-2 text-h2">เรียนกับผู้เชี่ยวชาญตัวจริง</h2>
							<div className="mt-4 flex flex-wrap gap-2">
								{INSTRUCTOR_BADGES.map((badge) => (
									<Badge key={badge} variant="secondary">
										{badge}
									</Badge>
								))}
							</div>
							<p className="mt-5 text-body text-muted-foreground">
								อาร์มเริ่มต้นอาชีพในสายการลงทุนตั้งแต่ปี{" "}
								<span className="num font-medium">2013</span> ในฐานะ Equity
								Analyst และเคยดำรงตำแหน่ง VP Investment ในกองทุนใหญ่ที่ไทยและสิงคโปร์
								เชี่ยวชาญด้าน DCF valuation และ financial modeling
								ตั้งใจถ่ายทอดความรู้ให้คนไทยเข้าใจการลงทุนแบบมืออาชีพ
								ผ่านคอร์สที่ออกแบบมาอย่างเป็นระบบ
							</p>
							{hasStats && (
								<div className="mt-6 flex flex-wrap gap-6">
									{stats.publishedCourses > 0 && (
										<InstructorStat
											value={stats.publishedCourses.toLocaleString("en-US")}
											label="คอร์ส"
										/>
									)}
									{stats.activeStudents > 0 && (
										<InstructorStat
											value={formattedStudents}
											label="นักเรียน"
										/>
									)}
									<InstructorStat value="12" label="ปีประสบการณ์" />
									<InstructorStat value="CFA" label="Charterholder" />
								</div>
							)}
							<div className="mt-8">
								<Button asChild size="lg">
									<Link href="/instructor">
										เรียนรู้เพิ่มเติม <ArrowRight size={16} weight="bold" />
									</Link>
								</Button>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="bg-primary py-14 md:py-20">
				<div className="mx-auto max-w-[1200px] px-6">
					<div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center md:gap-8">
						<div>
							<h2 className="text-h2 max-w-[640px] text-white">
								พร้อมเริ่มเรียนแล้วใช่ไหม?
							</h2>
							<p className="mt-2.5 max-w-[540px] text-bodylg text-white/80">
								ลงทะเบียนฟรีวันนี้ เริ่มจากคอร์สตัวอย่าง — ดูได้ทันทีไม่ต้องชำระเงิน
							</p>
						</div>
						<div className="flex flex-wrap gap-3">
							<Button asChild variant="accent" size="lg">
								<Link href="/register">
									ลงทะเบียนฟรี <ArrowRight size={16} weight="bold" />
								</Link>
							</Button>
							<Button
								asChild
								size="lg"
								className="border border-white/25 bg-white/10 text-white hover:bg-white/20"
							>
								<Link href="/courses">ดูคอร์สทั้งหมด</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>
		</PublicShell>
	);
}

function Eyebrow({ children }: { children: React.ReactNode }) {
	return (
		<div
			className="text-uism font-semibold text-primary"
			style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
		>
			{children}
		</div>
	);
}

interface StatProps {
	value: string;
	label: string;
}

function TrustStat({ value, label }: StatProps) {
	return (
		<div>
			<div
				className="num text-foreground"
				style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}
			>
				{value}
			</div>
			<div className="mt-1 text-caption text-muted-foreground">{label}</div>
		</div>
	);
}

function InstructorStat({ value, label }: StatProps) {
	return (
		<div>
			<div
				className="num text-foreground"
				style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}
			>
				{value}
			</div>
			<div className="mt-1 text-caption text-muted-foreground">{label}</div>
		</div>
	);
}

interface HeroCourse {
	slug: string;
	title: string;
	coverImageUrl: string | null;
}

function HeroVisual({
	course,
	publishedCourses,
	publishedLessons,
}: {
	course: HeroCourse | null;
	publishedCourses: number;
	publishedLessons: number;
}) {
	const showStatCards = publishedCourses > 0 || publishedLessons > 0;
	return (
		<div
			className="relative ml-auto hidden w-full max-w-[540px] select-none grid-cols-2 gap-5 md:grid"
			style={{ pointerEvents: "none" }}
		>
			<Link
				href={course ? `/courses/${course.slug}` : "/courses"}
				className="col-span-2 overflow-hidden rounded-card border border-border bg-card shadow-(--shadow-lg)"
				style={{ pointerEvents: "auto" }}
			>
				<div
					className="relative aspect-video overflow-hidden bg-linear-to-br from-[#312E81] to-[#1E1B4B]"
					aria-hidden
				>
					{course?.coverImageUrl ? (
						<Image
							src={course.coverImageUrl}
							alt={course.title}
							fill
							sizes="(max-width: 768px) 100vw, 540px"
							className="object-cover"
							priority
						/>
					) : (
						<>
							<div
								aria-hidden
								className="absolute -right-8 -bottom-8 h-50 w-50 rounded-full bg-[#F97316]/20 blur-2xl"
							/>
							<div
								aria-hidden
								className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-[#818CF8]/20 blur-2xl"
							/>
						</>
					)}
					<div className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
						<Play size={22} weight="bold" className="text-[#1E1B4B]" />
					</div>
					<span className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
						{course ? "ดูตัวอย่าง" : "เร็วๆ นี้"}
					</span>
					<div className="absolute inset-x-4 bottom-4 text-white">
						<div
							className="mb-1 text-[11px] font-medium text-white/70"
							style={{
								textTransform: "uppercase",
								letterSpacing: "0.06em",
							}}
						>
							{course ? "คอร์สแนะนำ" : "Finalive"}
						</div>
						<div
							className="line-clamp-2"
							style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.25 }}
						>
							{course?.title ?? "เรียนวิเคราะห์การเงินกับ creator ไทย"}
						</div>
					</div>
				</div>
			</Link>

			{showStatCards ? (
				<>
					<Card className="flex flex-col p-5 shadow-(--shadow-md)">
						<CardContent className="flex flex-1 flex-col p-0">
							<div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
								<BookOpen size={18} weight="bold" />
							</div>
							<div className="mt-4">
								<div
									className="num leading-none text-foreground"
									style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}
								>
									{publishedCourses.toLocaleString("en-US")}
								</div>
								<div className="mt-1.5 text-caption text-muted-foreground">
									คอร์สเปิดสอน
								</div>
							</div>
							<div className="flex-1" />
							{publishedLessons > 0 && (
								<div className="mt-4 border-t border-border pt-3 text-caption text-muted-foreground">
									<span className="num font-semibold text-foreground">
										{publishedLessons.toLocaleString("en-US")}
									</span>{" "}
									บทเรียนทั้งหมด
								</div>
							)}
						</CardContent>
					</Card>

					<Card className="flex flex-col p-5 shadow-(--shadow-md)">
						<CardContent className="flex flex-1 flex-col p-0">
							<div className="flex h-9 w-9 items-center justify-center rounded-md bg-success-bg text-success">
								<Certificate size={18} weight="bold" />
							</div>
							<div className="mt-4">
								<div className="text-h4 font-semibold leading-tight text-foreground">
									เรียนจบ
									<br />
									รับใบประกาศ
								</div>
								<div className="mt-1.5 text-caption text-muted-foreground">
									ตรวจสอบออนไลน์ได้
								</div>
							</div>
							<div className="flex-1" />
							<div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-caption text-muted-foreground">
								<ShieldCheck size={13} />
								<span>แชร์ลง LinkedIn</span>
							</div>
						</CardContent>
					</Card>
				</>
			) : (
				<Card className="col-span-2 p-4 shadow-(--shadow-md)">
					<CardContent className="flex items-center gap-3 p-0">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-success-bg text-success">
							<Check size={18} weight="bold" />
						</div>
						<div className="min-w-0">
							<div className="text-uism font-semibold">ใบประกาศตรวจสอบได้</div>
							<div className="truncate text-caption text-muted-foreground">
								จบคอร์สรับใบประกาศที่ตรวจสอบออนไลน์ได้
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
