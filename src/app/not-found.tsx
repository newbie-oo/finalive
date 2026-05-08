import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <MagnifyingGlass
        size={64}
        weight="light"
        className="text-foreground-subtle"
      />
      <div>
        <h1 className="text-h1">404</h1>
        <p className="mt-2 text-bodylg text-muted-foreground">
          ไม่พบหน้าที่คุณต้องการ
        </p>
      </div>
      <Button asChild variant="primary" size="lg">
        <Link href="/">กลับหน้าหลัก</Link>
      </Button>
    </main>
  );
}
