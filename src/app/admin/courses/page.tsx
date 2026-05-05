import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { listAdminCourses } from "@/server/repos/admin-course";
import { formatTHB } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";

export const dynamic = "force-dynamic";

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

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q : "";
  const statusParam = typeof sp.status === "string" ? sp.status : "all";
  const status: "draft" | "published" | "archived" | "all" =
    statusParam === "draft" ||
    statusParam === "published" ||
    statusParam === "archived"
      ? statusParam
      : "all";
  const courses = await listAdminCourses({ q, status });
  const filtersActive = q.length > 0 || status !== "all";

  const STATUSES: Array<{
    key: "all" | "draft" | "published" | "archived";
    label: string;
  }> = [
    { key: "all", label: "ทั้งหมด" },
    { key: "published", label: "เผยแพร่" },
    { key: "draft", label: "ร่าง" },
    { key: "archived", label: "เก็บถาวร" },
  ];

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-h1">คอร์สทั้งหมด</h1>
          <p className="mt-1 text-body text-(--foreground-muted)">
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
        <input
          id="admin-courses-q"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="ค้นหาด้วยชื่อหรือ slug"
          className="h-10 w-full rounded-button border border-(--border) bg-(--surface) px-3 text-ui sm:w-72"
        />
        <label htmlFor="admin-courses-status" className="sr-only">
          กรองสถานะ
        </label>
        <select
          id="admin-courses-status"
          name="status"
          defaultValue={status}
          className="h-10 rounded-button border border-(--border) bg-(--surface) px-3 text-ui"
        >
          {STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-button bg-(--accent) px-4 text-ui font-medium text-(--accent-fg)"
        >
          ค้นหา
        </button>
        {filtersActive && (
          <Link
            href="/admin/courses"
            className="text-uism text-(--foreground-muted) hover:underline"
          >
            ล้างตัวกรอง
          </Link>
        )}
      </form>

      {courses.length === 0 ? (
        <p className="text-body text-(--foreground-muted)">
          {filtersActive ? "ไม่พบคอร์สที่ตรงกับเงื่อนไข" : "ยังไม่มีคอร์ส"}
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-(--border) bg-(--surface)">
          <table className="w-full text-ui">
            <thead>
              <tr className="border-b border-(--border) bg-(--surface-muted) text-left">
                <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
                  ชื่อ
                </th>
                <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
                  URL
                </th>
                <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
                  สถานะ
                </th>
                <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">
                  ราคา
                </th>
                <th className="px-5 py-3 text-right text-uism font-semibold text-(--foreground-muted)">
                  ผู้เรียน
                </th>
                <th className="px-5 py-3" aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-(--border) last:border-b-0"
                >
                  <td className="px-5 py-4 font-medium text-(--foreground)">
                    {c.title}
                  </td>
                  <td className="mono px-5 py-4 text-uism text-(--foreground-muted)">
                    {c.slug}
                  </td>
                  <td className="px-5 py-4">
                    <StatusChip tone={STATUS_TONE[c.status] ?? "neutral"}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </StatusChip>
                  </td>
                  <td className="num px-5 py-4 text-(--foreground)">
                    {c.isFree ? "ฟรี" : formatTHB(c.price)}
                  </td>
                  <td className="num px-5 py-4 text-right text-(--foreground)">
                    {c.enrollmentCount.toLocaleString("th-TH")}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/courses/${c.id}`}
                      className="text-uism font-medium text-(--primary) hover:underline"
                    >
                      แก้ไข →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
