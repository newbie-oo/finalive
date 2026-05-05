import { PublicShell } from "@/components/layouts/public-shell";

export const metadata = {
  title: "Terms of Service — Finalive",
};

export default function TermsPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-[720px] px-6 py-12 md:py-16">
        <h1 className="text-h1">ข้อกำหนดการใช้งาน</h1>
        <p className="mt-2 text-uism text-(--foreground-muted)">
          อัปเดตล่าสุด: 28 เมษายน 2026
        </p>

        <section className="mt-8 space-y-6 text-bodylg text-(--foreground) [&_h2]:text-h3 [&_h2]:mt-8 [&_p]:text-(--foreground-muted)">
          <h2 className="text-lg font-medium">1. บริการ</h2>
          <p>
            Finalive เป็นแพลตฟอร์มการเรียนรู้แบบวิดีโอ
            ผู้ใช้สามารถลงทะเบียนเรียนคอร์ส ชำระเงินผ่านการโอนเงินและส่งสลิป
            และรับใบประกาศนียบัตรเมื่อเรียนจบ
          </p>

          <h2 className="text-lg font-medium">2. บัญชีผู้ใช้</h2>
          <p>
            ผู้ใช้ต้องให้ข้อมูลที่ถูกต้องและเป็นปัจจุบัน ห้ามใช้บัญชีของผู้อื่น
            หรือสร้างบัญชีหลายบัญชีเพื่อหลีกเลี่ยงข้อกำหนด
          </p>

          <h2 className="text-lg font-medium">3. การชำระเงินและคืนเงิน</h2>
          <p>
            การชำระเงินผ่านการโอนเงินจะต้องได้รับการยืนยันจาก admin
            ก่อนจึงจะสามารถเข้าเรียนได้ กรณีขอคืนเงิน
            ผู้ใช้สามารถติดต่อผ่านช่องทางที่ระบุไว้ภายใน 7 วัน
          </p>

          <h2 className="text-lg font-medium">4. ทรัพย์สินทางปัญญา</h2>
          <p>
            เนื้อหาทั้งหมดในคอร์ส รวมถึงวิดีโอ เอกสาร และแบบทดสอบ
            เป็นทรัพย์สินของผู้สร้างคอร์สและ Finalive
            ห้ามคัดลอกหรือเผยแพร่โดยไม่ได้รับอนุญาต
          </p>

          <h2 className="text-lg font-medium">5. การเปลี่ยนแปลงข้อกำหนด</h2>
          <p>
            Finalive สงวนสิทธิ์ในการแก้ไขข้อกำหนดนี้ได้ตลอดเวลา
            การใช้งานต่อเนื่องถือว่าผู้ใช้ยอมรับข้อกำหนดฉบับปรับปรุงแล้ว
          </p>
        </section>
      </article>
    </PublicShell>
  );
}
