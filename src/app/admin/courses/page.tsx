import Link from "next/link";
import { listAdminCourses } from "@/server/repos/admin-course";
import { formatTHB } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const courses = await listAdminCourses();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">คอร์สทั้งหมด</h1>
        <Link
          href="/admin/courses/new"
          className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          + สร้างคอร์ส
        </Link>
      </div>

      {courses.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">ยังไม่มีคอร์ส</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">ชื่อ</th>
                <th className="pb-2 pr-4">Slug</th>
                <th className="pb-2 pr-4">สถานะ</th>
                <th className="pb-2 pr-4">ราคา</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="py-3 pr-4 font-medium">{c.title}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{c.slug}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-3 pr-4">
                    {c.isFree ? "ฟรี" : formatTHB(c.price)}
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/admin/courses/${c.id}`}
                      className="text-xs text-primary hover:underline"
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
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "ร่าง",
    published: "เผยแพร่",
    archived: "เก็บถาวร",
  };
  const color: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    published: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    archived: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${color[status] ?? ""}`}>
      {map[status] ?? status}
    </span>
  );
}
