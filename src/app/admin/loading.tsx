export default function AdminDashboardLoading() {
	return (
		<section className="space-y-8">
			{/* Header */}
			<div className="space-y-2">
				<div className="h-10 w-48 animate-pulse rounded-lg bg-(--surface-muted)" />
				<div className="h-5 w-72 animate-pulse rounded-md bg-(--surface-muted)" />
			</div>

			{/* Quick actions */}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<div
						key={i}
						className="flex items-center gap-4 rounded-[12px] border border-(--border) bg-(--surface) p-4"
					>
						<div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-(--surface-muted)" />
						<div className="min-w-0 flex-1 space-y-2">
							<div className="h-4 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
							<div className="h-3 w-40 animate-pulse rounded-md bg-(--surface-muted)" />
						</div>
					</div>
				))}
			</div>

			{/* Stats grid */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 7 }).map((_, i) => (
					<div
						key={i}
						className="flex flex-col gap-2 rounded-[12px] border border-(--border) bg-(--surface) p-5"
					>
						<div className="h-3 w-20 animate-pulse rounded-md bg-(--surface-muted)" />
						<div className="h-8 w-16 animate-pulse rounded-md bg-(--surface-muted)" />
						<div className="h-3 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
					</div>
				))}
			</div>

			{/* Footer note */}
			<div className="h-4 w-64 animate-pulse rounded-md bg-(--surface-muted)" />
		</section>
	);
}
