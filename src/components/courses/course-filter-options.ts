export const PRICE_OPTIONS = [
	{ label: "ทั้งหมด", value: "" },
	{ label: "ฟรี", value: "free" },
	{ label: "฿1-฿1,000", value: "1-1000" },
	{ label: "฿1,000-฿5,000", value: "1000-5000" },
	{ label: "มากกว่า ฿5,000", value: "5000+" },
] as const;

export const SORT_OPTIONS = [
	{ label: "ยอดนิยม", value: "popular" },
	{ label: "ใหม่ล่าสุด", value: "newest" },
	{ label: "ราคาต่ำ-สูง", value: "price_asc" },
	{ label: "ราคาสูง-ต่ำ", value: "price_desc" },
] as const;

export const QUICK_FILTERS = [
	{ label: "ทั้งหมด", type: "all" as const },
	{ label: "ฟรี", type: "free" as const },
	{ label: "1-5 ชม.", type: "duration" as const },
	{ label: "ยอดนิยม", type: "popular" as const },
	{ label: "ใหม่ล่าสุด", type: "newest" as const },
] as const;

export type QuickFilterType = (typeof QUICK_FILTERS)[number]["type"];

export const CATEGORIES = [
	{ label: "การวิเคราะห์หุ้น", count: 5 },
	{ label: "การเงินส่วนบุคคล", count: 3 },
	{ label: "Excel & Modeling", count: 2 },
	{ label: "การลงทุน", count: 4 },
	{ label: "งบการเงิน", count: 2 },
] as const;

interface QuickFilterState {
	q: string;
	freeOnly: boolean;
	price: string;
	duration: string;
	sortBy: string;
}

/** Maps the current filter state back to the matching quick-filter chip, or
 * null when no chip cleanly represents the state (e.g. a search query is
 * active or multiple facets are combined). */
export function getActiveQuickFilter(
	state: QuickFilterState,
): QuickFilterType | null {
	const { q, freeOnly, price, duration, sortBy } = state;
	if (q.trim()) return null;
	if (freeOnly || price === "free") return "free";
	if (duration === "60-300") return "duration";
	const noFacets = !price && !duration && !freeOnly;
	if (sortBy === "popular" && !price && !duration) return "popular";
	if (sortBy === "newest" && noFacets) return "all";
	return null;
}
