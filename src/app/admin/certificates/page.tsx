import Link from "next/link";
import {
	Certificate as CertIcon,
	MagnifyingGlass,
} from "@phosphor-icons/react/dist/ssr";
import {
	listCertificatesPage,
	type AdminCertificateStatus,
} from "@/server/repos/certificate";
import { RevokeButton } from "@/components/admin/revoke-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { StatusChip } from "@/components/ui/status-chip";
import type { SearchParams } from "@/lib/pagination";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: Array<{ key: AdminCertificateStatus; label: string }> = [
	{ key: "all", label: "ทั้งหมด" },
	{ key: "active", label: "ใช้งานได้" },
	{ key: "revoked", label: "ถูกเพิกถอน" },
];

function pickStr(raw: string | string[] | undefined): string {
	return typeof raw === "string" ? raw : "";
}

function pickStatus(raw: string | string[] | undefined): AdminCertificateStatus {
	const v = pickStr(raw);
	return v === "active" || v === "revoked" ? v : "all";
}

export default async function AdminCertificatesPage({
	searchParams,
}: {
	searchParams: SearchParams;
}) {
	const sp = await searchParams;
	const q = pickStr(sp.q);
	const status = pickStatus(sp.status);
	const page = Math.max(1, Number(pickStr(sp.page) || "1"));
	const filtersActive = q.length > 0 || status !== "all";

	const { rows, total, totalPages, perPage } = await listCertificatesPage({
		q,
		status,
		page,
		perPage: 20,
	});

	const queryString = new URLSearchParams();
	if (q) queryString.set("q", q);
	if (status !== "all") queryString.set("status", status);

	return (
		<section className="space-y-6">
			<header>
				<h1 className="text-h1">ใบรับรองทั้งหมด</h1>
				<p className="mt-1 text-body text-(--foreground-muted)">
					{total.toLocaleString("th-TH")} ใบ
				</p>
			</header>

			<form
				method="get"
				action="/admin/certificates"
				className="flex flex-wrap items-center gap-3"
				role="search"
			>
				<label htmlFor="admin-certs-q" className="sr-only">
					ค้นหาใบรับรอง
				</label>
				<Input
					id="admin-certs-q"
					type="search"
					name="q"
					defaultValue={q}
					placeholder="ค้นหาด้วยรหัส ชื่อผู้เรียน หรือชื่อคอร์ส"
					className="w-full sm:w-80"
				/>
				<label htmlFor="admin-certs-status" className="sr-only">
					กรองสถานะ
				</label>
				<select
					id="admin-certs-status"
					name="status"
					defaultValue={status}
					className="h-10 rounded-button border border-(--border) bg-(--surface) px-3 text-ui text-(--foreground)"
				>
					{STATUS_OPTIONS.map((s) => (
						<option key={s.key} value={s.key}>
							{s.label}
						</option>
					))}
				</select>
				<Button type="submit" variant="primary">
					<MagnifyingGlass size={16} weight="bold" />
					ค้นหา
				</Button>
				{filtersActive && (
					<Link
						href="/admin/certificates"
						className="text-uism text-(--foreground-muted) hover:underline"
					>
						ล้างตัวกรอง
					</Link>
				)}
			</form>

			{rows.length === 0 ? (
				filtersActive ? (
					<p className="text-body text-(--foreground-muted)">
						ไม่พบใบรับรองที่ตรงกับเงื่อนไข
					</p>
				) : (
					<EmptyState
						icon={<CertIcon size={28} weight="duotone" />}
						title="ยังไม่มีใบรับรอง"
						description="ใบรับรองจะถูกออกอัตโนมัติเมื่อนักเรียนเรียนจบคอร์สที่ลงทะเบียน"
					/>
				)
			) : (
				<>
					<div className="overflow-x-auto rounded-card border border-(--border) bg-(--surface)">
						<table className="min-w-[640px] w-full text-ui">
							<thead>
								<tr className="border-b border-(--border) bg-(--surface-muted) text-left">
									<th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
										เลขที่
									</th>
									<th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
										ผู้สำเร็จการศึกษา
									</th>
									<th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
										คอร์ส
									</th>
									<th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
										วันที่ออก
									</th>
									<th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
										สถานะ
									</th>
									<th className="px-5 py-3" aria-label="actions" />
								</tr>
							</thead>
							<tbody>
								{rows.map((cert) => (
									<tr
										key={cert.id}
										className="border-b border-(--border) last:border-b-0"
									>
										<td className="mono px-5 py-3 text-uism text-(--foreground)">
											{cert.certCode}
										</td>
										<td className="px-5 py-3 text-(--foreground)">
											{cert.studentName}
										</td>
										<td className="px-5 py-3 text-(--foreground-muted)">
											{cert.courseTitle}
										</td>
										<td className="num px-5 py-3 text-uism text-(--foreground-muted)">
											{cert.issuedAt.toLocaleDateString("th-TH")}
										</td>
										<td className="px-5 py-3">
											<StatusChip
												tone={cert.revokedAt ? "destructive" : "success"}
											>
												{cert.revokedAt ? "ถูกเพิกถอน" : "ใช้งานได้"}
											</StatusChip>
										</td>
										<td className="px-5 py-3">
											<div className="flex items-center justify-end gap-3">
												<Link
													href={`/verify/${cert.certCode}`}
													className="text-uism font-medium text-(--primary) hover:underline"
												>
													ตรวจสอบ
												</Link>
												{!cert.revokedAt && <RevokeButton certId={cert.id} />}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<PaginationNav
						page={page}
						totalPages={totalPages}
						basePath="/admin/certificates"
						perPage={perPage === 20 ? undefined : perPage}
						searchParams={queryString.toString()}
					/>
				</>
			)}
		</section>
	);
}
