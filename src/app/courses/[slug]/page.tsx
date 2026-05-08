import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
	CaretRight,
	Check,
	Clock,
	Certificate as CertificateIcon,
	Users,
	Play,
	ChatCircle,
	Video,
} from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layouts/public-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { FreeCourseCta } from "@/components/course/free-course-cta";
import { MobileCourseCta } from "@/components/course/mobile-course-cta";
import { CourseTabs } from "./course-tabs";
import {
	getPublishedCourseBySlug,
	getCourseCurriculum,
} from "@/server/repos/course";
import { EnrollmentRepo } from "@/server/repos/enrollment";
import { getSession } from "@/server/auth-session";
import { formatTHB } from "@/lib/format";
import { coverImageUrl } from "@/lib/media-url";

const CTA_FEATURES = [
	"บทเรียนวิดีโอ HD",
	"เรียนได้ตลอดชีพ บนทุกอุปกรณ์",
	"แบบทดสอบจบแต่ละโมดูล",
	"ใบประกาศเมื่อเรียนจบ",
	"Q&A กับผู้สอนใน Discord",
];

export default async function CourseDetailPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const session = await getSession();
	const userId = session?.user?.id ?? null;
	const isAdmin = session?.user?.role === "admin";
	const course = await getPublishedCourseBySlug(slug, {
		includeUnpublished: isAdmin,
	});
	if (!course) notFound();
	const isEnrolled = userId
		? await EnrollmentRepo.hasActive(userId, course.id)
		: false;
	const curriculum = await getCourseCurriculum(course.id, {
		includeEmptyModules: false,
	});
	const totalLessons = curriculum.reduce((sum, m) => sum + m.lessons.length, 0);
	const totalDuration = curriculum.reduce(
		(sum, m) =>
			sum + m.lessons.reduce((s, l) => s + (l.durationSeconds ?? 0), 0),
		0,
	);
	// Defensive: render free if either flag set OR price is literally 0 — keeps
	// the page UX correct even if a stray row escaped the create/update invariant.
	const isFreeView = course.isFree || Number(course.price) === 0;
	const price = isFreeView ? "ฟรี" : formatTHB(course.price);
	const hasPreviewableLesson = curriculum.some((m) =>
		m.lessons.some((l) => l.isPreview || l.isFree),
	);
	const isBestseller = course.enrollmentCount >= 100;
	const durationHours =
		totalDuration === 0
			? null
			: totalDuration >= 3600
				? `${Math.ceil(totalDuration / 3600)} ชม.`
				: `${Math.ceil(totalDuration / 60)} นาที`;
	const lastUpdated = course.publishedAt
		? course.publishedAt.toLocaleDateString("th-TH", {
			year: "numeric",
			month: "short",
		})
		: null;

	const featurePills = [
		{ icon: Video, label: `${totalLessons} บทเรียน` },
		...(durationHours ? [{ icon: Clock, label: durationHours }] : []),
		{ icon: CertificateIcon, label: "ใบประกาศ" },
		{ icon: ChatCircle, label: "Q&A กับผู้สอน" },
	];

	return (
		<PublicShell>
			<section className="bg-muted">
				<div className="mx-auto max-w-[1200px] px-6 py-6 md:py-8">
					<nav
						aria-label="breadcrumb"
						className="mb-6 flex items-center gap-2 text-uism text-muted-foreground"
					>
						<Link href="/courses" className="hover:text-foreground">
							คอร์สทั้งหมด
						</Link>
						<CaretRight size={14} />
						<span className="truncate text-foreground">{course.title}</span>
					</nav>

					<div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
						<div>
							<div className="relative mb-7 overflow-hidden rounded-[16px] shadow-(--shadow-lg)">
								{coverImageUrl(course.coverStorageKey) ? (
									<div className="relative aspect-video w-full overflow-hidden bg-muted">
										<Image
											src={coverImageUrl(course.coverStorageKey)!}
											alt={course.title}
											fill
											sizes="(max-width: 1024px) 100vw, 720px"
											className="object-cover"
											priority
										/>
									</div>
								) : (
									<div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-linear-to-br from-hero-from to-hero-to">
										<span
											className="font-semibold text-white"
											style={{ fontSize: 80, letterSpacing: "-0.02em" }}
										>
											{course.title.trim().charAt(0).toUpperCase()}
										</span>
									</div>
								)}
							</div>

							<div className="mb-4 flex flex-wrap items-center gap-2">
								{isBestseller && (
									<span className="inline-flex h-[22px] items-center gap-1 rounded-full px-2.5 text-[12px] font-medium leading-none whitespace-nowrap bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-accent">
										BESTSELLER
									</span>
								)}
								<StatusChip tone="primary">
									มีคนเรียน {course.enrollmentCount.toLocaleString("th-TH")} คน
								</StatusChip>
								{isFreeView && <StatusChip tone="success">ฟรี</StatusChip>}
								{isAdmin && course.status !== "published" && (
									<StatusChip tone="warning">
										{course.status === "draft"
											? "ร่าง · admin preview"
											: "เก็บถาวร · admin preview"}
									</StatusChip>
								)}
							</div>

							<h1 className="text-h1 wrap-break-word text-foreground">
								{course.title}
							</h1>

							<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-uism text-muted-foreground">
								<span className="inline-flex items-center gap-1.5">
									<Users size={16} />
									<span className="num font-semibold text-foreground">
										{course.enrollmentCount.toLocaleString("th-TH")}
									</span>{" "}
									ผู้เรียน
								</span>
								{lastUpdated && (
									<>
										<span className="text-foreground-subtle">·</span>
										<span>อัปเดตล่าสุด {lastUpdated}</span>
									</>
								)}
								<span className="text-foreground-subtle">·</span>
								<span>ภาษาไทย</span>
							</div>

							<a
								href="#instructor"
								className="mt-5 inline-flex items-center gap-3 rounded-card border border-transparent p-1 transition-colors hover:border-border hover:bg-muted"
							>
								<div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-avatar-from to-avatar-to text-ui font-semibold text-white">
									อา
								</div>
								<div>
									<div className="text-uism text-muted-foreground">
										ผู้สอน
									</div>
									<div className="text-ui font-semibold text-foreground">
										อ.อาร์ม{" "}
										<span className="text-uism font-medium text-muted-foreground">
											· CFA Charterholder
										</span>
									</div>
								</div>
							</a>

							<p className="mt-5 text-bodylg text-muted-foreground">
								{course.summary}
							</p>

							<div className="mt-6 flex flex-wrap gap-3">
								{featurePills.map(({ icon: Icon, label }, i) => (
									<span
										key={i}
										className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] text-foreground"
									>
										<Icon size={16} className="text-primary" />
										{label}
									</span>
								))}
							</div>
						</div>

						<aside className="lg:sticky lg:top-24 lg:self-start">
							<Card className="shadow-(--shadow-md)">
								<div className="mb-5">
									{course.isFree ? (
										<div className="text-h2 font-semibold text-success">
											ฟรี
										</div>
									) : (
										<div className="flex items-baseline gap-3">
											<span
												className="num text-display font-bold text-primary"
												style={{ fontSize: 32, lineHeight: 1 }}
											>
												{price}
											</span>
										</div>
									)}
								</div>

								<div className="mb-5 h-px bg-border" />

								<ul className="mb-6 space-y-3">
									{CTA_FEATURES.map((label) => (
										<li
											key={label}
											className="flex items-start gap-2.5 text-body text-foreground"
										>
											<Check
												size={18}
												weight="bold"
												className="mt-0.5 shrink-0 text-success"
											/>
											<span>{label}</span>
										</li>
									))}
								</ul>

								<div className="space-y-2.5">
									{isAdmin ? (
										<Button
											asChild
											variant="primary"
											size="lg"
											className="w-full"
										>
											<Link href={`/learn/${course.slug}`}>
												เข้าเรียน (admin preview)
											</Link>
										</Button>
									) : isEnrolled ? (
										<Button
											asChild
											variant="primary"
											size="lg"
											className="w-full"
										>
											<Link href={`/learn/${course.slug}`}>เข้าเรียน</Link>
										</Button>
									) : course.isFree ? (
										<FreeCourseCta courseSlug={course.slug} />
									) : (
										<form action="/checkout/start" method="post">
											<input
												type="hidden"
												name="courseSlug"
												value={course.slug}
											/>
											<Button
												type="submit"
												variant="accent"
												size="lg"
												className="w-full"
											>
												ลงทะเบียนเรียน
											</Button>
										</form>
									)}
									{/* Hide redundant preview CTA: already-enrolled students go
					    straight to /learn, and free courses make every lesson
					    previewable so the link is noise. */}
									{!isEnrolled && !course.isFree && hasPreviewableLesson && (
										<Button
											asChild
											variant="secondary"
											size="md"
											className="w-full"
										>
											<Link href="#curriculum">
												<Play size={16} weight="fill" className="mr-1" />
												ดูตัวอย่างฟรี
											</Link>
										</Button>
									)}
								</div>

								<div className="mt-5 border-t border-border pt-4 text-center">
									<span className="text-caption text-muted-foreground">
										<span className="num font-semibold text-foreground">
											{course.enrollmentCount.toLocaleString("th-TH")}
										</span>{" "}
										นักเรียนลงทะเบียนแล้ว
									</span>
								</div>
							</Card>
						</aside>
					</div>
				</div>
			</section>

			<CourseTabs
				curriculum={curriculum}
				courseSlug={course.slug}
				totalLessons={totalLessons}
				totalDuration={totalDuration}
			/>
			<MobileCourseCta
				courseSlug={course.slug}
				price={price}
				isFree={isFreeView}
				isEnrolled={isEnrolled}
			/>
		</PublicShell>
	);
}
