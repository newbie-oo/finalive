import { PublicShell } from "@/components/layouts/public-shell";

export const metadata = {
  title: "Privacy Policy — Finalive",
};

export default function PrivacyPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-2xl px-8 py-12">
        <h1 className="text-2xl font-semibold">นโยบายความเป็นส่วนตัว</h1>
        <p className="mt-2 text-sm text-muted-foreground">อัปเดตล่าสุด: 28 เมษายน 2026</p>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-foreground">
          <h2 className="text-lg font-medium">1. ข้อมูลที่เราเก็บรวบรวม</h2>
          <p>
            เราเก็บรวบรวมข้อมูลที่จำเป็นสำหรับการให้บริการ ได้แก่ ชื่อ อีเมล
            ข้อมูลการลงทะเบียนคอร์ส ประวัติการชำระเงิน และข้อมูลการใช้งานแพลตฟอร์ม
          </p>

          <h2 className="text-lg font-medium">2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
          <p>
            ข้อมูลของผู้ใช้ถูกใช้เพื่อให้บริการการเรียนรู้ จัดการการชำระเงิน
            ออกใบประกาศนียบัตร และปรับปรุงประสบการณ์การใช้งานของผู้ใช้
          </p>

          <h2 className="text-lg font-medium">3. การแชร์ข้อมูล</h2>
          <p>
            เราไม่ขายหรือให้เช่าข้อมูลส่วนบุคคลของผู้ใช้แก่บุคคลที่สาม
            ข้อมูลอาจถูกเปิดเผยต่อผู้ให้บริการที่ช่วยเราดำเนินการทางเทคนิค
            (เช่น การจัดเก็บวิดีโอ การส่งอีเมล) ภายใต้ข้อตกลงความลับ
          </p>

          <h2 className="text-lg font-medium">4. ความปลอดภัย</h2>
          <p>
            เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสมเพื่อปกป้องข้อมูลของผู้ใช้
            รวมถึงการเข้ารหัส SSL การตรวจสอบสิทธิ์ และการสำรองข้อมูลเป็นประจำ
          </p>

          <h2 className="text-lg font-medium">5. สิทธิของผู้ใช้</h2>
          <p>
            ผู้ใช้มีสิทธิ์เข้าถึง แก้ไข หรือขอลบข้อมูลส่วนบุคคลของตนเองได้
            โดยติดต่อผ่านช่องทาง support ที่ระบุไว้ในแพลตฟอร์ม
          </p>
        </section>
      </article>
    </PublicShell>
  );
}
