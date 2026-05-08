interface CurriculumProgressHeaderProps {
	progressPct: number;
	doneCount: number;
	lessonCount: number;
	remainingSeconds: number;
}

function fmtHours(seconds: number): string {
	return (seconds / 3600).toFixed(1);
}

function CircularProgress({ pct, size = 64 }: { pct: number; size?: number }) {
	const stroke = 6;
	const r = (size - stroke) / 2;
	const C = 2 * Math.PI * r;
	const dash = (pct / 100) * C;
	return (
		<div className="relative" style={{ width: size, height: size }}>
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke="var(--border)"
					strokeWidth={stroke}
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke="var(--primary)"
					strokeWidth={stroke}
					strokeDasharray={`${dash} ${C}`}
					strokeLinecap="round"
					transform={`rotate(-90 ${size / 2} ${size / 2})`}
				/>
			</svg>
			<div className="absolute inset-0 flex items-center justify-center">
				<span className="num text-uism font-bold text-foreground">{pct}%</span>
			</div>
		</div>
	);
}

export function CurriculumProgressHeader({
	progressPct,
	doneCount,
	lessonCount,
	remainingSeconds,
}: CurriculumProgressHeaderProps) {
	return (
		<div className="border-b border-border px-5 py-4">
			<div className="flex items-center gap-4">
				<CircularProgress pct={progressPct} size={64} />
				<div>
					<div className="text-ui font-semibold text-foreground">
						<span className="num">{doneCount}</span> /{" "}
						<span className="num">{lessonCount}</span> บทเรียน
					</div>
					<div className="text-caption text-muted-foreground">
						เหลือ <span className="num">{fmtHours(remainingSeconds)}</span> ชม.
					</div>
				</div>
			</div>
		</div>
	);
}
