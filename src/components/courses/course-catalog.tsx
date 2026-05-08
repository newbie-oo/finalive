"use client";

import { useState } from "react";
import { SquaresFour, List } from "@phosphor-icons/react/dist/ssr";
import type { OffsetResponse } from "@/lib/pagination";
import {
	CourseCard,
	CourseCardSkeleton,
	CourseListItem,
	type CourseCardData,
} from "@/components/course/course-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { GraduationCap } from "@phosphor-icons/react/dist/ssr";

interface CourseCatalogProps {
	result: OffsetResponse<CourseCardData>;
	searchParams: string;
}

export function CourseCatalog({ result, searchParams }: CourseCatalogProps) {
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const { data, pagination } = result;
	const start = (pagination.page - 1) * pagination.per_page + 1;
	const end = Math.min(
		pagination.page * pagination.per_page,
		pagination.total_count,
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
			<div className="mb-5 flex items-center justify-between">
				<span className="text-uism text-muted-foreground">
					แสดง{" "}
					<span className="num font-medium text-foreground">
						{start}-{end}
					</span>{" "}
					จาก{" "}
					<span className="num font-medium text-foreground">
						{pagination.total_count}
					</span>{" "}
					คอร์ส
				</span>

				<div className="inline-flex rounded-button border border-border bg-card p-0.5">
					<button
						type="button"
						onClick={() => setViewMode("grid")}
						className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${viewMode === "grid"
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
						onClick={() => setViewMode("list")}
						className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${viewMode === "list"
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

			{viewMode === "grid" ? (
				<ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

/**
 * Loading state for the catalog. Renders only what we actually don't
 * know yet — the cards. The header row (count + view-toggle) and the
 * pagination strip are derived from the data, so faking them as
 * shimmer bars is misleading: the placeholder widths never match what
 * lands, and it suggests there's more chrome to "load" than there is.
 *
 * The empty spacer above the grid reserves the header's vertical
 * footprint so cards don't pop upward when the real header appears.
 */
export function CourseCatalogSkeleton() {
	return (
		<div aria-busy="true" aria-live="polite">
			<div className="mb-5 h-9" aria-hidden />
			<ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<li key={i}>
						<CourseCardSkeleton />
					</li>
				))}
			</ul>
		</div>
	);
}
