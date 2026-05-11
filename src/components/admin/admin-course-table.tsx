import Link from "next/link";
import { StatusChip } from "@/components/ui/status-chip";
import { formatTHB } from "@/lib/format";
import type { AdminCourseListItem } from "@/server/repos/admin-course";

const STATUS_LABEL: Record<string, string> = {
	draft: "ร่าง",
	published: "เผยแพร่",
	archived: "เก็บถาวร",
};

const STATUS_TONE: Record<string, "neutral" | "success" | "warning"> = {
	draft: "neutral",
	published: "success",
	archived: "warning",
};

export function AdminCourseTable({
	courses,
}: {
	courses: AdminCourseListItem[];
}) {
	return (
		<div className="overflow-x-auto rounded-card border border-border bg-card">
			<table className="min-w-[640px] w-full text-ui">
				<thead>
					<tr className="border-b border-border bg-muted text-left">
						<th className="px-5 py-3 text-uism font-semibold text-muted-foreground">
							ชื่อ
						</th>
						<th className="px-5 py-3 text-uism font-semibold text-muted-foreground">
							URL
						</th>
						<th className="px-5 py-3 text-uism font-semibold text-muted-foreground">
							สถานะ
						</th>
						<th className="px-5 py-3 text-uism font-semibold text-muted-foreground">
							ราคา
						</th>
						<th className="px-5 py-3 text-right text-uism font-semibold text-muted-foreground">
							ผู้เรียน
						</th>
						<th className="px-5 py-3" aria-label="actions" />
					</tr>
				</thead>
				<tbody>
					{courses.map((c) => (
						<tr
							key={c.id}
							className="border-b border-border last:border-b-0"
						>
							<td className="px-5 py-4 font-medium text-foreground">
								{c.title}
							</td>
							<td className="mono px-5 py-4 text-uism text-muted-foreground">
								{c.slug}
							</td>
							<td className="px-5 py-4">
								<StatusChip tone={STATUS_TONE[c.status] ?? "neutral"}>
									{STATUS_LABEL[c.status] ?? c.status}
								</StatusChip>
							</td>
							<td className="num px-5 py-4 text-foreground">
								{c.isFree ? "ฟรี" : formatTHB(c.price)}
							</td>
							<td className="num px-5 py-4 text-right text-foreground">
								{c.enrollmentCount.toLocaleString("th-TH")}
							</td>
							<td className="px-5 py-4 text-right">
								<Link
									href={`/admin/courses/${c.id}`}
									className="text-uism font-medium text-primary hover:underline"
								>
									แก้ไข →
								</Link>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
