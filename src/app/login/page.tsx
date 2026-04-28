import { PublicShell } from "@/components/layouts/public-shell";

export default function LoginPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-sm p-8">
        <h1 className="mb-2 text-xl font-semibold">เข้าสู่ระบบ</h1>
        <p className="text-sm text-muted-foreground">
          ฟอร์ม Better Auth จะถูกเชื่อมในสปรินต์ถัดไป
        </p>
      </section>
    </PublicShell>
  );
}
