import { Check } from "@phosphor-icons/react/dist/ssr";

interface LearningOutcomesSectionProps {
	/** Outcome bullets — already deduped/cleaned by the caller. */
	readonly outcomes: ReadonlyArray<string>;
	/** Optional eyebrow above the heading. */
	readonly eyebrow?: string;
}

/**
 * "What you'll learn" block for the course detail page. Renders as a
 * 2-column checklist on md+ and a single column on mobile. Returns null
 * when the outcomes array is empty so the page doesn't show a heading
 * with nothing under it.
 */
export function LearningOutcomesSection({
	outcomes,
	eyebrow,
}: LearningOutcomesSectionProps) {
	if (outcomes.length === 0) return null;

	return (
		<section className="mx-auto max-w-[1200px] px-6 py-12 md:py-16">
			<div className="mb-8">
				{eyebrow && (
					<div className="mb-2 text-uism font-semibold tracking-[0.08em] text-primary uppercase">
						{eyebrow}
					</div>
				)}
				<h2 className="text-h2">สิ่งที่คุณจะได้เรียน</h2>
			</div>
			<ul className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
				{outcomes.map((outcome) => (
					<li key={outcome} className="flex items-start gap-3">
						<span
							data-testid="outcome-check"
							aria-hidden
							className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-bg text-success"
						>
							<Check size={14} weight="bold" />
						</span>
						<span className="text-body text-foreground">{outcome}</span>
					</li>
				))}
			</ul>
		</section>
	);
}
