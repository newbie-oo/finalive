"use client";

import { formatTHB } from "@/lib/format";
import { AvatarInitials } from "@/components/ui/avatar-initials";

export interface SlipRow {
	id: string;
	status: string;
	expectedAmount: string;
	reportedAmount: string | null;
	rejectionReason: string | null;
	rejectionNote: string | null;
	createdAt: string;
	pendingId: string;
	refCode: string;
	studentUserId: string;
	studentName: string | null;
	studentEmail: string | null;
	courseId: string;
	courseSlug: string;
	courseTitle: string;
}

interface SlipTableProps {
	rows: SlipRow[];
	activeId: string | undefined;
	isLoading: boolean;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	onSelect: (id: string) => void;
	onFetchNextPage: () => void;
}

export function SlipTable({
	rows,
	activeId,
	isLoading,
	hasNextPage,
	isFetchingNextPage,
	onSelect,
	onFetchNextPage,
}: SlipTableProps) {
	return (
		<div className="rounded-card border border-border bg-card overflow-x-auto min-w-0">
			<table
				className="w-full border-collapse min-w-[520px]"
				style={{ tableLayout: "fixed" }}
			>
				<thead>
					<tr className="border-b border-border bg-muted">
						<th
							className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
							style={{ width: 140 }}
						>
							รหัส
						</th>
						<th
							className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
							style={{ minWidth: 150 }}
						>
							ผู้เรียน
						</th>
						<th
							className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
							style={{ minWidth: 140 }}
						>
							คอร์ส
						</th>
						<th
							className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
							style={{ width: 110 }}
						>
							จำนวน
						</th>
						<th
							className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
							style={{ width: 100 }}
						>
							เวลา
						</th>
					</tr>
				</thead>
				<tbody>
					{isLoading && rows.length === 0 ? (
						<tr>
							<td
								colSpan={5}
								className="p-4 text-caption text-muted-foreground"
							>
								กำลังโหลด…
							</td>
						</tr>
					) : rows.length === 0 ? (
						<tr>
							<td
								colSpan={5}
								className="p-4 text-caption text-muted-foreground"
							>
								— ไม่มีสลิปในคิวนี้ —
							</td>
						</tr>
					) : (
						rows.map((slip) => {
							const isActive = slip.id === activeId;
							return (
								<tr
									key={slip.id}
									aria-current={isActive ? "true" : undefined}
									className="cursor-pointer border-b border-border transition-colors hover:bg-muted/50 aria-current:bg-primary/5"
									onClick={() => onSelect(slip.id)}
								>
									<td className="px-3 py-2.5">
										<span className="mono text-[12px] text-muted-foreground">
											{slip.refCode}
										</span>
									</td>
									<td className="px-3 py-2.5">
										<div className="flex items-center gap-2.5">
											<AvatarInitials
												name={slip.studentName ?? slip.studentEmail ?? "?"}
												size="sm"
											/>
											<div className="min-w-0">
												<div className="truncate text-ui font-medium text-foreground">
													{slip.studentName ||
														slip.studentEmail ||
														slip.refCode}
												</div>
												{slip.studentEmail && (
													<div className="truncate text-caption text-muted-foreground">
														{slip.studentEmail}
													</div>
												)}
											</div>
										</div>
									</td>
									<td className="px-3 py-2.5">
										<div className="truncate text-ui text-foreground">
											{slip.courseTitle}
										</div>
									</td>
									<td className="px-3 py-2.5">
										<span className="num text-[13px] font-semibold">
											{formatTHB(slip.expectedAmount)}
										</span>
									</td>
									<td className="px-3 py-2.5">
										<span className="text-caption text-muted-foreground">
											{new Date(slip.createdAt).toLocaleDateString("th-TH")}
										</span>
									</td>
								</tr>
							);
						})
					)}
				</tbody>
			</table>
			{hasNextPage ? (
				<button
					type="button"
					onClick={onFetchNextPage}
					disabled={isFetchingNextPage}
					className="w-full border-t border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
				>
					{isFetchingNextPage ? "กำลังโหลด…" : "โหลดเพิ่ม"}
				</button>
			) : null}
		</div>
	);
}
