"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { Faders, X, CaretDown } from "@phosphor-icons/react";

const PRICE_OPTIONS = [
	{ label: "ทั้งหมด", value: "" },
	{ label: "ฟรี", value: "free" },
	{ label: "1-1,000฿", value: "1-1000" },
	{ label: "1,000-5,000฿", value: "1000-5000" },
	{ label: "5,000+฿", value: "5000+" },
];

const DURATION_OPTIONS = [
	{ label: "ทั้งหมด", value: "" },
	{ label: "<1 ชม.", value: "0-60" },
	{ label: "1-5 ชม.", value: "60-300" },
	{ label: "5+ ชม.", value: "300+" },
];

const SORT_OPTIONS = [
	{ label: "ใหม่ล่าสุด", value: "newest" },
	{ label: "ราคาต่ำ→สูง", value: "price_asc" },
	{ label: "ราคาสูง→ต่ำ", value: "price_desc" },
	{ label: "ยอดนิยม", value: "popular" },
];

interface CourseFiltersProps {
	initialQ: string;
	initialFreeOnly: boolean;
	initialPrice?: string;
	initialDuration?: string;
	initialSort?: string;
}

export function CourseFilters({
	initialQ,
	initialFreeOnly,
	initialPrice = "",
	initialDuration = "",
	initialSort = "newest",
}: CourseFiltersProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
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
		// Skip the initial mount so we don't bounce a router.replace on render.
		if (isFirstRun.current) {
			isFirstRun.current = false;
			return;
		}
		const next = new URLSearchParams(searchParams.toString());
		if (debouncedQ.trim()) next.set("q", debouncedQ.trim());
		else next.delete("q");
		if (freeOnly) next.set("free", "1");
		else next.delete("free");
		if (price) next.set("price", price);
		else next.delete("price");
		if (duration) next.set("duration", duration);
		else next.delete("duration");
		if (sortBy && sortBy !== "newest") next.set("sort", sortBy);
		else next.delete("sort");
		// Reset pagination when filters change.
		next.delete("page");
		const qs = next.toString();
		router.replace(qs ? `/courses?${qs}` : "/courses", { scroll: false });
		// searchParams omitted on purpose: we read once and write back; reading here
		// would cause an infinite loop on the URL we just set.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedQ, freeOnly, price, duration, sortBy, router]);

	const handleClear = () => {
		setQ("");
		setFreeOnly(false);
		setPrice("");
		setDuration("");
		setSortBy("newest");
	};

	return (
		<div className="space-y-4">
			{/* Top row: search + sort + mobile toggle */}
			<div className="flex flex-wrap items-center gap-3">
				<label className="sr-only" htmlFor="q">
					ค้นหาคอร์ส
				</label>
				<input
					id="q"
					name="q"
					type="search"
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder="ค้นหาคอร์ส (ชื่อหรือคำอธิบาย)"
					className="h-10 w-full rounded-button border border-(--border) bg-(--surface) px-3 text-ui sm:w-72"
				/>

				{/* Sort dropdown (desktop) */}
				<div className="relative hidden sm:block">
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value)}
						className="h-10 appearance-none rounded-button border border-(--border) bg-(--surface) px-3 pr-8 text-ui"
						aria-label="เรียงลำดับ"
					>
						{SORT_OPTIONS.map((o) => (
							<option key={o.value} value={o.value}>
								{o.label}
							</option>
						))}
					</select>
					<CaretDown
						size={14}
						className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-(--foreground-muted)"
					/>
				</div>

				{/* Mobile filter toggle */}
				<button
					type="button"
					onClick={() => setMobileOpen((v) => !v)}
					className="inline-flex h-10 items-center gap-2 rounded-button border border-(--border) bg-(--surface) px-3 text-ui sm:hidden"
					aria-expanded={mobileOpen}
				>
					<Faders size={16} />
					ตัวกรอง
					{hasFilters && (
						<span className="flex h-4 w-4 items-center justify-center rounded-full bg-(--primary) text-[10px] font-bold text-white">
							!
						</span>
					)}
				</button>

				{hasFilters && (
					<button
						type="button"
						onClick={handleClear}
						className="inline-flex h-10 items-center gap-1 rounded-button px-3 text-ui text-(--foreground-muted) transition-colors hover:bg-(--surface-muted)"
					>
						<X size={14} />
						ล้าง
					</button>
				)}
			</div>

			{/* Desktop filter chips */}
			<div className="hidden sm:block">
				<div className="flex flex-wrap gap-2" data-testid="filter-chips">
					{PRICE_OPTIONS.filter((o) => o.value).map((o) => (
						<button
							key={o.value}
							type="button"
							onClick={() => setPrice(price === o.value ? "" : o.value)}
							className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-ui font-medium transition-colors ${
								price === o.value
									? "bg-(--primary) text-white"
									: "bg-(--surface-muted) text-(--foreground-muted) hover:bg-(--surface)"
							}`}
							aria-pressed={price === o.value}
						>
							{o.label}
						</button>
					))}
					{DURATION_OPTIONS.filter((o) => o.value).map((o) => (
						<button
							key={o.value}
							type="button"
							onClick={() => setDuration(duration === o.value ? "" : o.value)}
							className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-ui font-medium transition-colors ${
								duration === o.value
									? "bg-(--primary) text-white"
									: "bg-(--surface-muted) text-(--foreground-muted) hover:bg-(--surface)"
							}`}
							aria-pressed={duration === o.value}
						>
							{o.label}
						</button>
					))}
				</div>
			</div>

			{/* Mobile filter panel */}
			{mobileOpen && (
				<div className="space-y-4 rounded-card border border-(--border) bg-(--surface) p-4 sm:hidden">
					<div>
						<span className="mb-2 block text-caption font-medium text-(--foreground-muted)">
							ช่วงราคา
						</span>
						<div className="flex flex-wrap gap-2">
							{PRICE_OPTIONS.map((o) => (
								<button
									key={o.value}
									type="button"
									onClick={() => setPrice(price === o.value ? "" : o.value)}
									className={`inline-flex h-8 items-center rounded-full px-3 text-ui font-medium transition-colors ${
										price === o.value
											? "bg-(--primary) text-white"
											: "bg-(--surface-muted) text-(--foreground-muted)"
									}`}
								>
									{o.label}
								</button>
							))}
						</div>
					</div>
					<div>
						<span className="mb-2 block text-caption font-medium text-(--foreground-muted)">
							ระยะเวลา
						</span>
						<div className="flex flex-wrap gap-2">
							{DURATION_OPTIONS.map((o) => (
								<button
									key={o.value}
									type="button"
									onClick={() =>
										setDuration(duration === o.value ? "" : o.value)
									}
									className={`inline-flex h-8 items-center rounded-full px-3 text-ui font-medium transition-colors ${
										duration === o.value
											? "bg-(--primary) text-white"
											: "bg-(--surface-muted) text-(--foreground-muted)"
									}`}
								>
									{o.label}
								</button>
							))}
						</div>
					</div>
					<div>
						<span className="mb-2 block text-caption font-medium text-(--foreground-muted)">
							เรียงลำดับ
						</span>
						<div className="flex flex-wrap gap-2">
							{SORT_OPTIONS.map((o) => (
								<button
									key={o.value}
									type="button"
									onClick={() => setSortBy(o.value)}
									className={`inline-flex h-8 items-center rounded-full px-3 text-ui font-medium transition-colors ${
										sortBy === o.value
											? "bg-(--primary) text-white"
											: "bg-(--surface-muted) text-(--foreground-muted)"
									}`}
								>
									{o.label}
								</button>
							))}
						</div>
					</div>
					<label className="inline-flex items-center gap-2 text-ui">
						<input
							type="checkbox"
							checked={freeOnly}
							onChange={(e) => setFreeOnly(e.target.checked)}
							className="h-4 w-4 accent-(--primary)"
						/>
						เฉพาะคอร์สฟรี
					</label>
				</div>
			)}
		</div>
	);
}
