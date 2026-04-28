"use client";

import Link from "next/link";
import { useState } from "react";
import { List, X, EnvelopeSimple, ChatCircle } from "@phosphor-icons/react";
import { useSession } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/courses", label: "คอร์ส" },
  { href: "/#about", label: "เกี่ยวกับ" },
];

const FOOTER_COLS: Array<{ heading: string; links: Array<{ label: string; href: string }> }> = [
  {
    heading: "ผลิตภัณฑ์",
    links: [
      { label: "คอร์สทั้งหมด", href: "/courses" },
      { label: "ใบประกาศ", href: "/account/certificates" },
    ],
  },
  {
    heading: "เกี่ยวกับ",
    links: [
      { label: "ผู้สอน", href: "/#about" },
      { label: "ติดต่อเรา", href: "mailto:hello@finalive.co" },
    ],
  },
  {
    heading: "กฎหมาย",
    links: [
      { label: "ข้อตกลงการใช้งาน", href: "/legal/terms" },
      { label: "นโยบายความเป็นส่วนตัว", href: "/legal/privacy" },
    ],
  },
];

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-(--primary) focus:px-3 focus:py-2 focus:text-(--primary-fg)">
        ข้ามไปยังเนื้อหา
      </a>
      <header
        className="sticky top-0 z-50 h-16 border-b border-(--border) backdrop-blur-md"
        style={{ background: "color-mix(in srgb, var(--background) 80%, transparent)" }}
      >
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-6 px-6">
          <Link href="/" className="flex items-center gap-2 text-(--foreground)">
            <span className="h-2.5 w-2.5 rounded-full bg-(--primary)" aria-hidden />
            <span className="text-[18px] font-semibold tracking-tight">Finalive</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="หลัก">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-nav px-3.5 py-2 text-ui text-(--foreground-muted) transition-colors hover:bg-(--surface-muted) hover:text-(--foreground)"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            {session?.user ? (
              <UserProfileDropdown
                name={session.user.name}
                email={session.user.email}
                image={(session.user as { image?: string | null }).image}
                links={[
                  { href: "/account", label: "บัญชี" },
                  { href: "/account/enrollments", label: "คอร์สของฉัน" },
                  { href: "/account/certificates", label: "ใบประกาศ" },
                  { href: "/account/security", label: "ความปลอดภัย" },
                ]}
              />
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">เข้าสู่ระบบ</Link>
                </Button>
                <Button asChild variant="primary" size="sm">
                  <Link href="/register">สมัคร</Link>
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label={drawerOpen ? "ปิดเมนู" : "เปิดเมนู"}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((o) => !o)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-nav text-(--foreground) hover:bg-(--surface-muted) md:hidden"
          >
            {drawerOpen ? <X size={20} /> : <List size={20} />}
          </button>
        </div>

        {drawerOpen && (
          <div className="border-t border-(--border) bg-(--surface) md:hidden">
            <nav className="mx-auto flex max-w-[1200px] flex-col gap-1 px-6 py-4" aria-label="เมนูมือถือ">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-nav px-3 py-2 text-ui text-(--foreground) hover:bg-(--surface-muted)"
                  onClick={() => setDrawerOpen(false)}
                >
                  {n.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-(--border)" />
              {session?.user ? (
                <Link
                  href="/account"
                  className="rounded-nav px-3 py-2 text-ui text-(--foreground) hover:bg-(--surface-muted)"
                  onClick={() => setDrawerOpen(false)}
                >
                  บัญชีของฉัน
                </Link>
              ) : (
                <>
                  <Button asChild variant="ghost" size="md" className="justify-start">
                    <Link href="/login" onClick={() => setDrawerOpen(false)}>เข้าสู่ระบบ</Link>
                  </Button>
                  <Button asChild variant="primary" size="md">
                    <Link href="/register" onClick={() => setDrawerOpen(false)}>สมัคร</Link>
                  </Button>
                </>
              )}
              <div className="mt-2 flex justify-end">
                <ThemeToggle />
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="main" className="flex-1">{children}</main>

      <footer className="border-t border-(--border) bg-(--surface-muted) py-12">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid gap-8 md:grid-cols-[2fr_1fr_1fr_1fr] md:gap-12">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-(--primary)" aria-hidden />
                <span className="text-[18px] font-semibold">Finalive</span>
              </div>
              <p className="max-w-xs text-body text-(--foreground-muted)">
                คอร์สวิเคราะห์การเงินและการลงทุน สำหรับคนทำงานสายการเงิน
              </p>
              <div className="mt-4 flex gap-2">
                <a href="mailto:hello@finalive.co" aria-label="email" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-(--foreground-muted) hover:bg-(--surface) hover:text-(--foreground)">
                  <EnvelopeSimple size={16} />
                </a>
                <a href="#" aria-label="line" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-(--foreground-muted) hover:bg-(--surface) hover:text-(--foreground)">
                  <ChatCircle size={16} />
                </a>
              </div>
            </div>
            {FOOTER_COLS.map((c) => (
              <div key={c.heading}>
                <div className="mb-3.5 text-uism uppercase text-(--foreground-subtle)">{c.heading}</div>
                <ul className="flex flex-col gap-2.5">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-body text-(--foreground-muted) hover:text-(--foreground)">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col justify-between gap-3 border-t border-(--border) pt-6 md:flex-row">
            <div className="text-caption text-(--foreground-subtle)">
              © {new Date().getFullYear()} Finalive · สงวนลิขสิทธิ์
            </div>
            <div className="text-caption text-(--foreground-subtle)">
              ติดต่อ: hello@finalive.co
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
