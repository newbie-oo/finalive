import { PublicShell } from "@/components/layouts/public-shell";

export default function ForbiddenPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-md p-8 text-center">
        <h1 className="mb-2 text-2xl font-semibold">403 — ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="text-sm text-muted-foreground">
          บัญชีนี้ไม่มีสิทธิ์เข้าหน้าที่ขอ
        </p>
      </section>
    </PublicShell>
  );
}
