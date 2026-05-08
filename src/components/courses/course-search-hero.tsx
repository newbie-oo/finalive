import { MagnifyingGlass, X, Check } from "@phosphor-icons/react/dist/ssr";
import {
	QUICK_FILTERS,
	type QuickFilterType,
} from "./course-filter-options";

interface CourseSearchHeroProps {
	q: string;
	onQChange: (v: string) => void;
	activeQuickFilter: QuickFilterType | null;
	onApplyQuickFilter: (type: QuickFilterType) => void;
	hasFilters: boolean;
	onClearAll: () => void;
}

export function CourseSearchHero({
	q,
	onQChange,
	activeQuickFilter,
	onApplyQuickFilter,
	hasFilters,
	onClearAll,
}: CourseSearchHeroProps) {
	return (
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
							onChange={(e) => onQChange(e.target.value)}
							placeholder="ค้นหาคอร์ส (ชื่อหรือคำอธิบาย)"
							className="h-14 w-full rounded-full border border-border bg-card py-3 pl-14 pr-5 text-body shadow-(--shadow-sm-token) outline-hidden transition-[border-color,box-shadow] focus:border-primary focus:shadow-[0_0_0_3px_rgba(79,70,229,0.12)]"
						/>
						{q && (
							<button
								type="button"
								onClick={() => onQChange("")}
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
								onClick={() => onApplyQuickFilter(chip.type)}
								className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-ui font-medium transition-colors ${
									active
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
							onClick={onClearAll}
							className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-ui text-foreground-subtle transition-colors hover:bg-card hover:text-foreground"
						>
							<X size={14} />
							ล้างตัวกรอง
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
