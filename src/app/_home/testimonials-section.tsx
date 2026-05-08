import { Star } from "@phosphor-icons/react/dist/ssr";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { TESTIMONIALS, type Testimonial } from "./data";

const AVERAGE_RATING =
	TESTIMONIALS.reduce((sum, t) => sum + t.rating, 0) / TESTIMONIALS.length;

export function TestimonialsSection() {
	return (
		<section className="py-16 md:py-24" aria-labelledby="testimonials-heading">
			<div className="mx-auto max-w-[1200px] px-6">
				<div className="mb-10 text-center">
					<div className="text-uism font-semibold tracking-[0.08em] text-primary uppercase">
						รีวิวจากนักเรียน
					</div>
					<h2 id="testimonials-heading" className="mt-2 text-h2">
						เสียงจากนักเรียนกว่า{" "}
						<span className="num text-primary">
							{TESTIMONIALS.length.toLocaleString("en-US")}+
						</span>{" "}
						คน
					</h2>
					<div className="mt-4 inline-flex items-center gap-2 rounded-pill border border-border bg-card px-4 py-2">
						<StarRow
							rating={Math.round(AVERAGE_RATING) as Testimonial["rating"]}
							countable={false}
						/>
						<span className="num text-ui font-semibold text-foreground">
							{AVERAGE_RATING.toFixed(1)} / 5
						</span>
					</div>
				</div>

				<ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
					{TESTIMONIALS.map((t) => (
						<li key={t.name} className="h-full">
							<TestimonialCard testimonial={t} />
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

interface TestimonialCardProps {
	testimonial: Testimonial;
}

function TestimonialCard({ testimonial }: TestimonialCardProps) {
	return (
		<Card className="flex h-full flex-col">
			<CardContent className="flex h-full flex-col p-0">
				<StarRow rating={testimonial.rating} />
				<blockquote className="mt-4 grow text-body text-foreground before:content-['“'] before:text-foreground-subtle after:content-['”'] after:text-foreground-subtle">
					{testimonial.quote}
				</blockquote>
				<div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
					<AvatarInitials name={testimonial.name} size="md" />
					<div className="min-w-0">
						<div className="text-ui font-semibold text-foreground">
							{testimonial.name}
						</div>
						<div className="truncate text-caption text-muted-foreground">
							{testimonial.role}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

interface StarRowProps {
	rating: Testimonial["rating"];
	/** When true (default), each star carries `data-testid="testimonial-star"`
	 * so card-level assertions can count them. The aggregate-rating row at
	 * the top of the section sets `countable={false}` to stay out of those
	 * counts. */
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
					data-testid={countable ? "testimonial-star" : undefined}
				/>
			))}
		</div>
	);
}
