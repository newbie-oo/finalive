import Link from "next/link";
import { X } from "@phosphor-icons/react/dist/ssr";

interface ActiveFilterChipsProps {
	q: string;
	freeOnly: boolean;
	price: string;
	duration: string;
	sort: string;
}

interface ActiveFilter {
	key: keyof Omit<ActiveFilterChipsProps, "freeOnly"> | "freeOnly";
	label: string;
}

const PRICE_LABELS: Record<string, string> = {
	free: "ฟรี",
	"1-1000": "ราคา ฿1–1,000",
	"1000-5000": "ราคา ฿1,000–5,000",
	"5000+": "ราคา ฿5,000+",
};

const DURATION_LABELS: Record<string, string> = {
	"0-60": "ไม่เกิน 1 ชม.",
	"60-300": "1–5 ชม.",
	"300+": "5+ ชม.",
};

const SORT_LABELS: Record<string, string> = {
	price_asc: "เรียงราคาต่ำ–สูง",
	price_desc: "เรียงราคาสูง–ต่ำ",
	popular: "ยอดนิยม",
};

/**
 * URL-driven chip bar for the courses catalog. Each active filter renders
 * as a link that removes only that filter while preserving the rest, plus
 * a clear-all link when there are 2+ active filters. Returns null when
 * nothing is active so callers can drop it in unconditionally.
 */
export function ActiveFilterChips(props: ActiveFilterChipsProps) {
	const active = collectActiveFilters(props);
	if (active.length === 0) return null;

	function hrefWithout(removeKey: ActiveFilter["key"]): string {
		const next = new URLSearchParams();
		if (props.q && removeKey !== "q") next.set("q", props.q);
		if (props.freeOnly && removeKey !== "freeOnly") next.set("free", "1");
		if (props.price && removeKey !== "price") next.set("price", props.price);
		if (props.duration && removeKey !== "duration")
			next.set("duration", props.duration);
		if (props.sort && props.sort !== "newest" && removeKey !== "sort")
			next.set("sort", props.sort);
		const qs = next.toString();
		return qs ? `/courses?${qs}` : "/courses";
	}

	return (
		<div className="mb-4 flex flex-wrap items-center gap-2">
			<span className="text-uism text-muted-foreground">ตัวกรองที่ใช้:</span>
			{active.map((filter) => (
				<Link
					key={filter.key}
					href={hrefWithout(filter.key)}
					className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-muted px-3 py-1 text-uism text-foreground transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
					aria-label={`ลบตัวกรอง: ${filter.label}`}
				>
					{filter.label}
					<X size={12} weight="bold" aria-hidden />
				</Link>
			))}
			{active.length > 1 && (
				<Link
					href="/courses"
					className="text-uism font-medium text-primary hover:underline"
				>
					ล้างทั้งหมด
				</Link>
			)}
		</div>
	);
}

function collectActiveFilters({
	q,
	freeOnly,
	price,
	duration,
	sort,
}: ActiveFilterChipsProps): ActiveFilter[] {
	const filters: ActiveFilter[] = [];
	if (q) filters.push({ key: "q", label: `ค้นหา: ${q}` });
	if (freeOnly) filters.push({ key: "freeOnly", label: "ฟรีเท่านั้น" });
	if (price && PRICE_LABELS[price])
		filters.push({ key: "price", label: PRICE_LABELS[price] });
	if (duration && DURATION_LABELS[duration])
		filters.push({ key: "duration", label: DURATION_LABELS[duration] });
	if (sort && sort !== "newest" && SORT_LABELS[sort])
		filters.push({ key: "sort", label: SORT_LABELS[sort] });
	return filters;
}
