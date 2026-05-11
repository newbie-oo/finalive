import Link from "next/link";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react/dist/ssr";
import { resolveAdminCourseList } from "@/server/presenters/admin-courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminCourseTable } from "@/components/admin/admin-course-table";
import type { CourseStatusFilter } from "@/db/schema/course";

export const dynamic = "force-dynamic";

const STATUSES: Array<{ key: CourseStatusFilter; label: string }> = [
	{ key: "all", label: "ทั้งหมด" },
	{ key: "published", label: "เผยแพร่" },
	{ key: "draft", label: "ร่าง" },
	{ key: "archived", label: "เก็บถาวร" },
];

export default async function AdminCoursesPage({
	searchParams,
}: {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
	const vm = await resolveAdminCourseList(await searchParams);

	return (
		<section className="space-y-6">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="text-h1">คอร์สทั้งหมด</h1>
					<p className="mt-1 text-body text-muted-foreground">
						จัดการเนื้อหาและการเผยแพร่
					</p>
				</div>
				<Button asChild variant="primary">
					<Link href="/admin/courses/new">
						<Plus size={16} weight="bold" /> สร้างคอร์ส
					</Link>
				</Button>
			</header>

			<form
				method="get"
				action="/admin/courses"
				className="flex flex-wrap items-center gap-3"
				role="search"
			>
				<label htmlFor="admin-courses-q" className="sr-only">
					ค้นหาคอร์ส
				</label>
				<Input
					id="admin-courses-q"
					type="search"
					name="q"
					defaultValue={vm.q}
					placeholder="ค้นหาด้วยชื่อหรือ slug"
					className="w-full sm:w-72"
				/>
				<label htmlFor="admin-courses-status" className="sr-only">
					กรองสถานะ
				</label>
				<select
					id="admin-courses-status"
					name="status"
					defaultValue={vm.status}
					className="h-10 rounded-button border border-border bg-card px-3 text-ui text-foreground"
				>
					{STATUSES.map((s) => (
						<option key={s.key} value={s.key}>
							{s.label}
						</option>
					))}
				</select>
				<Button type="submit" variant="primary">
					<MagnifyingGlass size={16} weight="bold" />
					ค้นหา
				</Button>
				{vm.filtersActive && (
					<Link
						href="/admin/courses"
						className="text-uism text-muted-foreground hover:underline"
					>
						ล้างตัวกรอง
					</Link>
				)}
			</form>

			{vm.courses.length === 0 ? (
				<p className="text-body text-muted-foreground">
					{vm.filtersActive
						? "ไม่พบคอร์สที่ตรงกับเงื่อนไข"
						: "ยังไม่มีคอร์ส"}
				</p>
			) : (
				<AdminCourseTable courses={vm.courses} />
			)}
		</section>
	);
}
