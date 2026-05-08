"use client";

import { usePathname, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type EnrollmentTab = "all" | "in_progress" | "completed" | "pending";
export type EnrollmentSort = "newest" | "progress" | "alpha";

export interface EnrollmentCounts {
	all: number;
	in_progress: number;
	completed: number;
	pending: number;
}

interface EnrollmentsFilterBarProps {
	active: EnrollmentTab;
	sort: EnrollmentSort;
	counts: EnrollmentCounts;
}

const TABS: Array<{ value: EnrollmentTab; label: string }> = [
	{ value: "all", label: "ทั้งหมด" },
	{ value: "in_progress", label: "กำลังเรียน" },
	{ value: "completed", label: "จบแล้ว" },
	{ value: "pending", label: "รอดำเนินการ" },
];

const SORT_LABELS: Record<EnrollmentSort, string> = {
	newest: "ใหม่ล่าสุด",
	progress: "ความคืบหน้า",
	alpha: "ตามตัวอักษร",
};

/**
 * URL-driven filter row for /account/enrollments. Tabs partition the list
 * by enrollment state (with badge counts), the sort dropdown reorders.
 * Both push to the same `?tab=&sort=` query so the server can render the
 * filtered view without client-side data fetches.
 */
export function EnrollmentsFilterBar({
	active,
	sort,
	counts,
}: EnrollmentsFilterBarProps) {
	const router = useRouter();
	const pathname = usePathname();

	function pushUrl(next: { tab?: EnrollmentTab; sort?: EnrollmentSort }) {
		const params = new URLSearchParams();
		const tab = next.tab ?? active;
		const s = next.sort ?? sort;
		if (tab !== "all") params.set("tab", tab);
		if (s !== "newest") params.set("sort", s);
		const qs = params.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
	}

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<Tabs
				value={active}
				onValueChange={(v) => pushUrl({ tab: v as EnrollmentTab })}
			>
				<TabsList>
					{TABS.map((t) => (
						<TabsTrigger key={t.value} value={t.value}>
							{t.label}
							<Badge
								variant={t.value === active ? "primary" : "neutral"}
								className="ml-1"
							>
								<span className="num">{counts[t.value]}</span>
							</Badge>
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>
			<label className="flex items-center gap-2 text-uism text-muted-foreground">
				<span>เรียงตาม</span>
				<select
					aria-label="เรียงตาม"
					value={sort}
					onChange={(e) =>
						pushUrl({ sort: e.target.value as EnrollmentSort })
					}
					className="h-9 rounded-input border border-border bg-card px-2 text-uism font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
				>
					{Object.entries(SORT_LABELS).map(([v, label]) => (
						<option key={v} value={v}>
							{label}
						</option>
					))}
				</select>
			</label>
		</div>
	);
}
