export function AdminTableSkeleton({
	columns,
	rowCount = 5,
}: {
	columns: { width: string; label?: string }[];
	rowCount?: number;
}) {
	return (
		<div className="overflow-hidden rounded-card border border-(--border) bg-(--surface)">
			<div className="flex items-center gap-4 border-b border-(--border) bg-(--surface-muted) px-5 py-3">
				{columns.map((col, i) => (
					<div
						key={i}
						className="h-4 animate-pulse rounded-md bg-(--surface-muted)"
						style={{ width: col.width }}
					/>
				))}
			</div>
			{Array.from({ length: rowCount }).map((_, rowIdx) => (
				<div
					key={rowIdx}
					className="flex items-center gap-4 border-b border-(--border) px-5 py-3 last:border-b-0"
				>
					{columns.map((col, colIdx) => (
						<div
							key={colIdx}
							className="h-4 animate-pulse rounded-md bg-(--surface-muted)"
							style={{ width: col.width }}
						/>
					))}
				</div>
			))}
		</div>
	);
}
