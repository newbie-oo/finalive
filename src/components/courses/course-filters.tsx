"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
	MagnifyingGlass,
	X,
	Faders,
	Check,
} from "@phosphor-icons/react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const PRICE_OPTIONS = [
	{ label: "ทั้งหมด", value: "" },
	{ label: "ฟรี", value: "free" },
	{ label: "฿1-฿1,000", value: "1-1000" },
	{ label: "฿1,000-฿5,000", value: "1000-5000" },
	{ label: "มากกว่า ฿5,000", value: "5000+" },
];

const SORT_OPTIONS = [
	{ label: "ยอดนิยม", value: "popular" },
	{ label: "ใหม่ล่าสุด", value: "newest" },
	{ label: "ราคาต่ำ-สูง", value: "price_asc" },
	{ label: "ราคาสูง-ต่ำ", value: "price_desc" },
];

const QUICK_FILTERS = [
	{ label: "ทั้งหมด", type: "all" as const },
	{ label: "ฟรี", type: "free" as const },
	{ label: "1-5 ชม.", type: "duration" as const },
	{ label: "ยอดนิยม", type: "popular" as const },
	{ label: "ใหม่ล่าสุด", type: "newest" as const },
];

const CATEGORIES = [
	{ label: "การวิเคราะห์หุ้น", count: 5 },
	{ label: "การเงินส่วนบุคคล", count: 3 },
	{ label: "Excel & Modeling", count: 2 },
	{ label: "การลงทุน", count: 4 },
	{ label: "งบการเงิน", count: 2 },
];

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
	const router = useRouter();
	const [q, setQ] = useState(initialQ);
	const [freeOnly, setFreeOnly] = useState(initialFreeOnly);
	const [price, setPrice] = useState(initialPrice);
	const [duration, setDuration] = useState(initialDuration);
	const [sortBy, setSortBy] = useState(initialSort);
	const [mobileOpen, setMobileOpen] = useState(false);
	const debouncedQ = useDebouncedValue(q, 300);
	const isFirstRun = useRef(true);

	const hasFilters =
		q.trim() || freeOnly || price || duration || sortBy !== "newest";

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

	const resetFilters = () => {
		setFreeOnly(false);
		setPrice("");
		setDuration("");
		setSortBy("newest");
	};

	const handleClear = () => {
		setQ("");
		resetFilters();
	};

	const activeQuickFilter = getActiveQuickFilter({
		q,
		freeOnly,
		price,
		duration,
		sortBy,
	});

	const handleQuickFilter = (type: (typeof QUICK_FILTERS)[number]["type"]) => {
		setQ("");
		// Each quick filter behaves like "reset, then apply this single facet".
		// "free" and "duration" toggle off when re-clicked.
		if (type === "free") {
			const next = price === "free" ? "" : "free";
			resetFilters();
			setPrice(next);
			return;
		}
		if (type === "duration") {
			const next = duration === "60-300" ? "" : "60-300";
			resetFilters();
			setDuration(next);
			return;
		}
		resetFilters();
		if (type === "popular") setSortBy("popular");
	};

	return (
		<div className="flex flex-col">
			<div className="bg-muted">
				<div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
					<div className="mx-auto max-w-2xl text-center">
						<h1 className="text-h1">คอร์สทั้งหมด</h1>
						<p className="mt-2 text-bodylg text-muted-foreground">
							ค้นหาคอร์สที่เหมาะกับเป้าหมายของคุณ
						</p>
					</div>

					<div className="mx-auto mt-8 max-w-xl">
						<label className="sr-only" htmlFor="q">
							ค้นหาคอร์ส
						</label>
						<div className="relative">
							<MagnifyingGlass
								size={20}
								className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-foreground-subtle"
							/>
							<input
								id="q"
								name="q"
								type="search"
								value={q}
								onChange={(e) => setQ(e.target.value)}
								placeholder="ค้นหาคอร์ส (ชื่อหรือคำอธิบาย)"
								className="h-14 w-full rounded-full border border-border bg-card py-3 pl-14 pr-5 text-body shadow-(--shadow-sm-token) outline-hidden transition-[border-color,box-shadow] focus:border-primary focus:shadow-[0_0_0_3px_rgba(79,70,229,0.12)]"
							/>
							{q && (
								<button
									type="button"
									onClick={() => setQ("")}
									className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-foreground-subtle hover:bg-muted hover:text-foreground"
									aria-label="Clear search"
								>
									<X size={16} />
								</button>
							)}
						</div>
					</div>

					<div className="mt-6 flex flex-wrap items-center justify-center gap-2">
						{QUICK_FILTERS.map((chip) => {
							const active = activeQuickFilter === chip.type;
							return (
								<button
									key={chip.type}
									type="button"
									onClick={() => handleQuickFilter(chip.type)}
									className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-ui font-medium transition-colors ${active
											? "bg-primary text-white"
											: "border border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground"
										}`}
									aria-pressed={active}
								>
									{active && <Check size={14} weight="bold" />}
									{chip.label}
								</button>
							);
						})}
						{hasFilters && (
							<button
								type="button"
								onClick={handleClear}
								className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-ui text-foreground-subtle transition-colors hover:bg-card hover:text-foreground"
							>
								<X size={14} />
								ล้างตัวกรอง
							</button>
						)}
					</div>
				</div>
			</div>

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
							<FilterPanels
								categories={CATEGORIES}
								price={price}
								freeOnly={freeOnly}
								sortBy={sortBy}
								onPriceChange={(v) => {
									setPrice(v);
									setFreeOnly(v === "free");
								}}
								onSortChange={setSortBy}
							/>
						</div>
					</aside>

					<div className="min-w-0 flex-1">{children}</div>
				</div>
			</div>

			{/* Mobile filter sheet — floating bottom button opens a shadcn Sheet
			    so the filter rail no longer pushes results off-screen on small
			    viewports. Hidden on md+ where the desktop rail is shown. */}
			<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
				<SheetTrigger asChild>
					<button
						type="button"
						className="fixed inset-x-4 bottom-4 z-30 inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-ui font-semibold text-primary-foreground shadow-(--shadow-lg) transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
					>
						<Faders size={16} weight="bold" />
						ตัวกรอง
						{hasFilters && (
							<span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-caption font-bold">
								•
							</span>
						)}
					</button>
				</SheetTrigger>
				<SheetContent
					side="bottom"
					className="max-h-[85vh] gap-0 rounded-t-card p-0"
				>
					<SheetHeader className="border-b border-border px-5 py-4">
						<SheetTitle>ตัวกรองคอร์ส</SheetTitle>
						<SheetDescription className="sr-only">
							เลือกหมวดหมู่ ราคา และการเรียงลำดับเพื่อกรองคอร์ส
						</SheetDescription>
					</SheetHeader>
					<div className="flex-1 space-y-6 overflow-y-auto p-5">
						<FilterPanels
							categories={CATEGORIES}
							price={price}
							freeOnly={freeOnly}
							sortBy={sortBy}
							onPriceChange={(v) => {
								setPrice(v);
								setFreeOnly(v === "free");
							}}
							onSortChange={setSortBy}
						/>
					</div>
					<SheetFooter className="flex-row gap-3 border-t border-border bg-background px-5 py-4">
						{hasFilters && (
							<Button
								type="button"
								variant="ghost"
								size="md"
								onClick={handleClear}
								className="flex-1"
							>
								ล้างทั้งหมด
							</Button>
						)}
						<Button
							type="button"
							variant="primary"
							size="md"
							onClick={() => setMobileOpen(false)}
							className="flex-[1.5]"
						>
							ดูคอร์ส
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</div>
	);
}

type QuickFilterType = (typeof QUICK_FILTERS)[number]["type"];

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
function getActiveQuickFilter(
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

interface FilterPanelsProps {
	categories: ReadonlyArray<{ readonly label: string; readonly count: number }>;
	price: string;
	freeOnly: boolean;
	sortBy: string;
	onPriceChange: (v: string) => void;
	onSortChange: (v: string) => void;
}

/** Filter form bodies, shared between the desktop sidebar and the mobile
 * Sheet. Stateless — caller owns the values + setters. */
function FilterPanels({
	categories,
	price,
	freeOnly,
	sortBy,
	onPriceChange,
	onSortChange,
}: FilterPanelsProps) {
	return (
		<>
			<div className="rounded-card border border-border bg-card p-4">
				<h3 className="mb-3 text-uism font-semibold text-foreground">
					หมวดหมู่
				</h3>
				<ul className="space-y-2.5">
					{categories.map((cat) => (
						<li key={cat.label}>
							<Label
								htmlFor={`cat-${cat.label}`}
								className="flex cursor-pointer items-center gap-2.5 text-ui font-normal text-muted-foreground transition-colors hover:text-foreground"
							>
								<Checkbox id={`cat-${cat.label}`} />
								<span className="flex-1">{cat.label}</span>
								<span className="num text-caption text-foreground-subtle">
									({cat.count})
								</span>
							</Label>
						</li>
					))}
				</ul>
			</div>

			<div className="rounded-card border border-border bg-card p-4">
				<h3 className="mb-3 text-uism font-semibold text-foreground">ราคา</h3>
				<RadioGroup
					value={price === "" && freeOnly ? "free" : price}
					onValueChange={onPriceChange}
					className="gap-2.5"
				>
					{PRICE_OPTIONS.map((o) => (
						<Label
							key={o.value || "all"}
							htmlFor={`price-${o.value || "all"}`}
							className="flex cursor-pointer items-center gap-2.5 text-ui font-normal text-muted-foreground transition-colors hover:text-foreground"
						>
							<RadioGroupItem
								id={`price-${o.value || "all"}`}
								value={o.value}
							/>
							<span>{o.label}</span>
						</Label>
					))}
				</RadioGroup>
			</div>

			<div className="rounded-card border border-border bg-card p-4">
				<h3 className="mb-3 text-uism font-semibold text-foreground">
					เรียงลำดับ
				</h3>
				<Select value={sortBy} onValueChange={onSortChange}>
					<SelectTrigger aria-label="Sort" className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{SORT_OPTIONS.map((o) => (
							<SelectItem key={o.value} value={o.value}>
								{o.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</>
	);
}
