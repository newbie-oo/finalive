import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
	CaretRight,
	CheckCircle,
	BookOpen,
	Clock,
	Certificate as CertificateIcon,
	Devices,
	Infinity as InfinityIcon,
	Users,
} from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layouts/public-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { FreeCourseCta } from "@/components/course/free-course-cta";
import { CourseTabs } from "./course-tabs";
import {
	getPublishedCourseBySlug,
	getCourseCurriculum,
	isUserEnrolledInCourse,
} from "@/server/repos/course";
import { getSession } from "@/server/auth-session";
import { formatTHB, formatDuration } from "@/lib/format";

const INCLUDES: Array<{
	icon: React.ComponentType<{
		size?: number;
		weight?: "regular" | "bold" | "fill";
	}>;
	label: string;
}> = [
	{ icon: BookOpen, label: "บทเรียนวิดีโอครบทุก module" },
	{ icon: InfinityIcon, label: "เรียนได้ตลอดชีพ ไม่หมดอายุ" },
	{ icon: Devices, label: "เปิดดูบนทุกอุปกรณ์" },
	{ icon: CheckCircle, label: "แบบทดสอบจบบท" },
	{ icon: CertificateIcon, label: "ใบประกาศเมื่อเรียนจบ" },
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
		? await isUserEnrolledInCourse(userId, course.id)
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

	return (
		<PublicShell>
			{/* Hero — surface-sunken band, 2-col 60/40 with sticky purchase card. */}
			<section className="bg-(--surface-sunken)">
				<div className="mx-auto max-w-[1200px] px-6 py-12 md:py-16">
					<nav
						aria-label="breadcrumb"
						className="mb-6 flex items-center gap-2 text-uism text-(--foreground-muted)"
					>
						<Link href="/courses" className="hover:text-(--foreground)">
							คอร์สทั้งหมด
						</Link>
						<CaretRight size={14} />
						<span className="truncate text-(--foreground)">{course.title}</span>
					</nav>

					<div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
						<div>
							<div className="mb-4 flex flex-wrap items-center gap-2">
								<StatusChip tone="primary">การเงินและการลงทุน</StatusChip>
								{isFreeView && <StatusChip tone="success">ฟรี</StatusChip>}
								{isAdmin && course.status !== "published" && (
									<StatusChip tone="warning">
										{course.status === "draft"
											? "ร่าง · admin preview"
											: "เก็บถาวร · admin preview"}
									</StatusChip>
								)}
							</div>
							<h1 className="text-h1 break-words text-(--foreground)">
								{course.title}
							</h1>
							<p className="mt-4 text-bodylg text-(--foreground-muted)">
								{course.summary}
							</p>

							{/* Instructor row */}
							<a
								href="#instructor"
								className="mt-6 inline-flex items-center gap-3 rounded-card border border-transparent p-1 transition-colors hover:border-(--border) hover:bg-(--surface-muted)"
							>
								<div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-[#6366F1] to-[#8B5CF6] text-ui font-semibold text-white">
									อา
								</div>
								<div>
									<div className="text-ui font-semibold text-(--foreground)">
										อ.อาร์ม
									</div>
									<div className="text-caption text-(--foreground-muted)">
										นักวิเคราะห์การเงิน · CFA Charterholder
									</div>
								</div>
							</a>

							{/* Meta row */}
							<div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-uism text-(--foreground-muted)">
								<span className="inline-flex items-center gap-1.5">
									<BookOpen size={16} />
									<span className="num">{totalLessons}</span> บทเรียน
								</span>
								<span className="inline-flex items-center gap-1.5">
									<Clock size={16} />
									{formatDuration(totalDuration)}
								</span>
								<span>
									<span className="num">{curriculum.length}</span> โมดูล
								</span>
								<span className="inline-flex items-center gap-1.5">
									<Users size={16} />
									<span className="num">
										{course.enrollmentCount.toLocaleString("th-TH")}
									</span>{" "}
									ผู้เรียน
								</span>
							</div>
						</div>

						<aside className="lg:sticky lg:top-24 lg:self-start">
							<Card noPadding className="overflow-hidden shadow-(--shadow-md)">
								{course.coverUrl ? (
									<div className="relative aspect-video w-full overflow-hidden bg-(--surface-muted)">
										<Image
											src={course.coverUrl}
											alt={course.title}
											fill
											sizes="(max-width: 1024px) 100vw, 480px"
											className="object-cover"
											priority
										/>
									</div>
								) : (
									<div className="relative aspect-video w-full overflow-hidden bg-linear-to-br from-[#312E81] to-[#1E1B4B]" />
								)}
								<div className="space-y-5 p-6">
									<div>
										{course.isFree ? (
											<div className="text-h2 font-semibold text-(--success)">
												ฟรี
											</div>
										) : (
											<div className="flex items-baseline gap-2">
												<span
													className="num text-display font-bold text-(--foreground)"
													style={{ fontSize: 32, lineHeight: 1 }}
												>
													{price}
												</span>
											</div>
										)}
									</div>

									<ul className="space-y-2.5">
										{INCLUDES.map((it) => {
											const Ic = it.icon;
											return (
												<li
													key={it.label}
													className="flex items-center gap-2.5 text-body text-(--foreground-muted)"
												>
													<Ic size={18} weight="bold" />
													<span>{it.label}</span>
												</li>
											);
										})}
									</ul>

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
											variant="ghost"
											size="md"
											className="w-full"
										>
											<Link href="#curriculum">ดูตัวอย่างฟรี</Link>
										</Button>
									)}
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
		</PublicShell>
	);
}
