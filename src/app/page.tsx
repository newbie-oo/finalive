import Link from "next/link";
import { ArrowRight, MagnifyingGlass, PlayCircle, Certificate } from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layouts/public-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CourseCard } from "@/components/course/course-card";
import { listFeaturedCourses } from "@/server/repos/course";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    icon: MagnifyingGlass,
    title: "1. เลือกคอร์สที่ใช่",
    body: "ดูตัวอย่างวิดีโอ บทเรียน และเนื้อหาก่อนตัดสินใจ",
  },
  {
    icon: PlayCircle,
    title: "2. เรียนเมื่อพร้อม",
    body: "เปิดดูได้ทุกที่ บนทุกอุปกรณ์ ไม่จำกัดเวลา",
  },
  {
    icon: Certificate,
    title: "3. รับใบประกาศ",
    body: "ทำแบบทดสอบให้ผ่าน รับ certificate ตรวจสอบได้จริง",
  },
];

export default async function Home() {
  const featured = await listFeaturedCourses(3);

  return (
    <PublicShell>
      <section className="mx-auto max-w-[1200px] px-6 py-16 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col items-start gap-6">
            <span className="rounded-full bg-(--surface-muted) px-3 py-1 text-uism text-(--primary)">
              Finalive · video-first LMS
            </span>
            <h1 className="text-display text-(--foreground)">
              เรียนการเงินแบบจริงจัง <br className="hidden md:inline" />
              จาก creator ไทย
            </h1>
            <p className="max-w-xl text-bodylg text-(--foreground-muted)">
              แพลตฟอร์ม video-first ที่จัดการคอร์ส จ่ายเงินผ่านสลิป
              และออกใบประกาศอัตโนมัติเมื่อเรียนจบ — เหมาะสำหรับคนทำงานสายการเงินและการลงทุน
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="accent" size="lg">
                <Link href="/courses">
                  ดูคอร์สทั้งหมด <ArrowRight size={18} weight="bold" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/login">เข้าสู่ระบบ</Link>
              </Button>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-(--border) bg-gradient-to-br from-(--surface-muted) to-(--surface-sunken)">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-(--primary) text-(--primary-fg) shadow-(--shadow-lg)">
                <PlayCircle size={40} weight="fill" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-6 pb-16 md:pb-20">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-h2">คอร์สแนะนำ</h2>
            <Link href="/courses" className="text-ui font-medium text-(--primary) hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <li key={c.id}>
                <CourseCard course={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="about" className="mx-auto max-w-[1200px] px-6 pb-16 md:pb-20">
        <div className="mb-8">
          <h2 className="text-h2">เริ่มเรียนได้ใน 3 ขั้นตอน</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => {
            const Ic = s.icon;
            return (
              <Card key={s.title}>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-card bg-(--surface-muted) text-(--primary)">
                  <Ic size={24} weight="bold" />
                </div>
                <h3 className="text-h4 text-(--foreground)">{s.title}</h3>
                <p className="mt-2 text-body text-(--foreground-muted)">{s.body}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 pb-20">
        <Card className="bg-(--surface-muted)">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-h3">พร้อมเริ่มแล้วใช่ไหม?</h3>
              <p className="mt-1 text-body text-(--foreground-muted)">
                สมัครฟรี — เริ่มเรียนคอร์สแรกของคุณวันนี้
              </p>
            </div>
            <Button asChild variant="accent" size="lg">
              <Link href="/register">สมัครสมาชิก</Link>
            </Button>
          </div>
        </Card>
      </section>
    </PublicShell>
  );
}
