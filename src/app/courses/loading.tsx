import { CourseCardSkeleton } from "@/components/course/course-card";

export default function CoursesLoading() {
	return (
		<div className="flex flex-col">
			<div className="bg-(--surface-muted)">
				<div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
					<div className="mx-auto max-w-2xl text-center">
						<div className="mx-auto mb-2 h-10 w-56 animate-pulse rounded-lg bg-(--surface)" />
						<div className="mx-auto h-5 w-80 animate-pulse rounded-md bg-(--surface)" />
					</div>
					<div className="mx-auto mt-8 max-w-xl">
						<div className="h-14 w-full animate-pulse rounded-full bg-(--surface) shadow-(--shadow-sm-token)" />
					</div>
					<div className="mt-6 flex flex-wrap items-center justify-center gap-2">
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={i}
								className="h-9 w-24 animate-pulse rounded-full bg-(--surface)"
							/>
						))}
					</div>
				</div>
			</div>

			<div className="mx-auto max-w-[1200px] px-6 py-8 md:py-10">
				<div className="flex flex-col gap-8 md:flex-row md:items-start">
					<aside className="w-full shrink-0 md:w-[240px]">
						<div className="mb-4 h-10 w-full animate-pulse rounded-button bg-(--surface) md:hidden" />
						<div className="space-y-6">
							<div className="rounded-card border border-(--border) bg-(--surface) p-4">
								<div className="mb-3 h-4 w-16 animate-pulse rounded-md bg-(--surface-muted)" />
								<div className="space-y-3">
									{Array.from({ length: 5 }).map((_, i) => (
										<div key={i} className="flex items-center gap-2.5">
											<div className="h-4 w-4 animate-pulse rounded-sm bg-(--surface-muted)" />
											<div className="h-4 flex-1 animate-pulse rounded-md bg-(--surface-muted)" />
											<div className="h-3.5 w-6 animate-pulse rounded-md bg-(--surface-muted)" />
										</div>
									))}
								</div>
							</div>
							<div className="rounded-card border border-(--border) bg-(--surface) p-4">
								<div className="mb-3 h-4 w-12 animate-pulse rounded-md bg-(--surface-muted)" />
								<div className="space-y-3">
									{Array.from({ length: 5 }).map((_, i) => (
										<div key={i} className="flex items-center gap-2.5">
											<div className="h-4 w-4 animate-pulse rounded-full bg-(--surface-muted)" />
											<div className="h-4 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
										</div>
									))}
								</div>
							</div>
							<div className="rounded-card border border-(--border) bg-(--surface) p-4">
								<div className="mb-3 h-4 w-20 animate-pulse rounded-md bg-(--surface-muted)" />
								<div className="h-10 w-full animate-pulse rounded-button bg-(--surface-muted)" />
							</div>
						</div>
					</aside>

					<div className="min-w-0 flex-1">
						<div className="mb-5 flex items-center justify-between">
							<div className="h-4 w-52 animate-pulse rounded-md bg-(--surface-muted)" />
							<div className="inline-flex h-9 w-[72px] rounded-button border border-(--border) bg-(--surface) p-0.5">
								<div className="h-8 w-8 animate-pulse rounded-md bg-(--surface-muted)" />
								<div className="h-8 w-8 rounded-md" />
							</div>
						</div>
						<ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
							{Array.from({ length: 6 }).map((_, i) => (
								<li key={i}>
									<CourseCardSkeleton />
								</li>
							))}
						</ul>
						<div className="mt-10 flex items-center justify-center gap-2">
							<div className="h-9 w-20 animate-pulse rounded-button bg-(--surface-muted)" />
							<div className="flex items-center gap-1.5">
								{Array.from({ length: 5 }).map((_, i) => (
									<div
										key={i}
										className="h-9 w-9 animate-pulse rounded-button bg-(--surface-muted)"
									/>
								))}
							</div>
							<div className="h-9 w-20 animate-pulse rounded-button bg-(--surface-muted)" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
