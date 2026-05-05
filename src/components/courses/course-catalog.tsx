"use client";

import { useState } from "react";
import { SquaresFour, List } from "@phosphor-icons/react";
import type { OffsetResponse } from "@/lib/pagination";
import type { PublicCourseSummary } from "@/server/repos/course";
import {
	CourseCard,
	CourseCardSkeleton,
	CourseListItem,
} from "@/components/course/course-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { GraduationCap } from "@phosphor-icons/react/dist/ssr";

interface CourseCatalogProps {
	result: OffsetResponse<PublicCourseSummary>;
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
			{/* Results bar */}
			<div className="mb-5 flex items-center justify-between">
				<span className="text-uism text-(--foreground-muted)">
					แสดง{" "}
					<span className="num font-medium text-(--foreground)">
						{start}-{end}
					</span>{" "}
					จาก{" "}
					<span className="num font-medium text-(--foreground)">
						{pagination.total_count}
					</span>{" "}
					คอร์ส
				</span>

				<div className="inline-flex rounded-button border border-(--border) bg-(--surface) p-0.5">
					<button
						type="button"
						onClick={() => setViewMode("grid")}
						className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
							viewMode === "grid"
								? "bg-(--primary) text-white"
								: "text-(--foreground-muted) hover:bg-(--surface-muted) hover:text-(--foreground)"
						}`}
						aria-label="มุมมองตาราง"
						aria-pressed={viewMode === "grid"}
					>
						<SquaresFour size={16} />
					</button>
					<button
						type="button"
						onClick={() => setViewMode("list")}
						className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
							viewMode === "list"
								? "bg-(--primary) text-white"
								: "text-(--foreground-muted) hover:bg-(--surface-muted) hover:text-(--foreground)"
						}`}
						aria-label="มุมมองรายการ"
						aria-pressed={viewMode === "list"}
					>
						<List size={16} />
					</button>
				</div>
			</div>

			{/* Course grid/list */}
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

export function CourseCatalogSkeleton() {
	return (
		<>
			<div className="mb-5 flex items-center justify-between">
				<div className="h-4 w-48 animate-pulse rounded-md bg-(--surface-muted)" />
				<div className="h-8 w-[72px] animate-pulse rounded-md bg-(--surface-muted)" />
			</div>
			<ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<li key={i}>
						<CourseCardSkeleton />
					</li>
				))}
			</ul>
		</>
	);
}
