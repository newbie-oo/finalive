import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Stepper } from "@/components/ui/stepper";

// Labels match handoff §Checkout — short and consistent across the 4 pages.
const STEPS = [
  { label: "ลงทะเบียน" },
  { label: "ชำระเงิน" },
  { label: "ตรวจสอบ" },
  { label: "เริ่มเรียน" },
];

export function CheckoutShell({
  step,
  children,
}: {
  /** Zero-based step index. 0=start, 1=payment, 2=upload-slip, 3=status */
  step: 0 | 1 | 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-(--primary) focus:px-3 focus:py-2 focus:text-(--primary-fg)"
      >
        ข้ามไปยังเนื้อหา
      </a>
      <header className="sticky top-0 z-50 border-b border-(--border) bg-(--background)/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-6">
          <Link href="/" className="flex items-center gap-2 text-(--foreground)">
            <span className="h-2.5 w-2.5 rounded-full bg-(--primary)" aria-hidden />
            <span className="text-[18px] font-semibold tracking-tight">Finalive</span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="border-t border-(--border) bg-(--surface-muted)/40">
          <div className="mx-auto h-12 max-w-[1200px] px-6">
            <div className="flex h-full items-center">
              <Stepper steps={STEPS} current={step} />
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-8">
        {children}
      </main>

      <footer className="border-t border-(--border) py-6">
        <div className="mx-auto max-w-[1200px] px-6 text-caption text-(--foreground-subtle)">
          ต้องการความช่วยเหลือ? ติดต่อ hello@finalive.dev
        </div>
      </footer>
    </div>
  );
}
