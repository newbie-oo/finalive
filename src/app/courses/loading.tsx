import { PublicShell } from "@/components/layouts/public-shell";
import { CourseCardSkeleton } from "@/components/course/course-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const CHIP_WIDTHS = ["w-20", "w-14", "w-20", "w-20", "w-24"];

export default function CoursesLoading() {
	return (
		<PublicShell>
			<div className="flex flex-col">
				<section className="bg-muted">
					<div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
						<div className="mx-auto max-w-2xl text-center">
							<Skeleton className="mx-auto h-7 w-36 rounded-md md:h-9 md:w-44" />
							<Skeleton className="mx-auto mt-2 h-5 w-64 rounded-md md:h-6 md:w-72" />
						</div>

						<div className="mx-auto mt-8 max-w-xl">
							<Skeleton className="h-14 w-full rounded-full" />
						</div>

						<div className="mt-6 flex flex-wrap items-center justify-center gap-2">
							{CHIP_WIDTHS.map((w, i) => (
								<Skeleton
									key={i}
									className={`h-9 ${w} rounded-full`}
								/>
							))}
						</div>
					</div>
				</section>

				<div className="mx-auto w-full max-w-[1200px] px-6 py-8 md:py-10">
					<div className="flex flex-col gap-8 md:flex-row md:items-start">
						<aside className="w-full shrink-0 md:w-[240px]">
							<Skeleton className="mb-4 h-10 w-full rounded-button md:hidden" />

							<div className="space-y-6 md:sticky md:top-4">
								<Card className="p-4">
									<Skeleton className="mb-3 h-4 w-16 rounded-md" />
									<div className="space-y-2.5">
										{Array.from({ length: 5 }).map((_, i) => (
											<div key={i} className="flex items-center gap-2.5">
												<Skeleton className="h-4 w-4 rounded-sm" />
												<Skeleton className="h-4 flex-1 rounded-md" />
												<Skeleton className="h-3 w-6 rounded-md" />
											</div>
										))}
									</div>
								</Card>

								<Card className="p-4">
									<Skeleton className="mb-3 h-4 w-12 rounded-md" />
									<div className="space-y-2.5">
										{Array.from({ length: 5 }).map((_, i) => (
											<div key={i} className="flex items-center gap-2.5">
												<Skeleton className="h-4 w-4 rounded-full" />
												<Skeleton className="h-4 w-24 rounded-md" />
											</div>
										))}
									</div>
								</Card>

								<Card className="p-4">
									<Skeleton className="mb-3 h-4 w-20 rounded-md" />
									<Skeleton className="h-9 w-full rounded-button" />
								</Card>
							</div>
						</aside>

						<div className="min-w-0 flex-1">
							<div className="mb-5 flex items-center justify-between">
								<Skeleton className="h-4 w-44 rounded-md" />
								<Skeleton className="h-9 w-[72px] rounded-button" />
							</div>

							<ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
								{Array.from({ length: 6 }).map((_, i) => (
									<li key={i}>
										<CourseCardSkeleton />
									</li>
								))}
							</ul>

							<div className="mt-10 flex items-center justify-center gap-2">
								<Skeleton className="h-9 w-20 rounded-button" />
								<div className="flex items-center gap-1.5">
									{Array.from({ length: 5 }).map((_, i) => (
										<Skeleton key={i} className="h-9 w-9 rounded-button" />
									))}
								</div>
								<Skeleton className="h-9 w-20 rounded-button" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</PublicShell>
	);
}
