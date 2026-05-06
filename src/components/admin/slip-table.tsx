"use client";

import { formatTHB } from "@/lib/format";
import { Eye } from "@phosphor-icons/react";

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
		<div className="rounded-[14px] border border-(--border) bg-(--surface) overflow-x-auto min-w-0">
			<table
				className="w-full border-collapse min-w-[520px]"
				style={{ tableLayout: "fixed" }}
			>
				<thead>
					<tr className="border-b border-(--border) bg-(--surface-muted)">
						<th
							className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-(--foreground-muted)"
							style={{ width: 140 }}
						>
							รหัส
						</th>
						<th
							className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-(--foreground-muted)"
							style={{ minWidth: 150 }}
						>
							ผู้เรียน
						</th>
						<th
							className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-(--foreground-muted)"
							style={{ minWidth: 140 }}
						>
							คอร์ส
						</th>
						<th
							className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-(--foreground-muted)"
							style={{ width: 110 }}
						>
							จำนวน
						</th>
						<th
							className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-(--foreground-muted)"
							style={{ width: 100 }}
						>
							เวลา
						</th>
						<th className="px-3 py-2.5" style={{ width: 80 }} />
					</tr>
				</thead>
				<tbody>
					{isLoading && rows.length === 0 ? (
						<tr>
							<td
								colSpan={6}
								className="p-4 text-caption text-(--foreground-muted)"
							>
								กำลังโหลด…
							</td>
						</tr>
					) : rows.length === 0 ? (
						<tr>
							<td
								colSpan={6}
								className="p-4 text-caption text-(--foreground-muted)"
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
									className="cursor-pointer border-b border-(--border) transition-colors"
									style={{
										background: isActive
											? "color-mix(in srgb, var(--primary) 6%, transparent)"
											: "transparent",
									}}
									onClick={() => onSelect(slip.id)}
								>
									<td className="px-3 py-2.5">
										<span className="mono text-[12px] text-(--foreground-muted)">
											{slip.refCode}
										</span>
									</td>
									<td className="px-3 py-2.5">
										<div className="flex items-center gap-2.5">
											<span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#6366F1] to-[#8B5CF6] text-[11px] font-semibold text-white">
												{(slip.studentName || "?").trim().charAt(0)}
											</span>
											<div className="min-w-0">
												<div className="truncate text-ui font-medium text-(--foreground)">
													{slip.studentName ||
														slip.studentEmail ||
														slip.refCode}
												</div>
												{slip.studentEmail && (
													<div className="truncate text-caption text-(--foreground-muted)">
														{slip.studentEmail}
													</div>
												)}
											</div>
										</div>
									</td>
									<td className="px-3 py-2.5">
										<div className="truncate text-ui text-(--foreground)">
											{slip.courseTitle}
										</div>
									</td>
									<td className="px-3 py-2.5">
										<span className="num text-[13px] font-semibold">
											{formatTHB(slip.expectedAmount)}
										</span>
									</td>
									<td className="px-3 py-2.5">
										<span className="text-caption text-(--foreground-muted)">
											{new Date(slip.createdAt).toLocaleDateString("th-TH")}
										</span>
									</td>
									<td className="px-3 py-2.5 text-right">
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onSelect(slip.id);
											}}
											className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-uism text-(--foreground) transition-colors hover:bg-(--surface-muted)"
										>
											<Eye size={14} /> ดู
										</button>
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
					className="w-full border-t border-(--border) px-3 py-2.5 text-sm text-(--foreground-muted) transition-colors hover:bg-(--surface-muted) disabled:opacity-50"
				>
					{isFetchingNextPage ? "กำลังโหลด…" : "โหลดเพิ่ม"}
				</button>
			) : null}
		</div>
	);
}
