"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { SquaresFour, List } from "@phosphor-icons/react";
import type { OffsetResponse } from "@/lib/pagination";
import {
	CourseCard,
	CourseCardSkeleton,
	CourseListItem,
	CourseListItemSkeleton,
	type CourseCardData,
} from "@/components/course/course-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap } from "@phosphor-icons/react/dist/ssr";

export type CatalogViewMode = "grid" | "list";

interface CourseCatalogProps {
	result: OffsetResponse<CourseCardData>;
	searchParams: string;
	viewMode: CatalogViewMode;
}

export function CourseCatalog({
	result,
	searchParams,
	viewMode,
}: CourseCatalogProps) {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const { data, pagination } = result;
	const start = (pagination.page - 1) * pagination.per_page + 1;
	const end = Math.min(
		pagination.page * pagination.per_page,
		pagination.total_count,
	);

	// View mode lives in the URL so it survives the Suspense round-trip
	// triggered by every filter change. Otherwise the user picks "list",
	// types a search keyword, and the cards reset to "grid" while the
	// data is loading — which reads as the layout flickering.
	const setViewMode = useCallback(
		(mode: CatalogViewMode) => {
			const next = new URLSearchParams(params.toString());
			if (mode === "grid") next.delete("view");
			else next.set("view", mode);
			const qs = next.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[router, pathname, params],
	);

	if (data.length === 0) {
		return (
			<EmptyState
				icon={<GraduationCap size={28} weight="duotone" />}
				title="ไม่พบคอร์สที่ตรงกับเงื่อนไข"
				description="ลองเปลี่ยนคำค้น หรือล้างตัวกรองเพื่อดูคอร์สทั้งหมด"
			/>
		);
	}

	return (
		<>
			<CatalogHeader
				start={start}
				end={end}
				total={pagination.total_count}
				viewMode={viewMode}
				onViewModeChange={setViewMode}
			/>

			{viewMode === "grid" ? (
				<ul className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 sm:gap-6 lg:grid-cols-3">
					{data.map((c) => (
						<li key={c.id}>
							<CourseCard course={c} />
						</li>
					))}
				</ul>
			) : (
				<ul className="flex flex-col gap-4">
					{data.map((c) => (
						<li key={c.id}>
							<CourseListItem course={c} />
						</li>
					))}
				</ul>
			)}

			<div className="mt-10">
				<PaginationNav
					page={pagination.page}
					totalPages={pagination.total_pages}
					basePath="/courses"
					perPage={pagination.per_page === 12 ? undefined : pagination.per_page}
					searchParams={searchParams}
				/>
			</div>
		</>
	);
}

interface CatalogHeaderProps {
	start: number;
	end: number;
	total: number;
	viewMode: CatalogViewMode;
	onViewModeChange?: (m: CatalogViewMode) => void;
}

/**
 * Header row shared between the loaded catalog and its skeleton so both
 * states reserve the same vertical footprint — keeps the count line +
 * view toggle anchored as data swaps in.
 */
function CatalogHeader({
	start,
	end,
	total,
	viewMode,
	onViewModeChange,
}: CatalogHeaderProps) {
	return (
		<div className="mb-5 flex items-center justify-between">
			<span className="text-uism text-muted-foreground">
				แสดง{" "}
				<span className="num font-medium text-foreground">
					{start}-{end}
				</span>{" "}
				จาก{" "}
				<span className="num font-medium text-foreground">{total}</span>{" "}
				คอร์ส
			</span>

			<div className="inline-flex rounded-button border border-border bg-card p-0.5">
				<button
					type="button"
					onClick={() => onViewModeChange?.("grid")}
					disabled={!onViewModeChange}
					className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
						viewMode === "grid"
							? "bg-primary text-white"
							: "text-muted-foreground hover:bg-muted hover:text-foreground"
					}`}
					aria-label="Grid view"
					aria-pressed={viewMode === "grid"}
				>
					<SquaresFour size={16} />
				</button>
				<button
					type="button"
					onClick={() => onViewModeChange?.("list")}
					disabled={!onViewModeChange}
					className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
						viewMode === "list"
							? "bg-primary text-white"
							: "text-muted-foreground hover:bg-muted hover:text-foreground"
					}`}
					aria-label="List view"
					aria-pressed={viewMode === "list"}
				>
					<List size={16} />
				</button>
			</div>
		</div>
	);
}

interface CourseCatalogSkeletonProps {
	/** Match the live view mode so the skeleton's height matches what's
	 * about to land — toggling list-mode then changing a filter no longer
	 * flashes a 12-card grid skeleton. */
	viewMode?: CatalogViewMode;
	/** How many placeholder cards to render. Defaults to 6 — close enough
	 * to a typical first page without ballooning past what most catalogs
	 * actually return. */
	count?: number;
}

/**
 * Loading state for the catalog. Mirrors the live layout (header row,
 * grid/list body, pagination block) so the surrounding flex column —
 * including the sticky desktop filter rail — keeps the same shape.
 */
export function CourseCatalogSkeleton({
	viewMode = "grid",
	count = 6,
}: CourseCatalogSkeletonProps = {}) {
	return (
		<div>
			<CatalogHeader start={1} end={count} total={count} viewMode={viewMode} />
			{viewMode === "grid" ? (
				<ul className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 sm:gap-6 lg:grid-cols-3">
					{Array.from({ length: count }).map((_, i) => (
						<li key={i}>
							<CourseCardSkeleton />
						</li>
					))}
				</ul>
			) : (
				<ul className="flex flex-col gap-4">
					{Array.from({ length: count }).map((_, i) => (
						<li key={i}>
							<CourseListItemSkeleton />
						</li>
					))}
				</ul>
			)}
			<div className="mt-10 flex items-center justify-center gap-2">
				<Skeleton className="h-9 w-20 rounded-button" />
				<div className="flex items-center gap-1.5">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-9 w-9 rounded-button" />
					))}
				</div>
				<Skeleton className="h-9 w-20 rounded-button" />
			</div>
		</div>
	);
}
