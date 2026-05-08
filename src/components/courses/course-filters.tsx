"use client";

import { useState } from "react";
import { useCourseFilters } from "@/hooks/use-course-filters";
import {
	CATEGORIES,
	getActiveQuickFilter,
} from "./course-filter-options";
import { CourseSearchHero } from "./course-search-hero";
import { CourseFilterPanels } from "./course-filter-panels";
import { CourseFilterMobileSheet } from "./course-filter-mobile-sheet";

interface CourseFiltersProps {
	initialQ: string;
	initialFreeOnly: boolean;
	initialPrice?: string;
	initialDuration?: string;
	initialSort?: string;
	children: React.ReactNode;
}

export function CourseFilters({
	initialQ,
	initialFreeOnly,
	initialPrice = "",
	initialDuration = "",
	initialSort = "newest",
	children,
}: CourseFiltersProps) {
	const [mobileOpen, setMobileOpen] = useState(false);
	const filters = useCourseFilters({
		initialQ,
		initialFreeOnly,
		initialPrice,
		initialDuration,
		initialSort,
	});

	const handlePriceChange = (v: string) => {
		filters.setPrice(v);
		filters.setFreeOnly(v === "free");
	};

	const activeQuickFilter = getActiveQuickFilter({
		q: filters.q,
		freeOnly: filters.freeOnly,
		price: filters.price,
		duration: filters.duration,
		sortBy: filters.sortBy,
	});

	return (
		<div className="flex flex-col">
			<CourseSearchHero
				q={filters.q}
				onQChange={filters.setQ}
				activeQuickFilter={activeQuickFilter}
				onApplyQuickFilter={filters.applyQuickFilter}
				hasFilters={filters.hasFilters}
				onClearAll={filters.clearAll}
			/>

			<div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 md:py-10">
				<div className="flex flex-col gap-8 md:flex-row md:items-start">
					{/* Desktop sidebar — sticky filter rail at md+. Sticky is on the
					    aside itself (not on a wrapper div) so the flex parent's full
					    height becomes the sticky container; otherwise the rail only
					    has its own intrinsic height to "stick" inside, which is no
					    sticky at all.

					    `top-20` (5rem = 80px) clears the 64-px AppHeader plus a 16-px
					    breathing space — `top-4` slid the rail behind the header
					    when the user scrolled. */}
					<aside className="hidden w-[240px] shrink-0 self-start md:sticky md:top-20 md:block">
						<div className="space-y-6">
							<CourseFilterPanels
								categories={CATEGORIES}
								price={filters.price}
								freeOnly={filters.freeOnly}
								sortBy={filters.sortBy}
								onPriceChange={handlePriceChange}
								onSortChange={filters.setSortBy}
							/>
						</div>
					</aside>

					<div className="min-w-0 flex-1">{children}</div>
				</div>
			</div>

			<CourseFilterMobileSheet
				open={mobileOpen}
				onOpenChange={setMobileOpen}
				hasFilters={filters.hasFilters}
				onClearAll={filters.clearAll}
				price={filters.price}
				freeOnly={filters.freeOnly}
				sortBy={filters.sortBy}
				onPriceChange={handlePriceChange}
				onSortChange={filters.setSortBy}
			/>
		</div>
	);
}
