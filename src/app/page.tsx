import Link from "next/link";
import { PublicShell } from "@/components/layouts/public-shell";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/course/course-card";
import { listFeaturedCourses } from "@/server/repos/course";

export const dynamic = "force-dynamic";

export default async function Home() {
  const featured = await listFeaturedCourses(3);

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-3xl flex-col items-start gap-6 px-8 py-24">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          เรียนคอร์สวิดีโอจาก creator ไทย
        </h1>
        <p className="text-base text-muted-foreground md:text-lg">
          Finalive เป็นแพลตฟอร์ม video-first ที่จัดการคอร์ส จ่ายเงินผ่านสลิป
          และออกใบประกาศอัตโนมัติเมื่อเรียนจบ
        </p>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/courses">ดูคอร์สทั้งหมด</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">เข้าสู่ระบบ</Link>
          </Button>
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="mx-auto max-w-6xl px-8 pb-24">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">คอร์สแนะนำ</h2>
            <Link href="/courses" className="text-sm text-primary hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <li key={c.id}>
                <CourseCard course={c} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PublicShell>
  );
}
