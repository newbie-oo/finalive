import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { getSession } from "@/server/auth-session";
import { UserRepo } from "@/server/repos/user";
import { StatusChip } from "@/components/ui/status-chip";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationNav } from "@/components/ui/pagination-nav";
import type { SearchParams } from "@/lib/pagination";

export const dynamic = "force-dynamic";

const ROLE_OPTIONS: Array<{
	key: "all" | "admin" | "student";
	label: string;
}> = [
	{ key: "all", label: "ทั้งหมด" },
	{ key: "admin", label: "ผู้ดูแล" },
	{ key: "student", label: "นักเรียน" },
];

function pickStr(raw: string | string[] | undefined): string {
	return typeof raw === "string" ? raw : "";
}

export default async function AdminUsersPage({
	searchParams,
}: {
	searchParams: SearchParams;
}) {
	const session = await getSession();
	if (!session?.user?.id || session.user.role !== "admin") {
		return (
			<p className="text-body text-(--foreground-muted)">ไม่มีสิทธิ์เข้าถึง</p>
		);
	}

	const sp = await searchParams;
	const q = pickStr(sp.q);
	const roleParam = pickStr(sp.role);
	const role: "admin" | "student" | "all" =
		roleParam === "admin" || roleParam === "student" ? roleParam : "all";
	const page = Math.max(1, Number(pickStr(sp.page) || "1"));
	const filtersActive = q.length > 0 || role !== "all";

	const { rows, total, totalPages, perPage } = await UserRepo.listPage({
		q,
		role,
		page,
		perPage: 20,
	});

	const queryString = new URLSearchParams();
	if (q) queryString.set("q", q);
	if (role !== "all") queryString.set("role", role);

	return (
		<section className="space-y-6">
			<header>
				<h1 className="text-h1">ผู้ใช้ทั้งหมด</h1>
				<p className="mt-1 text-body text-(--foreground-muted)">
					{total.toLocaleString("th-TH")} คน
				</p>
			</header>

			<form
				method="get"
				action="/admin/users"
				className="flex flex-wrap items-center gap-3"
				role="search"
			>
				<label htmlFor="admin-users-q" className="sr-only">
					ค้นหาผู้ใช้
				</label>
				<Input
					id="admin-users-q"
					type="search"
					name="q"
					defaultValue={q}
					placeholder="ค้นหาด้วยชื่อหรืออีเมล"
					className="w-full sm:w-72"
				/>
				<label htmlFor="admin-users-role" className="sr-only">
					กรองบทบาท
				</label>
				<select
					id="admin-users-role"
					name="role"
					defaultValue={role}
					className="h-10 rounded-button border border-(--border) bg-(--surface) px-3 text-ui text-(--foreground)"
				>
					{ROLE_OPTIONS.map((r) => (
						<option key={r.key} value={r.key}>
							{r.label}
						</option>
					))}
				</select>
				<Button type="submit" variant="primary">
					<MagnifyingGlass size={16} weight="bold" />
					ค้นหา
				</Button>
				{filtersActive && (
					<Link
						href="/admin/users"
						className="text-uism text-(--foreground-muted) hover:underline"
					>
						ล้างตัวกรอง
					</Link>
				)}
			</form>

			{rows.length === 0 ? (
				<p className="text-body text-(--foreground-muted)">
					{filtersActive ? "ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข" : "ยังไม่มีผู้ใช้"}
				</p>
			) : (
				<>
					<div className="overflow-x-auto rounded-card border border-(--border) bg-(--surface)">
						<table className="min-w-[640px] w-full text-ui">
							<thead>
								<tr className="border-b border-(--border) bg-(--surface-muted) text-left">
									<th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
										ชื่อ
									</th>
									<th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
										อีเมล
									</th>
									<th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
										บทบาท
									</th>
									<th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
										สมัครเมื่อ
									</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((u) => (
									<tr
										key={u.id}
										className="border-b border-(--border) last:border-b-0"
									>
										<td className="px-5 py-3">
											<Link
												href={`/admin/users/${u.id}`}
												className="inline-flex items-center gap-3 font-medium text-(--foreground) hover:text-(--primary)"
											>
												<AvatarInitials name={u.name ?? ""} size="sm" />
												{u.name}
											</Link>
										</td>
										<td className="px-5 py-3 text-(--foreground-muted)">
											{u.email}
										</td>
										<td className="px-5 py-3">
											<StatusChip
												tone={(u.role ?? "") === "admin" ? "primary" : "neutral"}
											>
												{(u.role ?? "") === "admin"
													? "ผู้ดูแล"
													: (u.role ?? "นักเรียน")}
											</StatusChip>
										</td>
										<td className="num px-5 py-3 text-uism text-(--foreground-muted)">
											{u.createdAt?.toLocaleDateString("th-TH")}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<PaginationNav
						page={page}
						totalPages={totalPages}
						basePath="/admin/users"
						perPage={perPage === 20 ? undefined : perPage}
						searchParams={queryString.toString()}
					/>
				</>
			)}
		</section>
	);
}
