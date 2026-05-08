import { PublicShell } from "@/components/layouts/public-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CourseDetailLoading() {
	return (
		<PublicShell>
			<section className="bg-muted">
				<div className="mx-auto max-w-[1200px] px-6 py-6 md:py-8">
					<div className="mb-6 flex items-center gap-2">
						<Skeleton className="h-4 w-24 rounded-md" />
						<Skeleton className="h-3 w-3 rounded-md" />
						<Skeleton className="h-4 w-48 rounded-md" />
					</div>

					<div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
						<div>
							<Skeleton className="relative mb-7 aspect-video w-full overflow-hidden rounded-[16px] shadow-(--shadow-lg)" />

							<div className="mb-4 flex flex-wrap items-center gap-2">
								<Skeleton className="h-[22px] w-28 rounded-full" />
								<Skeleton className="h-[22px] w-32 rounded-full" />
							</div>

							<Skeleton className="h-9 w-full max-w-md rounded-md md:h-10" />
							<Skeleton className="mt-2 h-9 w-3/5 rounded-md md:h-10" />

							<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
								<Skeleton className="h-4 w-28 rounded-md" />
								<Skeleton className="h-4 w-1 rounded-md" />
								<Skeleton className="h-4 w-36 rounded-md" />
								<Skeleton className="h-4 w-1 rounded-md" />
								<Skeleton className="h-4 w-16 rounded-md" />
							</div>

							<div className="mt-5 flex items-center gap-3">
								<Skeleton className="h-10 w-10 shrink-0 rounded-full" />
								<div className="space-y-1.5">
									<Skeleton className="h-3 w-12 rounded-md" />
									<Skeleton className="h-4 w-44 rounded-md" />
								</div>
							</div>

							<div className="mt-5 space-y-2">
								<Skeleton className="h-5 w-full rounded-md" />
								<Skeleton className="h-5 w-11/12 rounded-md" />
								<Skeleton className="h-5 w-3/4 rounded-md" />
							</div>

							<div className="mt-6 flex flex-wrap gap-3">
								<Skeleton className="h-9 w-32 rounded-full" />
								<Skeleton className="h-9 w-28 rounded-full" />
								<Skeleton className="h-9 w-36 rounded-full" />
							</div>
						</div>

						<aside className="lg:sticky lg:top-24 lg:self-start">
							<Card className="shadow-(--shadow-md)">
								<Skeleton className="mb-5 h-9 w-32 rounded-md" />
								<div className="mb-5 h-px bg-border" />
								<div className="mb-6 space-y-3">
									{Array.from({ length: 5 }).map((_, i) => (
										<div key={i} className="flex items-start gap-2.5">
											<Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-sm" />
											<Skeleton className="h-4 w-44 rounded-md" />
										</div>
									))}
								</div>
								<div className="space-y-2.5">
									<Skeleton className="h-12 w-full rounded-full" />
									<Skeleton className="h-10 w-full rounded-full" />
								</div>
								<div className="mt-5 border-t border-border pt-4">
									<Skeleton className="mx-auto h-3 w-44 rounded-md" />
								</div>
							</Card>
						</aside>
					</div>
				</div>
			</section>

			<section className="py-12 md:py-16">
				<div className="mx-auto max-w-[1200px] px-6">
					<div className="mb-6 flex gap-6 border-b border-border">
						<Skeleton className="h-10 w-20 rounded-md" />
						<Skeleton className="h-10 w-24 rounded-md" />
						<Skeleton className="h-10 w-16 rounded-md" />
					</div>
					<div className="space-y-3">
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								key={i}
								className="flex items-start gap-3 rounded-card border border-border bg-card p-4"
							>
								<Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded-sm" />
								<Skeleton className="h-5 flex-1 rounded-md" />
							</div>
						))}
					</div>
				</div>
			</section>
		</PublicShell>
	);
}
