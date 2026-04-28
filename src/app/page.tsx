import Link from "next/link";
import { PublicShell } from "@/components/layouts/public-shell";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <PublicShell>
      <section className="mx-auto flex max-w-3xl flex-col items-start gap-6 px-8 py-24">
        <h1 className="text-3xl font-semibold tracking-tight">
          เรียนคอร์สวิดีโอจาก creator ไทย
        </h1>
        <p className="text-base text-muted-foreground">
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
    </PublicShell>
  );
}
