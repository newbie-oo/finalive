export default function AdminLoading() {
	return (
		<div className="flex h-[100dvh]">
			{/* Sidebar */}
			<aside className="hidden w-64 shrink-0 border-r border-(--border) bg-(--surface) p-4 lg:block">
				<div className="mb-8 h-8 w-32 animate-pulse rounded-md bg-(--surface-muted)" />
				<div className="space-y-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<div
							key={i}
							className="h-10 w-full animate-pulse rounded-[10px] bg-(--surface-muted)"
						/>
					))}
				</div>
			</aside>

			{/* Main */}
			<main className="flex-1 overflow-y-auto p-6">
				<div className="mb-8 flex items-center justify-between">
					<div className="h-8 w-48 animate-pulse rounded-lg bg-(--surface-muted)" />
					<div className="h-10 w-32 animate-pulse rounded-[10px] bg-(--surface-muted)" />
				</div>

				{/* Stats cards */}
				<div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={i}
							className="rounded-card border border-(--border) bg-(--surface) p-4"
						>
							<div className="mb-2 h-4 w-20 animate-pulse rounded-md bg-(--surface-muted)" />
							<div className="h-8 w-16 animate-pulse rounded-md bg-(--surface-muted)" />
						</div>
					))}
				</div>

				{/* Table */}
				<div className="rounded-card border border-(--border) bg-(--surface)">
					<div className="flex items-center gap-4 border-b border-(--border) px-4 py-3">
						<div className="h-4 w-32 animate-pulse rounded-md bg-(--surface-muted)" />
						<div className="h-4 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
						<div className="h-4 w-28 animate-pulse rounded-md bg-(--surface-muted)" />
					</div>
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={i}
							className="flex items-center gap-4 border-b border-(--border) px-4 py-4 last:border-b-0"
						>
							<div className="h-4 w-32 animate-pulse rounded-md bg-(--surface-muted)" />
							<div className="h-4 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
							<div className="h-4 w-28 animate-pulse rounded-md bg-(--surface-muted)" />
						</div>
					))}
				</div>
			</main>
		</div>
	);
}
