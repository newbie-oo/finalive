import { MONTH_LABELS_TH } from "@/lib/format-time";

interface ActivityHeatmapProps {
	/** 35 cells = 7 days × 5 weeks, each value 0–4 (intensity bucket). */
	readonly heatmap: ReadonlyArray<number>;
	readonly weeklyWatchedSeconds: number;
}

const DAY_LABELS = ["", "อ.", "", "พฤ.", "", "ส.", ""] as const;

/**
 * 5-week activity heatmap for the student dashboard. Each cell carries an
 * `aria-label` so screen readers can interpret the intensity grid; the whole
 * widget is also exposed as a labelled image region.
 */
export function ActivityHeatmap({
	heatmap,
	weeklyWatchedSeconds,
}: ActivityHeatmapProps) {
	const weeklyHours = (weeklyWatchedSeconds / 3600).toFixed(1);
	return (
		<div className="rounded-card border border-border bg-card p-6">
			<div className="mb-1 flex items-baseline justify-between">
				<h3 className="text-h3 font-bold text-foreground">
					ความคืบหน้า 5 สัปดาห์
				</h3>
				<span className="text-uism font-semibold text-primary">
					<span className="num">{weeklyHours}</span> ชม. สัปดาห์นี้
				</span>
			</div>
			<p className="mb-6 text-caption text-muted-foreground">
				แต่ละช่อง = 1 วัน · เข้มขึ้น = เรียนนานขึ้น
			</p>
			<div
				role="img"
				aria-label={`ความคืบหน้า 5 สัปดาห์ — ${weeklyHours} ชั่วโมงในสัปดาห์นี้`}
				className="flex gap-4"
			>
				<div className="flex flex-col gap-1 pt-7">
					{DAY_LABELS.map((d, i) => (
						<div key={i} className="h-3 text-caption text-muted-foreground">
							{d}
						</div>
					))}
				</div>
				<div className="flex-1">
					<div className="mb-2 flex justify-between px-1">
						{MONTH_LABELS_TH.slice(0, 5).map((m) => (
							<span key={m} className="text-caption text-muted-foreground">
								{m}
							</span>
						))}
					</div>
					<div className="grid grid-flow-col grid-cols-[repeat(35,1fr)] grid-rows-7 gap-1">
						{heatmap.map((lvl, i) => (
							<div
								key={i}
								data-testid="heatmap-cell"
								aria-label={`ระดับ ${lvl} จาก 4`}
								className="aspect-square rounded-[3px]"
								style={{ backgroundColor: `var(--heat-${lvl})` }}
							/>
						))}
					</div>
				</div>
			</div>
			<div
				className="mt-4 flex items-center justify-end gap-2"
				aria-hidden
			>
				<span className="text-caption text-muted-foreground">น้อย</span>
				{[0, 1, 2, 3, 4].map((l) => (
					<div
						key={l}
						className="h-3 w-3 rounded-[3px]"
						style={{ backgroundColor: `var(--heat-${l})` }}
					/>
				))}
				<span className="text-caption text-muted-foreground">มาก</span>
			</div>
		</div>
	);
}
