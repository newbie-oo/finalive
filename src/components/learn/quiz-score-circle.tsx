interface ScoreCircleProps {
	score: number;
	passed: boolean;
	size?: number;
}

export function QuizScoreCircle({ score, passed, size = 180 }: ScoreCircleProps) {
	const r = (size - 14) / 2;
	const C = 2 * Math.PI * r;
	const offset = C - (score / 100) * C;
	return (
		<div className="relative mx-auto" style={{ width: size, height: size }}>
			<svg width={size} height={size}>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke="var(--surface-muted)"
					strokeWidth={10}
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke={passed ? "var(--success)" : "var(--destructive)"}
					strokeWidth={10}
					strokeLinecap="round"
					strokeDasharray={C}
					strokeDashoffset={offset}
					transform={`rotate(-90 ${size / 2} ${size / 2})`}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<div
					className="num font-bold text-foreground"
					style={{
						fontSize: size * 0.32,
						lineHeight: 1,
						letterSpacing: "-0.02em",
					}}
				>
					{score}
					<span
						className="font-medium text-muted-foreground"
						style={{ fontSize: size * 0.13 }}
					>
						%
					</span>
				</div>
				<div className="text-caption text-muted-foreground mt-1">
					ผ่าน <span className="num">70%</span>
				</div>
			</div>
		</div>
	);
}
