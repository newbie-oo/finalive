"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
	MagnifyingGlass,
	X,
	CaretDown,
	Faders,
	Check,
} from "@phosphor-icons/react";

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
		next.delete("page");
		const qs = next.toString();
		router.replace(qs ? `/courses?${qs}` : "/courses", { scroll: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedQ, freeOnly, price, duration, sortBy, router]);

	const handleClear = () => {
		setQ("");
		setFreeOnly(false);
		setPrice("");
		setDuration("");
		setSortBy("newest");
	};

	const activeQuickFilter = q.trim()
		? null
		: freeOnly || price === "free"
			? "free"
			: duration === "60-300"
				? "duration"
				: sortBy === "popular" && !price && !duration
					? "popular"
					: sortBy === "newest" && !price && !duration && !freeOnly
						? "all"
						: null;

	const handleQuickFilter = (type: (typeof QUICK_FILTERS)[number]["type"]) => {
		setQ("");
		if (type === "all") {
			setFreeOnly(false);
			setPrice("");
			setDuration("");
			setSortBy("newest");
		} else if (type === "free") {
			setFreeOnly(false);
			setPrice(price === "free" ? "" : "free");
			setDuration("");
			setSortBy("newest");
		} else if (type === "duration") {
			setFreeOnly(false);
			setPrice("");
			setDuration(duration === "60-300" ? "" : "60-300");
			setSortBy("newest");
		} else if (type === "popular") {
			setFreeOnly(false);
			setPrice("");
			setDuration("");
			setSortBy("popular");
		} else if (type === "newest") {
			setFreeOnly(false);
			setPrice("");
			setDuration("");
			setSortBy("newest");
		}
	};

	return (
		<div className="flex flex-col">
			{/* Search Header */}
			<div className="bg-(--surface-muted)">
				<div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
					<div className="mx-auto max-w-2xl text-center">
						<h1 className="text-h1">คอร์สทั้งหมด</h1>
						<p className="mt-2 text-bodylg text-(--foreground-muted)">
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
								className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-(--foreground-subtle)"
							/>
							<input
								id="q"
								name="q"
								type="search"
								value={q}
								onChange={(e) => setQ(e.target.value)}
								placeholder="ค้นหาคอร์ส (ชื่อหรือคำอธิบาย)"
								className="h-14 w-full rounded-full border border-(--border) bg-(--surface) py-3 pl-14 pr-5 text-body shadow-(--shadow-sm-token) outline-none transition-[border-color,box-shadow] focus:border-(--primary) focus:shadow-[0_0_0_3px_rgba(79,70,229,0.12)]"
							/>
							{q && (
								<button
									type="button"
									onClick={() => setQ("")}
									className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-(--foreground-subtle) hover:bg-(--surface-muted) hover:text-(--foreground)"
									aria-label="ล้างการค้นหา"
								>
									<X size={16} />
								</button>
							)}
						</div>
					</div>

					{/* Quick filter chips */}
					<div className="mt-6 flex flex-wrap items-center justify-center gap-2">
						{QUICK_FILTERS.map((chip) => {
							const active = activeQuickFilter === chip.type;
							return (
								<button
									key={chip.type}
									type="button"
									onClick={() => handleQuickFilter(chip.type)}
									className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-ui font-medium transition-colors ${
										active
											? "bg-(--primary) text-white"
											: "border border-(--border) bg-(--surface) text-(--foreground-muted) hover:border-(--border-strong) hover:text-(--foreground)"
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
								className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-ui text-(--foreground-subtle) transition-colors hover:bg-(--surface) hover:text-(--foreground)"
							>
								<X size={14} />
								ล้างตัวกรอง
							</button>
						)}
					</div>
				</div>
			</div>

			{/* 2-column layout */}
			<div className="mx-auto max-w-[1200px] px-6 py-8 md:py-10">
				<div className="flex flex-col gap-8 md:flex-row md:items-start">
					{/* Sidebar */}
					<aside className="w-full shrink-0 md:w-[240px]">
						<div className="md:sticky md:top-4 md:self-start">
							{/* Mobile filter toggle */}
							<button
								type="button"
								onClick={() => setMobileOpen((v) => !v)}
								className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-button border border-(--border) bg-(--surface) py-2.5 text-ui md:hidden"
								aria-expanded={mobileOpen}
							>
								<Faders size={16} />
								ตัวกรอง
								{hasFilters && (
									<span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-(--primary) text-[10px] font-bold text-white">
										!
									</span>
								)}
							</button>

							<div
								className={`space-y-6 ${mobileOpen ? "block" : "hidden md:block"}`}
							>
								{/* Categories */}
								<div className="rounded-card border border-(--border) bg-(--surface) p-4">
									<h3 className="mb-3 text-uism font-semibold text-(--foreground)">
										หมวดหมู่
									</h3>
									<ul className="space-y-2.5">
										{CATEGORIES.map((cat) => (
											<li key={cat.label}>
												<label className="flex cursor-pointer items-center gap-2.5 text-ui text-(--foreground-muted) transition-colors hover:text-(--foreground)">
													<input
														type="checkbox"
														className="h-4 w-4 rounded border-(--border) accent-(--primary)"
													/>
													<span className="flex-1">{cat.label}</span>
													<span className="num text-caption text-(--foreground-subtle)">
														({cat.count})
													</span>
												</label>
											</li>
										))}
									</ul>
								</div>

								{/* Price */}
								<div className="rounded-card border border-(--border) bg-(--surface) p-4">
									<h3 className="mb-3 text-uism font-semibold text-(--foreground)">
										ราคา
									</h3>
									<ul className="space-y-2.5">
										{PRICE_OPTIONS.map((o) => (
											<li key={o.value}>
												<label className="flex cursor-pointer items-center gap-2.5 text-ui text-(--foreground-muted) transition-colors hover:text-(--foreground)">
													<input
														type="radio"
														name="price"
														checked={
															price === o.value ||
															(o.value === "free" && freeOnly)
														}
														onChange={() => {
															setPrice(o.value);
															if (o.value === "free") setFreeOnly(true);
															else setFreeOnly(false);
														}}
														className="h-4 w-4 accent-(--primary)"
													/>
													<span>{o.label}</span>
												</label>
											</li>
										))}
									</ul>
								</div>

								{/* Sort */}
								<div className="rounded-card border border-(--border) bg-(--surface) p-4">
									<h3 className="mb-3 text-uism font-semibold text-(--foreground)">
										เรียงลำดับ
									</h3>
									<div className="relative">
										<select
											value={sortBy}
											onChange={(e) => setSortBy(e.target.value)}
											className="h-10 w-full appearance-none rounded-button border border-(--border) bg-(--surface) px-3 pr-8 text-ui outline-none focus:border-(--primary)"
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
											className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-(--foreground-muted)"
										/>
									</div>
								</div>
							</div>
						</div>
					</aside>

					{/* Main content */}
					<div className="min-w-0 flex-1">{children}</div>
				</div>
			</div>
		</div>
	);
}
