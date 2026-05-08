import { Star } from "@phosphor-icons/react/dist/ssr";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Progress } from "@/components/ui/progress";

export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export interface Review {
	readonly name: string;
	readonly role: string;
	readonly rating: ReviewRating;
	readonly body: string;
	readonly date: Date;
}

interface CourseReviewsSectionProps {
	readonly reviews: ReadonlyArray<Review>;
}

const TH_DATE = new Intl.DateTimeFormat("th-TH", {
	year: "numeric",
	month: "short",
});

/**
 * "What students say" block on the course detail page. Summary at the top
 * (average rating, total count, 5–1★ distribution) plus a card grid of
 * individual reviews. Returns null when given an empty array so the page
 * doesn't show a heading with nothing under it.
 */
export function CourseReviewsSection({ reviews }: CourseReviewsSectionProps) {
	if (reviews.length === 0) return null;

	const total = reviews.length;
	const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
	const average = sum / total;

	// Distribution buckets, indexed 0..4 for ratings 1..5.
	const distribution: number[] = [0, 0, 0, 0, 0];
	for (const r of reviews) {
		distribution[r.rating - 1] = (distribution[r.rating - 1] ?? 0) + 1;
	}
	const maxBucket = Math.max(...distribution, 1);

	return (
		<section className="mx-auto max-w-[1200px] px-6 py-12 md:py-16">
			<div className="mb-8">
				<div className="text-uism font-semibold tracking-[0.08em] text-primary uppercase">
					รีวิวจากผู้เรียน
				</div>
				<h2 className="mt-2 text-h2">เสียงจากนักเรียนจริง</h2>
			</div>

			<div className="mb-10 grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
				<div className="text-center lg:text-left">
					<div className="num text-display font-bold text-foreground">
						{average.toFixed(1)}
					</div>
					<StarRow
						rating={Math.round(average) as ReviewRating}
						countable={false}
					/>
					<p className="num mt-2 text-uism text-muted-foreground">
						{`จาก ${total} รีวิว`}
					</p>
				</div>

				<ul className="flex flex-col gap-2">
					{[5, 4, 3, 2, 1].map((rating) => {
						const count = distribution[rating - 1] ?? 0;
						const pct = (count / maxBucket) * 100;
						return (
							<li
								key={rating}
								data-testid="rating-bucket"
								className="grid grid-cols-[40px_1fr_40px] items-center gap-3"
							>
								<span className="num text-uism text-muted-foreground">
									{rating} ★
								</span>
								<Progress value={pct} className="h-2" />
								<span className="num text-uism text-foreground-subtle">
									{count}
								</span>
							</li>
						);
					})}
				</ul>
			</div>

			<ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
				{reviews.map((r, idx) => (
					<li key={`${r.name}-${idx}`} className="h-full">
						<ReviewCard review={r} />
					</li>
				))}
			</ul>
		</section>
	);
}

function ReviewCard({ review }: { review: Review }) {
	return (
		<Card className="flex h-full flex-col">
			<CardContent className="flex h-full flex-col p-0">
				<StarRow rating={review.rating} />
				<blockquote className="mt-3 grow text-body text-foreground">
					{review.body}
				</blockquote>
				<div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
					<AvatarInitials name={review.name} size="md" />
					<div className="min-w-0">
						<div className="text-ui font-semibold text-foreground">
							{review.name}
						</div>
						<div className="truncate text-caption text-muted-foreground">
							{review.role} · {TH_DATE.format(review.date)}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

interface StarRowProps {
	rating: ReviewRating;
	/** When true (default), tags each star with data-testid="review-star" so
	 * tests can count per-card stars without picking up the aggregate-summary
	 * row. */
	countable?: boolean;
}

function StarRow({ rating, countable = true }: StarRowProps) {
	return (
		<div
			className="flex items-center gap-0.5 text-warning"
			role="img"
			aria-label={`${rating} จาก 5 ดาว`}
		>
			{Array.from({ length: rating }, (_, i) => (
				<Star
					key={i}
					size={16}
					weight="fill"
					data-testid={countable ? "review-star" : undefined}
				/>
			))}
		</div>
	);
}
