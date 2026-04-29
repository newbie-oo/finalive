import Link from "next/link";
import {
  ArrowRight,
  Books,
  CurrencyCircleDollar,
  GraduationCap,
  Quotes,
  Star,
  ShieldCheck,
  BookOpen,
  Certificate,
  Play,
} from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layouts/public-shell";
import { CourseCard } from "@/components/course/course-card";
import { listFeaturedCourses } from "@/server/repos/course";
import { getPublicHomeStats } from "@/server/repos/stats";
import { getSession } from "@/server/auth-session";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    n: "01",
    icon: Books,
    title: "เลือกคอร์ส",
    body: "เลือกคอร์สที่ตรงกับเป้าหมาย ดูตัวอย่างฟรีก่อนตัดสินใจ",
  },
  {
    n: "02",
    icon: CurrencyCircleDollar,
    title: "ชำระเงิน",
    body: "โอนผ่านธนาคารหรือ PromptPay อัปสลิป — ตรวจภายใน 24 ชม.",
  },
  {
    n: "03",
    icon: GraduationCap,
    title: "เริ่มเรียน",
    body: "เรียนได้ทุกอุปกรณ์ จบคอร์สรับใบประกาศที่ตรวจสอบออนไลน์",
  },
];

export default async function Home() {
  const [featured, stats, session] = await Promise.all([
    listFeaturedCourses(4),
    getPublicHomeStats(),
    getSession(),
  ]);
  const isLoggedIn = !!session?.user;
  const formattedStudents = stats.activeStudents >= 100
    ? `${stats.activeStudents.toLocaleString("en-US")}+`
    : `${stats.activeStudents}`;

  return (
    <PublicShell>
      {/* Hero */}
      <section className="mx-auto max-w-[1200px] px-6 py-16 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
          <div>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-(--border) bg-(--surface-muted) px-3 py-1.5 text-uism text-(--foreground-muted)">
              <span className="h-2 w-2 rounded-full bg-(--primary)" aria-hidden />
              คอร์สใหม่: DCF Valuation ขั้นสูง — เปิดลงทะเบียนแล้ว
            </span>
            <h1 className="text-display text-(--foreground)">
              เรียนวิเคราะห์การเงิน
              <br />
              กับ <span className="text-(--primary)">creator ไทย</span>
              <br />
              เรียนจบ ได้ใบประกาศ
            </h1>
            <p className="mt-5 max-w-xl text-bodylg text-(--foreground-muted)">
              คอร์สสำหรับคนทำงานสายการเงิน นักวิเคราะห์ และผู้สนใจลงทุน
              เรียนผ่านวิดีโอที่อธิบายทีละขั้น พร้อมไฟล์ Excel ตัวอย่างจริง
              และสอบรับใบประกาศที่ตรวจสอบได้ออนไลน์
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="inline-flex h-12 items-center gap-2 rounded-button bg-(--accent) px-6 text-ui font-medium text-(--accent-fg) transition-colors hover:bg-(--accent-hover)"
              >
                ดูคอร์สทั้งหมด <ArrowRight size={16} weight="bold" />
              </Link>
              {isLoggedIn ? (
                <Link
                  href="/account/enrollments"
                  className="inline-flex h-12 items-center rounded-button border border-(--border) bg-(--surface-muted) px-6 text-ui font-medium text-(--foreground) transition-colors hover:bg-(--surface-sunken)"
                >
                  คอร์สของฉัน
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center rounded-button border border-(--border) bg-(--surface-muted) px-6 text-ui font-medium text-(--foreground) transition-colors hover:bg-(--surface-sunken)"
                >
                  ลงทะเบียนฟรี
                </Link>
              )}
            </div>

            {/* Trust row — sourced from getPublicHomeStats() to avoid the
                misleading hardcoded numbers flagged in QA. Rating omitted
                until a ratings/reviews table exists. */}
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <TrustStat value={formattedStudents} label="นักเรียนที่ลงทะเบียน" />
              <span className="hidden h-8 w-px bg-(--border) sm:block" aria-hidden />
              <TrustStat value={String(stats.publishedCourses)} label="คอร์สเปิดสอน" />
            </div>
          </div>

          <HeroVisual />
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="bg-(--surface-muted) py-16 md:py-24">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
              <div>
                <Eyebrow>คอร์สแนะนำ</Eyebrow>
                <h2 className="mt-2 text-h2">เริ่มต้นจากคอร์สยอดนิยม</h2>
              </div>
              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 text-ui font-medium text-(--primary) hover:underline"
              >
                ดูทั้งหมด <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
              {featured.map((c) => (
                <li key={c.id} className="h-full">
                  <CourseCard course={c} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* How it works */}
      <section id="about" className="py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="mb-12 text-center">
            <Eyebrow>วิธีใช้งาน</Eyebrow>
            <h2 className="mt-2 text-h2">เริ่มเรียนใน 3 ขั้นตอน</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => {
              const Ic = s.icon;
              return (
                <article
                  key={s.n}
                  className="rounded-card border border-(--border) bg-(--surface) p-6"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-card border border-(--border) bg-(--surface-muted) text-(--primary)">
                      <Ic size={28} weight="bold" />
                    </div>
                    <span
                      className="num text-(--foreground-subtle)"
                      style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}
                    >
                      {s.n}
                    </span>
                  </div>
                  <h3 className="text-h3">{s.title}</h3>
                  <p className="mt-2 text-body text-(--foreground-muted)">{s.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-(--surface-muted) py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <article className="relative mx-auto max-w-[880px] rounded-card border border-(--border) bg-(--surface) p-8 md:p-12">
            <Quotes
              size={56}
              weight="bold"
              className="absolute right-6 top-6 text-(--primary)/20 md:right-8 md:top-8"
              aria-hidden
            />
            <p className="max-w-[720px] font-medium text-(--foreground)" style={{ fontSize: 22, lineHeight: 1.55, letterSpacing: "-0.005em" }}>
              “อาจารย์อธิบายเข้าใจง่ายมาก เริ่มจากพื้นฐานที่ไม่เคยรู้
              จนตอนนี้อ่านงบบริษัทแล้วเข้าใจและกล้าตัดสินใจลงทุนเอง
              ไฟล์ Excel ที่แถมก็ใช้ทำงานจริงต่อได้เลย”
            </p>
            <div className="mt-7 flex items-center gap-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-[#6366F1] to-[#8B5CF6] text-lg font-semibold text-white">
                ณก
              </div>
              <div className="flex-1">
                <div className="text-ui font-semibold text-(--foreground)">ณัฐกานต์ จิรพัฒน์</div>
                <div className="text-caption text-(--foreground-muted)">นักวิเคราะห์การลงทุน · กรุงเทพฯ</div>
              </div>
              <div className="hidden items-center gap-1 text-[#F59E0B] md:flex" aria-label="คะแนน 5 ดาว">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={16} weight="fill" />
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-(--primary) py-14 md:py-20">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center md:gap-8">
            <div>
              <h2 className="text-h2 max-w-[640px] text-white">
                {isLoggedIn ? "พร้อมเรียนต่อใช่ไหม?" : "พร้อมเริ่มเรียนแล้วใช่ไหม?"}
              </h2>
              <p className="mt-2.5 max-w-[540px] text-bodylg text-white/80">
                {isLoggedIn
                  ? "เข้าสู่คอร์สของคุณและเรียนต่อจากจุดที่ค้างไว้"
                  : "ลงทะเบียนฟรีวันนี้ เริ่มจากคอร์สตัวอย่าง — ดูได้ทันทีไม่ต้องชำระเงิน"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {isLoggedIn ? (
                <Link
                  href="/account/enrollments"
                  className="inline-flex h-12 items-center gap-2 rounded-button bg-(--accent) px-6 text-ui font-medium text-(--accent-fg) transition-colors hover:bg-(--accent-hover)"
                >
                  คอร์สของฉัน <ArrowRight size={16} weight="bold" />
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center gap-2 rounded-button bg-(--accent) px-6 text-ui font-medium text-(--accent-fg) transition-colors hover:bg-(--accent-hover)"
                >
                  ลงทะเบียนฟรี <ArrowRight size={16} weight="bold" />
                </Link>
              )}
              <Link
                href="/courses"
                className="inline-flex h-12 items-center rounded-button border border-white/25 bg-white/10 px-6 text-ui font-medium text-white transition-colors hover:bg-white/20"
              >
                ดูคอร์สทั้งหมด
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-uism font-semibold text-(--primary)"
      style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
    >
      {children}
    </div>
  );
}

function TrustStat({
  value,
  suffix,
  label,
}: {
  value: string;
  suffix?: string;
  label: string;
}) {
  return (
    <div>
      <div className="num text-(--foreground)" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
        {value}
        {suffix && (
          <span className="ml-1 text-ui font-medium text-(--foreground-muted)">{suffix}</span>
        )}
      </div>
      <div className="mt-1 text-caption text-(--foreground-muted)">{label}</div>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative ml-auto hidden w-full max-w-[540px] select-none grid-cols-2 gap-5 md:grid" style={{ pointerEvents: "none" }}>
      {/* Big featured card */}
      <div
        className="col-span-2 overflow-hidden rounded-card border border-(--border) bg-(--surface) shadow-(--shadow-lg)"
      >
        <div className="relative aspect-video bg-linear-to-br from-[#312E81] to-[#1E1B4B]">
          <div
            aria-hidden
            className="absolute -right-8 -bottom-8 h-50 w-50 rounded-full bg-[#F97316]/20 blur-2xl"
          />
          <div
            aria-hidden
            className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-[#818CF8]/20 blur-2xl"
          />
          <div className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
            <Play size={22} weight="bold" className="text-[#1E1B4B]" />
          </div>
          <span className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
            ตัวอย่างฟรี
          </span>
          <div className="absolute inset-x-4 bottom-4 text-white">
            <div
              className="mb-1 text-[11px] font-medium text-white/70"
              style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              คอร์สแนะนำ
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.25 }}>
              DCF Valuation ขั้นสูง
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between p-4">
          <div className="text-caption text-(--foreground-muted)">
            <span className="num">30</span> บทเรียน · <span className="num">15</span> ชม.
          </div>
          <span className="flex items-baseline gap-1">
            <span className="num text-h4 font-bold text-(--foreground)">3,990</span>
            <span className="text-caption text-(--foreground-muted)">บาท</span>
          </span>
        </div>
      </div>

      {/* Progress card */}
      <div className="rounded-card border border-(--border) bg-(--surface) p-4 shadow-(--shadow-md)">
        <div className="mb-3.5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-(--primary)/10 text-(--primary)">
            <BookOpen size={16} weight="bold" />
          </div>
          <div className="min-w-0">
            <div className="text-uism font-semibold">กำลังเรียน</div>
            <div className="truncate text-caption text-(--foreground-muted)">หุ้นไทย 30 วัน</div>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-(--surface-muted)">
          <div className="h-full rounded-full bg-(--primary)" style={{ width: "64%" }} />
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-caption text-(--foreground-muted)">
            บทที่ <span className="num">12</span>/<span className="num">18</span>
          </span>
          <span className="num text-caption font-semibold text-(--primary)">64%</span>
        </div>
      </div>

      {/* Cert card */}
      <div className="flex flex-col rounded-card border border-(--border) bg-(--surface) p-4 shadow-(--shadow-md)">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-(--success-bg) text-(--success)">
          <Certificate size={18} weight="bold" />
        </div>
        <div className="text-uism font-semibold">ใบประกาศ</div>
        <div className="text-caption text-(--foreground-muted)">ตรวจสอบออนไลน์ได้</div>
        <div className="flex-1" />
        <div className="mt-3 flex items-center gap-1.5 text-(--foreground-muted)">
          <ShieldCheck size={13} />
          <span className="text-caption">SHA-256 verify</span>
        </div>
      </div>
    </div>
  );
}
