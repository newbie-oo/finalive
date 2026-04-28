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

export default async function AdminCoursesPage() {
  const courses = await listAdminCourses();

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-h1">คอร์สทั้งหมด</h1>
          <p className="mt-1 text-body text-(--foreground-muted)">จัดการเนื้อหาและการเผยแพร่</p>
        </div>
        <Button asChild variant="primary">
          <Link href="/admin/courses/new">
            <Plus size={16} weight="bold" /> สร้างคอร์ส
          </Link>
        </Button>
      </header>

      {courses.length === 0 ? (
        <p className="text-body text-(--foreground-muted)">ยังไม่มีคอร์ส</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-(--border) bg-(--surface)">
          <table className="w-full text-ui">
            <thead>
              <tr className="border-b border-(--border) bg-(--surface-muted) text-left">
                <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">ชื่อ</th>
                <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">URL</th>
                <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">สถานะ</th>
                <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">ราคา</th>
                <th className="px-5 py-3" aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b border-(--border) last:border-b-0">
                  <td className="px-5 py-4 font-medium text-(--foreground)">{c.title}</td>
                  <td className="mono px-5 py-4 text-uism text-(--foreground-muted)">{c.slug}</td>
                  <td className="px-5 py-4">
                    <StatusChip tone={STATUS_TONE[c.status] ?? "neutral"}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </StatusChip>
                  </td>
                  <td className="num px-5 py-4 text-(--foreground)">
                    {c.isFree ? "ฟรี" : formatTHB(c.price)}
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
