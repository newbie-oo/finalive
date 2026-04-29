import Link from "next/link";
import { YoutubeLogo, GraduationCap, BookOpen } from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layouts/public-shell";
import { getPublicHomeStats } from "@/server/repos/stats";

export const metadata = {
  title: "ผู้สอน — Finalive",
  description: "เรียนรู้เกี่ยวกับผู้สอนและที่มาของ Finalive",
};

export const dynamic = "force-dynamic";

export default async function InstructorPage() {
  const stats = await getPublicHomeStats();
  const formattedStudents = stats.activeStudents >= 100
    ? `${stats.activeStudents.toLocaleString("en-US")}+`
    : `${stats.activeStudents}`;
  return (
    <PublicShell>
      <section className="mx-auto max-w-[720px] px-6 py-16 md:py-24">
        {/* Profile card */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-5 inline-flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-[#6366F1] to-[#8B5CF6] text-3xl font-bold text-white">
            AR
          </div>
          <h1 className="text-h1 text-(--foreground)">Arm Riley Quant</h1>
          <p className="mt-2 text-body text-(--foreground-muted)">
            นักวิเคราะห์การลงทุน · ผู้ก่อตั้ง Finalive
          </p>
          <div className="mt-4 flex gap-2">
            <a
              href="https://www.youtube.com/@armrileyquant"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-button bg-(--destructive) px-4 text-ui font-medium text-white transition-colors hover:bg-[#B91C1C]"
            >
              <YoutubeLogo size={18} weight="fill" /> ติดตามบน YouTube
            </a>
          </div>
        </div>

        {/* Bio */}
        <article className="space-y-6 text-body text-(--foreground-muted)">
          <p>
            Arm เป็นผู้ก่อตั้ง Finalive — แพลตฟอร์มการศึกษาด้านการเงินและการลงทุนสำหรับคนทำงานสายการเงินในไทย
            ด้วยประสบการณ์กว่า 10 ปีในวงการวิเคราะห์การลงทุนและการจัดการพอร์ต
          </p>
          <p>
            จุดเริ่มต้นของ Finalive มาจากความต้องการถ่ายทอดความรู้เชิงลึกด้าน Valuation, DCF,
            และ Financial Modeling ให้กับนักลงทุนรายย่อยและคนทำงานสายการเงินในรูปแบบที่เข้าใจง่าย
            ผ่านวิดีโอภาษาไทย พร้อมไฟล์ Excel ตัวอย่างจริงที่นำไปใช้ต่อได้ทันที
          </p>
        </article>

        {/* Stats — sourced from getPublicHomeStats(); rating omitted until a
            ratings table exists. */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <HighlightCard
            icon={BookOpen}
            value={String(stats.publishedCourses)}
            label="คอร์สเปิดสอน"
          />
          <HighlightCard
            icon={GraduationCap}
            value={formattedStudents}
            label="นักเรียนที่ลงทะเบียน"
          />
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-card border border-(--border) bg-(--surface-muted) p-6 text-center">
          <h2 className="text-h3 text-(--foreground)">พร้อมเรียนกับ Arm?</h2>
          <p className="mt-2 text-body text-(--foreground-muted)">
            เริ่มต้นจากคอร์สยอดนิยม หรือดูตัวอย่างฟรีบน YouTube
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/courses"
              className="inline-flex h-11 items-center gap-2 rounded-button bg-(--accent) px-5 text-ui font-medium text-(--accent-fg) transition-colors hover:bg-(--accent-hover)"
            >
              ดูคอร์สทั้งหมด
            </Link>
            <a
              href="https://www.youtube.com/@armrileyquant"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-button border border-(--border) bg-(--surface) px-5 text-ui font-medium text-(--foreground) transition-colors hover:bg-(--surface-sunken)"
            >
              <YoutubeLogo size={16} weight="fill" /> ดูตัวอย่างฟรี
            </a>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function HighlightCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof BookOpen;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-(--border) bg-(--surface) p-5 text-center">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-(--primary)/10 text-(--primary)">
        <Icon size={20} weight="bold" />
      </div>
      <div className="num text-h4 font-bold text-(--foreground)">{value}</div>
      <div className="mt-1 text-caption text-(--foreground-muted)">{label}</div>
    </div>
  );
}
