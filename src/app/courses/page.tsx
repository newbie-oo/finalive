import { Suspense } from "react";
import { PublicShell } from "@/components/layouts/public-shell";
import { CourseFilters } from "@/components/courses/course-filters";
import {
	CourseCatalog,
	CourseCatalogSkeleton,
} from "@/components/courses/course-catalog";
import {
	listPublishedCourses,
	type ListPublishedCoursesParams,
} from "@/server/repos/course";
import { offsetSchema, type SearchParams } from "@/lib/pagination";

export const dynamic = "force-dynamic";

async function CourseGrid({
	params,
	searchParams,
}: {
	params: ListPublishedCoursesParams;
	searchParams: string;
}) {
	const result = await listPublishedCourses(params);
	return <CourseCatalog result={result} searchParams={searchParams} />;
}

export default async function CoursesPage({
	searchParams,
}: {
	searchParams: SearchParams;
}) {
	const sp = await searchParams;
	const base = offsetSchema.parse({
		page: sp.page,
		per_page: sp.per_page ?? 12,
	});
	const q = typeof sp.q === "string" ? sp.q : "";
	let freeOnly = sp.free === "1" || sp.free === "true";
	const price = typeof sp.price === "string" ? sp.price : "";
	const duration = typeof sp.duration === "string" ? sp.duration : "";
	const sortBy = typeof sp.sort === "string" ? sp.sort : "newest";

	// Parse price range
	let priceMin: number | undefined;
	let priceMax: number | undefined;
	if (price === "free") {
		freeOnly = true;
	} else if (price === "1-1000") {
		priceMin = 1;
		priceMax = 1000;
	} else if (price === "1000-5000") {
		priceMin = 1000;
		priceMax = 5000;
	} else if (price === "5000+") {
		priceMin = 5000;
	}

	// Parse duration range (minutes)
	let durationMin: number | undefined;
	let durationMax: number | undefined;
	if (duration === "0-60") {
		durationMax = 60;
	} else if (duration === "60-300") {
		durationMin = 60;
		durationMax = 300;
	} else if (duration === "300+") {
		durationMin = 300;
	}

	const params: ListPublishedCoursesParams = {
		...base,
		q,
		freeOnly,
		priceMin,
		priceMax,
		durationMin,
		durationMax,
		sortBy: ["newest", "price_asc", "price_desc", "popular"].includes(sortBy)
			? (sortBy as ListPublishedCoursesParams["sortBy"])
			: "newest",
	};

	// Build query string for pagination to preserve filters
	const filterParams = new URLSearchParams();
	if (q) filterParams.set("q", q);
	if (freeOnly) filterParams.set("free", "1");
	if (price) filterParams.set("price", price);
	if (duration) filterParams.set("duration", duration);
	if (sortBy && sortBy !== "newest") filterParams.set("sort", sortBy);
	const filterQs = filterParams.toString();

	return (
		<PublicShell>
			<CourseFilters
				initialQ={q}
				initialFreeOnly={freeOnly}
				initialPrice={price}
				initialDuration={duration}
				initialSort={sortBy}
			>
				<Suspense fallback={<CourseCatalogSkeleton />}>
					<CourseGrid params={params} searchParams={filterQs} />
				</Suspense>
			</CourseFilters>
		</PublicShell>
	);
}
