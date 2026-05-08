import { cn } from "@/lib/utils";

interface ConfettiBurstProps {
	/** Number of pieces to render. Clamped to [0, 60]. */
	pieces?: number;
	className?: string;
}

const COLORS = [
	"var(--primary)",
	"var(--accent)",
	"var(--success)",
	"var(--warning)",
	"var(--info)",
];

/**
 * Decorative confetti curtain. Pieces fall from the top of the parent
 * container with staggered durations + delays. Honours `prefers-reduced-motion`
 * via the keyframe — when it's set the pieces are kept off-screen so the
 * surface stays still. SSR-safe: position/colour are derived from the index
 * so hydration matches.
 */
export function ConfettiBurst({ pieces = 24, className }: ConfettiBurstProps) {
	const count = Math.min(60, Math.max(0, pieces));
	const items = Array.from({ length: count }, (_, i) => i);

	return (
		<div
			data-testid="confetti-burst"
			aria-hidden="true"
			className={cn(
				"pointer-events-none absolute inset-0 overflow-hidden",
				className,
			)}
		>
			{items.map((i) => {
				const left = ((i * 37) % 100) + (i % 7) * 0.8;
				const delay = (i % 8) * 120;
				const duration = 2200 + (i % 5) * 400;
				const color = COLORS[i % COLORS.length];
				const size = 6 + (i % 3) * 2;
				return (
					<span
						key={i}
						className="confetti-piece absolute -top-3 block"
						style={{
							left: `${left % 100}%`,
							width: size,
							height: size + 2,
							backgroundColor: color,
							animation: `confetti-fall ${duration}ms ease-in ${delay}ms forwards`,
							borderRadius: i % 2 === 0 ? "1px" : "999px",
							transform: `rotate(${(i * 27) % 360}deg)`,
						}}
					/>
				);
			})}
			<style>{`
				@keyframes confetti-fall {
					0% { transform: translateY(-10%) rotate(0deg); opacity: 1; }
					100% { transform: translateY(420%) rotate(720deg); opacity: 0; }
				}
				@media (prefers-reduced-motion: reduce) {
					.confetti-piece { animation: none !important; opacity: 0 !important; }
				}
			`}</style>
		</div>
	);
}
