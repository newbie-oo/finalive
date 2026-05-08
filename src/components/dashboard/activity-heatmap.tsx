import { MONTH_LABELS_TH } from "@/lib/format-time";

const COLS = 5;
const ROWS = 7;

const DAY_LABELS_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."] as const;

interface ActivityHeatmapProps {
	/**
	 * 35 cells filled column-by-column: cell 0 = oldest day, cell 34 = today.
	 * Each value is an intensity bucket (0–4).
	 */
	readonly heatmap: ReadonlyArray<number>;
	/**
	 * Date of the first cell (oldest day in the window). When provided, day-of-week
	 * and month labels align to real calendar dates instead of being decorative.
	 */
	readonly startDate?: Date;
}

interface HeatmapStats {
	readonly activeDays: number;
	readonly weekActiveDays: number;
	readonly topWeekdayLabel: string | null;
}

/**
 * 5-week activity heatmap for the student dashboard. Each cell carries an
 * `aria-label` so screen readers can interpret the intensity grid; the whole
 * widget is also exposed as a labelled image region.
 */
export function ActivityHeatmap({ heatmap, startDate }: ActivityHeatmapProps) {
	const dayLabels = buildDayLabels(startDate);
	const monthLabels = buildMonthLabels(startDate);
	const stats = computeStats(heatmap, startDate);

	return (
		<div className="rounded-card border border-border bg-card p-6">
			<h3 className="text-h3 font-bold text-foreground">
				ความคืบหน้า 5 สัปดาห์
			</h3>
			<p className="mt-1 text-caption text-muted-foreground">
				แต่ละช่อง = 1 วัน · เข้มขึ้น = เรียนนานขึ้น
			</p>

			<div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
				<div>
					<div
						role="img"
						aria-label={`ความคืบหน้า 5 สัปดาห์ — เรียน ${stats.weekActiveDays} จาก 7 วันสัปดาห์นี้`}
						className="flex gap-2"
					>
						<div className="flex flex-col gap-1 pt-7">
							{dayLabels.map((d, i) => (
								<div
									key={i}
									className="h-6 text-caption leading-6 text-muted-foreground"
								>
									{d}
								</div>
							))}
						</div>
						<div>
							<div className="mb-1 grid grid-cols-5 gap-1 text-center">
								{monthLabels.map((m, i) => (
									<span key={i} className="text-caption text-muted-foreground">
										{m}
									</span>
								))}
							</div>
							<div className="grid grid-flow-col grid-cols-5 grid-rows-7 gap-1">
								{heatmap.map((lvl, i) => (
									<div
										key={i}
										data-testid="heatmap-cell"
										aria-label={`ระดับ ${lvl} จาก 4`}
										className="h-6 w-6 rounded-[3px]"
										style={{ backgroundColor: `var(--heat-${lvl})` }}
									/>
								))}
							</div>
						</div>
					</div>
					<div
						className="ml-8 mt-3 flex items-center gap-2 text-caption text-muted-foreground"
						aria-hidden
					>
						<span>น้อย</span>
						<div className="flex items-center gap-1">
							{[0, 1, 2, 3, 4].map((l) => (
								<div
									key={l}
									className="h-3 w-3 rounded-[3px]"
									style={{ backgroundColor: `var(--heat-${l})` }}
								/>
							))}
						</div>
						<span>มาก</span>
					</div>
				</div>

				<dl className="space-y-3 text-sm lg:max-w-xs lg:flex-1 lg:border-l lg:border-border lg:pl-8">
					<StatRow
						label="สัปดาห์นี้"
						value={`${stats.weekActiveDays}`}
						suffix="/ 7 วัน"
					/>
					<StatRow
						label="ใน 5 สัปดาห์"
						value={`${stats.activeDays}`}
						suffix="/ 35 วัน"
					/>
					<StatRow
						label="วันที่เรียนบ่อยที่สุด"
						value={stats.topWeekdayLabel ?? "—"}
						monospace={stats.topWeekdayLabel === null}
					/>
				</dl>
			</div>
		</div>
	);
}

interface StatRowProps {
	readonly label: string;
	readonly value: string;
	readonly suffix?: string;
	readonly monospace?: boolean;
}

function StatRow({ label, value, suffix, monospace }: StatRowProps) {
	return (
		<div className="flex items-baseline justify-between gap-4">
			<dt className="text-caption text-muted-foreground">{label}</dt>
			<dd className="font-semibold text-foreground">
				<span className={monospace ? undefined : "num"}>{value}</span>
				{suffix && (
					<span className="ml-1 text-caption font-normal text-muted-foreground">
						{suffix}
					</span>
				)}
			</dd>
		</div>
	);
}

function buildDayLabels(startDate: Date | undefined): readonly string[] {
	if (!startDate) {
		return ["", "อ.", "", "พฤ.", "", "ส.", ""];
	}
	const startDow = startDate.getDay();
	const labels: string[] = [];
	for (let row = 0; row < ROWS; row++) {
		labels.push(row % 2 === 1 ? (DAY_LABELS_TH[(startDow + row) % 7] ?? "") : "");
	}
	return labels;
}

function buildMonthLabels(startDate: Date | undefined): readonly string[] {
	if (!startDate) {
		return Array.from({ length: COLS }, () => "");
	}
	const labels: string[] = [];
	let prevMonth = -1;
	for (let col = 0; col < COLS; col++) {
		const colStart = new Date(startDate);
		colStart.setDate(startDate.getDate() + col * 7);
		const month = colStart.getMonth();
		if (month === prevMonth) {
			labels.push("");
		} else {
			labels.push(MONTH_LABELS_TH[month] ?? "");
			prevMonth = month;
		}
	}
	return labels;
}

function computeStats(
	heatmap: readonly number[],
	startDate: Date | undefined,
): HeatmapStats {
	let activeDays = 0;
	for (const v of heatmap) if (v > 0) activeDays++;

	let weekActiveDays = 0;
	const weekStart = COLS * ROWS - ROWS;
	for (let i = weekStart; i < COLS * ROWS; i++) {
		if ((heatmap[i] ?? 0) > 0) weekActiveDays++;
	}

	let topWeekdayLabel: string | null = null;
	if (startDate) {
		const startDow = startDate.getDay();
		let bestRow = -1;
		let bestSum = 0;
		for (let row = 0; row < ROWS; row++) {
			let sum = 0;
			for (let col = 0; col < COLS; col++) {
				sum += heatmap[col * ROWS + row] ?? 0;
			}
			if (sum > bestSum) {
				bestSum = sum;
				bestRow = row;
			}
		}
		if (bestRow >= 0) {
			topWeekdayLabel = DAY_LABELS_TH[(startDow + bestRow) % 7] ?? null;
		}
	}

	return { activeDays, weekActiveDays, topWeekdayLabel };
}
