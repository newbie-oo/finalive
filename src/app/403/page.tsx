import Link from "next/link";
import { Lock } from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layouts/public-shell";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <PublicShell>
      <section className="mx-auto flex max-w-md flex-col items-center gap-6 px-6 py-24 text-center">
        <Lock size={64} weight="light" className="text-(--foreground-subtle)" />
        <div>
          <h1 className="text-h1">403</h1>
          <p className="mt-2 text-bodylg text-(--foreground-muted)">
            บัญชีนี้ไม่มีสิทธิ์เข้าหน้าที่ขอ
          </p>
        </div>
        <Button asChild variant="primary" size="lg">
          <Link href="/">กลับหน้าหลัก</Link>
        </Button>
      </section>
    </PublicShell>
  );
}
