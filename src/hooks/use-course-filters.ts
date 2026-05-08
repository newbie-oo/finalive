"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { QuickFilterType } from "@/components/courses/course-filter-options";

interface UseCourseFiltersOptions {
	initialQ: string;
	initialFreeOnly: boolean;
	initialPrice: string;
	initialDuration: string;
	initialSort: string;
}

interface UseCourseFiltersReturn {
	q: string;
	setQ: (v: string) => void;
	freeOnly: boolean;
	setFreeOnly: (v: boolean) => void;
	price: string;
	setPrice: (v: string) => void;
	duration: string;
	setDuration: (v: string) => void;
	sortBy: string;
	setSortBy: (v: string) => void;
	hasFilters: boolean;
	clearAll: () => void;
	applyQuickFilter: (type: QuickFilterType) => void;
}

/**
 * Owns the catalog filter state and pushes it back to the URL search params
 * (debounced). Decoupled from the visual layer so the page can mount the
 * desktop rail and the mobile sheet without the URL-sync logic forking.
 */
export function useCourseFilters({
	initialQ,
	initialFreeOnly,
	initialPrice,
	initialDuration,
	initialSort,
}: UseCourseFiltersOptions): UseCourseFiltersReturn {
	const router = useRouter();
	const [q, setQ] = useState(initialQ);
	const [freeOnly, setFreeOnly] = useState(initialFreeOnly);
	const [price, setPrice] = useState(initialPrice);
	const [duration, setDuration] = useState(initialDuration);
	const [sortBy, setSortBy] = useState(initialSort);
	const debouncedQ = useDebouncedValue(q, 300);
	const isFirstRun = useRef(true);

	const hasFilters = Boolean(
		q.trim() || freeOnly || price || duration || sortBy !== "newest",
	);

	useEffect(() => {
		if (isFirstRun.current) {
			isFirstRun.current = false;
			return;
		}
		const next = new URLSearchParams();
		if (debouncedQ.trim()) next.set("q", debouncedQ.trim());
		if (freeOnly) next.set("free", "1");
		if (price) next.set("price", price);
		if (duration) next.set("duration", duration);
		if (sortBy && sortBy !== "newest") next.set("sort", sortBy);
		const qs = next.toString();
		router.replace(qs ? `/courses?${qs}` : "/courses", { scroll: false });
	}, [debouncedQ, freeOnly, price, duration, sortBy, router]);

	const resetFacets = () => {
		setFreeOnly(false);
		setPrice("");
		setDuration("");
		setSortBy("newest");
	};

	const clearAll = () => {
		setQ("");
		resetFacets();
	};

	const applyQuickFilter = (type: QuickFilterType) => {
		setQ("");
		// "free" and "duration" toggle off when re-clicked.
		if (type === "free") {
			const nextPrice = price === "free" ? "" : "free";
			resetFacets();
			setPrice(nextPrice);
			return;
		}
		if (type === "duration") {
			const nextDuration = duration === "60-300" ? "" : "60-300";
			resetFacets();
			setDuration(nextDuration);
			return;
		}
		resetFacets();
		if (type === "popular") setSortBy("popular");
	};

	return {
		q,
		setQ,
		freeOnly,
		setFreeOnly,
		price,
		setPrice,
		duration,
		setDuration,
		sortBy,
		setSortBy,
		hasFilters,
		clearAll,
		applyQuickFilter,
	};
}
