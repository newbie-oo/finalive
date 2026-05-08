import Image from "next/image";
import Link from "next/link";
import { Users } from "@phosphor-icons/react/dist/ssr";
import type { PublicCourseSummary } from "@/server/repos/course";
import { formatTHB } from "@/lib/format";
import { StatusChip } from "@/components/ui/status-chip";
import { Skeleton } from "@/components/ui/skeleton";

export interface CourseCardData extends PublicCourseSummary {
	coverImageUrl: string | null;
}

export function CourseCard({
	course,
	priority,
}: {
	course: CourseCardData;
	priority?: boolean;
}) {
	// Defensive: if a row slipped through with price=0 && isFree=false (the
	// legacy bug fixed by migration), still render it as free in the catalog
	// so students don't see "฿0.00" tags. The repos enforce the invariant on
	// create/update, so this is just belt-and-braces.
	const isFree = course.isFree || Number(course.price) === 0;
	const price = isFree ? "ฟรี" : formatTHB(course.price);
	const imageUrl = course.coverImageUrl;
	return (
		<Link
			href={`/courses/${course.slug}`}
			className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-(--shadow-sm) transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-(--shadow-md) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
		>
			<div
				className="relative aspect-video w-full overflow-hidden bg-muted"
				aria-hidden
			>
				{imageUrl ? (
					<Image
						src={imageUrl}
						alt={course.title}
						fill
						sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
						className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
						{...(priority ? { priority: true } : { loading: "lazy" })}
					/>
				) : (
					<CoverFallback title={course.title} />
				)}
				{isFree && (
					<span className="absolute left-3 top-3">
						<StatusChip tone="success">ฟรี</StatusChip>
					</span>
				)}
			</div>
			<div className="flex flex-1 flex-col gap-2 p-5">
				<h3 className="line-clamp-2 text-h4 text-foreground group-hover:text-primary">
					{course.title}
				</h3>
				<p className="line-clamp-2 text-body text-muted-foreground">
					{course.summary}
				</p>
				<div className="mt-auto flex items-center justify-between pt-2">
					<span className="num text-h4 font-semibold text-foreground">
						{price}
					</span>
					<span className="inline-flex items-center gap-1 text-uism text-muted-foreground">
						<Users size={14} />
						<span className="num">
							{course.enrollmentCount.toLocaleString("th-TH")}
						</span>{" "}
						ผู้เรียน
					</span>
				</div>
			</div>
		</Link>
	);
}

function CoverFallback({ title }: { title: string }) {
	// Indigo→violet gradient with the course's leading Thai/Latin character. Per
	// DESIGN.md §5.4 — replaces the bare "ไม่มีรูปปก" placeholder so cards never
	// look broken when a cover hasn't been uploaded.
	const initial = (title.trim().charAt(0) || "F").toUpperCase();
	return (
		<div className="relative flex h-full w-full items-center justify-center bg-linear-to-br from-hero-from to-hero-to">
			<div
				aria-hidden
				className="absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-accent/20 blur-2xl"
			/>
			<div
				aria-hidden
				className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-[#818CF8]/30 blur-2xl"
			/>
			<span
				className="relative font-semibold text-white"
				style={{ fontSize: 56, letterSpacing: "-0.02em" }}
			>
				{initial}
			</span>
		</div>
	);
}

export function CourseListItem({
	course,
	priority,
}: {
	course: CourseCardData;
	priority?: boolean;
}) {
	const isFree = course.isFree || Number(course.price) === 0;
	const price = isFree ? "ฟรี" : formatTHB(course.price);
	const imageUrl = course.coverImageUrl;
	return (
		<Link
			href={`/courses/${course.slug}`}
			className="group flex flex-col gap-4 overflow-hidden rounded-card border border-border bg-card p-4 shadow-(--shadow-sm) transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-(--shadow-md) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-row sm:gap-5"
		>
			<div
				className="relative aspect-video h-40 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-28 sm:w-44"
				aria-hidden
			>
				{imageUrl ? (
					<Image
						src={imageUrl}
						alt={course.title}
						fill
						sizes="200px"
						className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
						{...(priority ? { priority: true } : { loading: "lazy" })}
					/>
				) : (
					<CoverFallback title={course.title} />
				)}
				{isFree && (
					<span className="absolute left-2 top-2">
						<StatusChip tone="success">ฟรี</StatusChip>
					</span>
				)}
			</div>
			<div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
				<div>
					<h3 className="line-clamp-1 text-h4 text-foreground group-hover:text-primary">
						{course.title}
					</h3>
					<p className="mt-1 line-clamp-2 text-body text-muted-foreground">
						{course.summary}
					</p>
				</div>
				<div className="flex items-center justify-between pt-2">
					<span className="num text-h4 font-semibold text-foreground">
						{price}
					</span>
					<span className="inline-flex items-center gap-1 text-uism text-muted-foreground">
						<Users size={14} />
						<span className="num">
							{course.enrollmentCount.toLocaleString("th-TH")}
						</span>{" "}
						ผู้เรียน
					</span>
				</div>
			</div>
		</Link>
	);
}

export function CourseListItemSkeleton() {
	return (
		<div className="flex gap-5 overflow-hidden rounded-card border border-border bg-card p-4">
			<Skeleton className="aspect-video h-28 w-44 shrink-0 rounded-lg" />
			<div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
				<Skeleton className="h-5 w-2/3 rounded-md" />
				<Skeleton className="h-4 w-full rounded-md" />
				<Skeleton className="h-4 w-1/2 rounded-md" />
				<Skeleton className="mt-2 h-5 w-24 rounded-md" />
			</div>
		</div>
	);
}

export function CourseCardSkeleton() {
	return (
		<div className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-(--shadow-sm)">
			<Skeleton className="aspect-video w-full rounded-none" />
			<div className="flex flex-1 flex-col gap-2 p-5">
				<Skeleton className="h-5 w-3/4 rounded-md" />
				<Skeleton className="h-4 w-full rounded-md" />
				<Skeleton className="h-4 w-2/3 rounded-md" />
				<div className="mt-auto flex items-center justify-between pt-2">
					<Skeleton className="h-5 w-16 rounded-md" />
					<Skeleton className="h-4 w-24 rounded-md" />
				</div>
			</div>
		</div>
	);
}
