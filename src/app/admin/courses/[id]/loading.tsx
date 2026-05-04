export default function AdminCourseEditLoading() {
	return (
		<section className="mx-auto max-w-3xl space-y-8">
			{/* Header */}
			<div className="space-y-2">
				<div className="h-10 w-32 animate-pulse rounded-lg bg-(--surface-muted)" />
				<div className="h-5 w-64 animate-pulse rounded-md bg-(--surface-muted)" />
			</div>

			{/* Form fields */}
			<div className="space-y-4">
				<div className="space-y-2">
					<div className="h-4 w-12 animate-pulse rounded-md bg-(--surface-muted)" />
					<div className="h-10 w-full animate-pulse rounded-md bg-(--surface-muted)" />
				</div>

				<div className="space-y-2">
					<div className="h-4 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
					<div className="h-40 w-full animate-pulse rounded-md bg-(--surface-muted)" />
				</div>

				<div className="space-y-2">
					<div className="h-4 w-16 animate-pulse rounded-md bg-(--surface-muted)" />
					<div className="h-10 w-full animate-pulse rounded-md bg-(--surface-muted)" />
				</div>

				<div className="space-y-2">
					<div className="h-4 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
					<div className="h-24 w-full animate-pulse rounded-md bg-(--surface-muted)" />
				</div>

				<div className="space-y-2">
					<div className="h-4 w-12 animate-pulse rounded-md bg-(--surface-muted)" />
					<div className="h-10 w-full animate-pulse rounded-md bg-(--surface-muted)" />
				</div>

				<div className="flex items-center gap-2">
					<div className="h-4 w-4 animate-pulse rounded bg-(--surface-muted)" />
					<div className="h-4 w-20 animate-pulse rounded-md bg-(--surface-muted)" />
				</div>

				<div className="space-y-2">
					<div className="h-4 w-12 animate-pulse rounded-md bg-(--surface-muted)" />
					<div className="h-10 w-full animate-pulse rounded-md bg-(--surface-muted)" />
				</div>

				<div className="flex gap-3">
					<div className="h-10 w-20 animate-pulse rounded-md bg-(--surface-muted)" />
					<div className="h-10 w-16 animate-pulse rounded-md bg-(--surface-muted)" />
				</div>
			</div>
		</section>
	);
}
