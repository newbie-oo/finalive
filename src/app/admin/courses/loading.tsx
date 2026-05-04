export default function AdminCoursesLoading() {
	return (
		<section className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<div className="h-10 w-40 animate-pulse rounded-lg bg-(--surface-muted)" />
					<div className="h-5 w-56 animate-pulse rounded-md bg-(--surface-muted)" />
				</div>
				<div className="h-10 w-32 animate-pulse rounded-button bg-(--surface-muted)" />
			</div>

			{/* Search form */}
			<div className="flex flex-wrap items-center gap-3">
				<div className="h-10 w-full animate-pulse rounded-button bg-(--surface-muted) sm:w-72" />
				<div className="h-10 w-28 animate-pulse rounded-button bg-(--surface-muted)" />
				<div className="h-10 w-20 animate-pulse rounded-button bg-(--surface-muted)" />
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-card border border-(--border) bg-(--surface)">
				<div className="flex items-center gap-4 border-b border-(--border) bg-(--surface-muted) px-5 py-3">
					<div className="h-4 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
					<div className="h-4 w-20 animate-pulse rounded-md bg-(--surface-muted)" />
					<div className="h-4 w-20 animate-pulse rounded-md bg-(--surface-muted)" />
					<div className="h-4 w-16 animate-pulse rounded-md bg-(--surface-muted)" />
					<div className="ml-auto h-4 w-16 animate-pulse rounded-md bg-(--surface-muted)" />
				</div>
				{Array.from({ length: 5 }).map((_, i) => (
					<div
						key={i}
						className="flex items-center gap-4 border-b border-(--border) px-5 py-4 last:border-b-0"
					>
						<div className="h-4 w-40 animate-pulse rounded-md bg-(--surface-muted)" />
						<div className="h-4 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
						<div className="h-6 w-16 animate-pulse rounded-md bg-(--surface-muted)" />
						<div className="h-4 w-16 animate-pulse rounded-md bg-(--surface-muted)" />
						<div className="ml-auto h-4 w-12 animate-pulse rounded-md bg-(--surface-muted)" />
					</div>
				))}
			</div>
		</section>
	);
}
