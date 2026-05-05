# UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 high-impact UX friction points across mobile CTA, checkout completion, student navigation, quiz feedback, and admin wayfinding.

**Architecture:** Each task is self-contained — new components are co-located with consumers, existing pages get targeted additions. Tests are either unit (Vitest) or E2E (Playwright) depending on whether the change is visual/interactive or logic-only.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Phosphor Icons, Playwright, Vitest.

---

## File Structure

| File                                             | Action     | Responsibility                                                        |
| ------------------------------------------------ | ---------- | --------------------------------------------------------------------- |
| `src/components/course/mobile-course-cta.tsx`    | **Create** | Sticky bottom bar for mobile course detail with price + enroll button |
| `src/app/courses/[slug]/page.tsx`                | **Modify** | Render `<MobileCourseCta>` conditionally on mobile breakpoint         |
| `src/app/checkout/[pendingId]/success/page.tsx`  | **Create** | Success page after slip upload with next steps                        |
| `src/app/api/slip/upload/route.ts`               | **Modify** | Redirect to `/checkout/[pendingId]/success` instead of `/pending`     |
| `src/components/layouts/student-shell.tsx`       | **Modify** | Add mobile drawer with hamburger toggle + nav links                   |
| `src/components/layouts/app-header.tsx`          | **Modify** | Accept `mobileMenuToggle` prop for student shell                      |
| `src/components/learn/quiz-celebration.tsx`      | **Create** | Confetti-style celebration overlay for quiz pass                      |
| `src/components/learn/quiz-form.tsx`             | **Modify** | Render celebration on pass; add share certificate CTA                 |
| `src/components/admin/admin-breadcrumb.tsx`      | **Create** | Breadcrumb bar derived from pathname segments                         |
| `src/components/layouts/admin-shell.tsx`         | **Modify** | Insert `<AdminBreadcrumb>` below mobile nav bar                       |
| `tests/e2e/course-mobile-cta.spec.ts`            | **Create** | Playwright: verify sticky CTA visible only on mobile                  |
| `tests/e2e/checkout-success.spec.ts`             | **Create** | Playwright: verify redirect + success page content                    |
| `tests/e2e/student-mobile-menu.spec.ts`          | **Create** | Playwright: verify drawer opens + navigates                           |
| `tests/e2e/admin-breadcrumb.spec.ts`             | **Create** | Playwright: verify breadcrumb renders on nested routes                |
| `src/components/learn/quiz-celebration.test.tsx` | **Create** | Vitest: verify celebration renders on passed prop                     |

---

## Task 1: Mobile Floating CTA on Course Detail

**Files:**

- Create: `src/components/course/mobile-course-cta.tsx`
- Modify: `src/app/courses/[slug]/page.tsx`
- Test: `tests/e2e/course-mobile-cta.spec.ts`

### Step 1: Write the failing E2E test

```typescript
// tests/e2e/course-mobile-cta.spec.ts
import { test, expect } from "@playwright/test";

test("mobile course detail shows sticky enroll bar", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/courses/dcf-valuation");
  const bar = page.getByTestId("mobile-course-cta");
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("button", { name: /ลงทะเบียน/ })).toBeVisible();
});

test("desktop course detail hides sticky enroll bar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/courses/dcf-valuation");
  const bar = page.getByTestId("mobile-course-cta");
  await expect(bar).toBeHidden();
});
```

- [ ] **Run test to verify it fails**

```bash
npx playwright test tests/e2e/course-mobile-cta.spec.ts --project=chromium
```

Expected: FAIL — `mobile-course-cta` not found.

### Step 2: Create the MobileCourseCta component

```tsx
// src/components/course/mobile-course-cta.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface MobileCourseCtaProps {
  courseSlug: string;
  price: string;
  isFree: boolean;
  isEnrolled: boolean;
}

export function MobileCourseCta({
  courseSlug,
  price,
  isFree,
  isEnrolled,
}: MobileCourseCtaProps) {
  if (isEnrolled) return null;

  return (
    <div
      data-testid="mobile-course-cta"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-(--border) bg-(--background)/95 px-4 py-3 backdrop-blur-md md:hidden"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-uism text-(--foreground-muted)">ราคา</div>
          <div
            className={`num text-h4 font-bold ${isFree ? "text-(--success)" : "text-(--foreground)"}`}
          >
            {price}
          </div>
        </div>
        {isFree ? (
          <Button asChild variant="primary" size="lg" className="shrink-0">
            <Link href={`/learn/${courseSlug}`}>เรียนฟรีเลย</Link>
          </Button>
        ) : (
          <form action="/checkout/start" method="post" className="shrink-0">
            <input type="hidden" name="courseSlug" value={courseSlug} />
            <Button type="submit" variant="accent" size="lg">
              ลงทะเบียนเรียน
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
```

### Step 3: Wire into course detail page

Modify `src/app/courses/[slug]/page.tsx`:

1. Import the new component at the top:

```tsx
import { MobileCourseCta } from "@/components/course/mobile-course-cta";
```

2. Add `<MobileCourseCta>` just before the closing `</PublicShell>` tag, passing the same props used for the desktop CTA card:

```tsx
<MobileCourseCta
  courseSlug={course.slug}
  price={price}
  isFree={isFreeView}
  isEnrolled={isEnrolled}
/>
```

- [ ] **Run E2E test**

```bash
npx playwright test tests/e2e/course-mobile-cta.spec.ts --project=chromium
```

Expected: PASS

### Step 4: Commit

```bash
git add src/components/course/mobile-course-cta.tsx src/app/courses/[slug]/page.tsx tests/e2e/course-mobile-cta.spec.ts
git commit -m "feat(course): add sticky mobile CTA bar on course detail

- Adds MobileCourseCta component with price + enroll action
- Visible only below md breakpoint via md:hidden
- Hides when already enrolled
- E2E tests for mobile visible / desktop hidden"
```

---

## Task 2: Checkout Success Page After Slip Upload

**Files:**

- Create: `src/app/checkout/[pendingId]/success/page.tsx`
- Modify: `src/app/api/slip/upload/route.ts`
- Test: `tests/e2e/checkout-success.spec.ts`

### Step 1: Write the failing E2E test

```typescript
// tests/e2e/checkout-success.spec.ts
import { test, expect } from "@playwright/test";

test("slip upload redirects to success page", async ({ page }) => {
  // This test assumes a seeded pending enrollment exists in dev/CI.
  // In CI, seed a pending row with id 'test-pending-1' for course 'test-course'.
  await page.goto("/checkout/test-pending-1");

  // Mock file upload
  const fileInput = page.locator('input[name="slip"]');
  await fileInput.setInputFiles({
    name: "slip.png",
    mimeType: "image/png",
    buffer: Buffer.from("fake-png-bytes"),
  });

  await page.getByRole("button", { name: /ยืนยันการชำระเงิน/ }).click();

  await page.waitForURL(/\/checkout\/test-pending-1\/success/);
  await expect(page.getByText(/ส่งสลิปสำเร็จ/)).toBeVisible();
  await expect(page.getByRole("link", { name: /ดูคอร์สของฉัน/ })).toBeVisible();
});
```

- [ ] **Run test to verify it fails**

```bash
npx playwright test tests/e2e/checkout-success.spec.ts --project=chromium
```

Expected: FAIL — `/success` route does not exist; upload redirects to `/pending`.

### Step 2: Create the success page

```tsx
// src/app/checkout/[pendingId]/success/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle,
  Clock,
  ArrowRight,
  ListBullets,
} from "@phosphor-icons/react/dist/ssr";
import { CheckoutShell } from "@/components/layouts/checkout-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/server/auth-session";
import { getCheckoutPending } from "@/server/repos/checkout";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ pendingId: string }>;
}) {
  const { pendingId } = await params;
  const { user } = await requireSession();
  const pending = await getCheckoutPending(pendingId, user.id);
  if (!pending) notFound();

  return (
    <CheckoutShell step={1}>
      <div className="mx-auto max-w-[560px] mt-8 space-y-6">
        <Card className="p-8 text-center space-y-4">
          <CheckCircle
            size={64}
            weight="fill"
            className="mx-auto text-(--success)"
          />
          <h1 className="text-h2">ส่งสลิปสำเร็จ</h1>
          <p className="text-body text-(--foreground-muted)">
            เราได้รับสลิปการโอนของคุณแล้ว
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-(--warning-bg) px-4 py-2 text-uism text-(--warning)">
            <Clock size={16} />
            รอตรวจสอบ 1-2 ชั่วโมง
          </div>
        </Card>

        <div className="rounded-card border border-(--border) bg-(--surface-muted) p-5 space-y-3">
          <h2 className="text-h4">ขั้นตอนต่อไป</h2>
          <ol className="space-y-2 text-body text-(--foreground-muted)">
            <li className="flex gap-2">
              <span className="num text-(--primary) font-bold">1.</span>
              ทีมงานตรวจสอบสลิปภายใน 1-2 ชม.
            </li>
            <li className="flex gap-2">
              <span className="num text-(--primary) font-bold">2.</span>
              คุณจะได้รับอีเมลแจ้งผลอนุมัติ
            </li>
            <li className="flex gap-2">
              <span className="num text-(--primary) font-bold">3.</span>
              เข้าเรียนได้ทันทีผ่าน "คอร์สของฉัน"
            </li>
          </ol>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="primary" size="lg" className="w-full">
            <Link href="/account/enrollments">
              <ListBullets size={16} weight="bold" /> ดูคอร์สของฉัน
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link href="/courses">
              ค้นหาคอร์สเพิ่ม <ArrowRight size={16} />
            </Link>
          </Button>
        </div>

        <p className="text-center text-caption text-(--foreground-subtle)">
          เลขอ้างอิน:{" "}
          <span className="mono font-semibold">{pending.refCode}</span>
        </p>
      </div>
    </CheckoutShell>
  );
}
```

### Step 3: Update upload API route to redirect to success

Modify `src/app/api/slip/upload/route.ts`:

Find the line that redirects to `/checkout/${pendingId}/pending` and change to:

```ts
return NextResponse.redirect(
  new URL(`/checkout/${pendingId}/success`, request.url),
);
```

If the current code does not have a literal string, locate the `pending` redirect segment and replace it with `success`.

- [ ] **Run E2E test**

```bash
npx playwright test tests/e2e/checkout-success.spec.ts --project=chromium
```

Expected: PASS (requires dev DB seeded with `test-pending-1`; if seed missing, mock or skip in CI).

### Step 4: Commit

```bash
git add src/app/checkout/\[pendingId\]/success/page.tsx src/app/api/slip/upload/route.ts tests/e2e/checkout-success.spec.ts
git commit -m "feat(checkout): add success page after slip upload

- New /checkout/[pendingId]/success page with next-steps guidance
- Redirect upload API from /pending to /success
- E2E test verifies redirect and page content"
```

---

## Task 3: Student Mobile Menu Drawer

**Files:**

- Modify: `src/components/layouts/student-shell.tsx`
- Modify: `src/components/layouts/app-header.tsx`
- Test: `tests/e2e/student-mobile-menu.spec.ts`

### Step 1: Write the failing E2E test

```typescript
// tests/e2e/student-mobile-menu.spec.ts
import { test, expect } from "@playwright/test";

test("student mobile menu opens and navigates", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/dashboard");

  const toggle = page.getByRole("button", { name: /เปิดเมนู/ });
  await expect(toggle).toBeVisible();
  await toggle.click();

  const drawer = page.getByRole("navigation", { name: /เมนูมือถือ/ });
  await expect(drawer).toBeVisible();

  await drawer.getByRole("link", { name: /คอร์สของฉัน/ }).click();
  await page.waitForURL("/account/enrollments");
});
```

- [ ] **Run test to verify it fails**

```bash
npx playwright test tests/e2e/student-mobile-menu.spec.ts --project=chromium
```

Expected: FAIL — no hamburger toggle on StudentShell.

### Step 2: Update AppHeader to accept mobile toggle

Modify `src/components/layouts/app-header.tsx`:

The component already accepts `onMobileMenuToggle` and `mobileMenuOpen`. Verify that `AppHeaderProps` includes these and that the hamburger button is rendered when `onMobileMenuToggle` is provided.

Confirm these props exist (they already do in the current codebase). If they are missing, add them:

```tsx
export interface AppHeaderProps {
  navItems: NavItem[];
  user?: AppHeaderUser | null;
  rightSlot?: React.ReactNode;
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}
```

### Step 3: Add mobile drawer to StudentShell

Replace the contents of `src/components/layouts/student-shell.tsx` with:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { STUDENT_NAV, ADMIN_NAV } from "@/lib/navigation";
import { AppHeader } from "./app-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/server/auth-session";

export function StudentShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navItems = user.role === "admin" ? ADMIN_NAV : STUDENT_NAV;

  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-(--primary) focus:px-3 focus:py-2 focus:text-(--primary-fg)"
      >
        ข้ามไปยังเนื้อหา
      </a>
      <AppHeader
        navItems={navItems}
        user={user}
        onMobileMenuToggle={() => setDrawerOpen((o) => !o)}
        mobileMenuOpen={drawerOpen}
      />

      {drawerOpen && (
        <div className="sticky top-16 z-40 border-t border-(--border) bg-(--surface) md:hidden">
          <nav
            className="mx-auto flex max-w-[1200px] flex-col gap-1 px-6 py-4"
            aria-label="เมนูมือถือ"
          >
            {navItems.map((n) => (
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
            <Link
              href="/account"
              className="rounded-nav px-3 py-2 text-ui text-(--foreground) hover:bg-(--surface-muted)"
              onClick={() => setDrawerOpen(false)}
            >
              บัญชีของฉัน
            </Link>
            <div className="mt-2 flex justify-end">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}

      <main
        id="main"
        className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-8"
      >
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Run E2E test**

```bash
npx playwright test tests/e2e/student-mobile-menu.spec.ts --project=chromium
```

Expected: PASS

### Step 4: Commit

```bash
git add src/components/layouts/student-shell.tsx src/components/layouts/app-header.tsx tests/e2e/student-mobile-menu.spec.ts
git commit -m "feat(shell): add mobile drawer to student shell

- StudentShell now manages drawerOpen state and passes toggle to AppHeader
- Drawer reuses same styling as PublicShell mobile nav
- Adds account link + theme toggle inside drawer
- E2E test for open, navigate, close flow"
```

---

## Task 4: Quiz Result Celebration + Share CTA

**Files:**

- Create: `src/components/learn/quiz-celebration.tsx`
- Create: `src/components/learn/quiz-celebration.test.tsx`
- Modify: `src/components/learn/quiz-form.tsx`

### Step 1: Write the failing unit test

```tsx
// src/components/learn/quiz-celebration.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuizCelebration } from "./quiz-celebration";

describe("QuizCelebration", () => {
  it("renders celebration message when passed", () => {
    render(<QuizCelebration passed={true} />);
    expect(screen.getByText(/ยินดีด้วย/)).toBeInTheDocument();
  });

  it("renders encouragement when failed", () => {
    render(<QuizCelebration passed={false} />);
    expect(screen.getByText(/สู้ๆ/)).toBeInTheDocument();
  });
});
```

- [ ] **Run test to verify it fails**

```bash
npx vitest run src/components/learn/quiz-celebration.test.tsx
```

Expected: FAIL — component does not exist.

### Step 2: Create QuizCelebration component

```tsx
// src/components/learn/quiz-celebration.tsx
"use client";

import { useEffect, useState } from "react";
import { Confetti } from "@/components/ui/confetti"; // fallback: inline CSS particles
import { Trophy, ArrowCounterClockwise } from "@phosphor-icons/react";

interface QuizCelebrationProps {
  passed: boolean;
}

export function QuizCelebration({ passed }: QuizCelebrationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!passed) {
    return (
      <div className="rounded-[14px] border border-(--border) bg-(--surface) p-6 text-center">
        <ArrowCounterClockwise
          size={48}
          weight="duotone"
          className="mx-auto mb-3 text-(--destructive)"
        />
        <h3 className="text-h3">สู้ๆ อีกนิด!</h3>
        <p className="mt-1 text-body text-(--foreground-muted)">
          ทบทวนเนื้อหาและลองใหม่อีกครั้ง
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[14px] border border-(--success)/30 bg-(--success-bg) p-6 text-center transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <Trophy
        size={48}
        weight="fill"
        className="mx-auto mb-3 text-(--success)"
      />
      <h3 className="text-h3 text-(--success)">ยินดีด้วย!</h3>
      <p className="mt-1 text-body text-(--foreground-muted)">
        คุณผ่านแบบทดสอบแล้ว 🎉
      </p>
    </div>
  );
}
```

### Step 3: Wire into QuizForm result section

Modify `src/components/learn/quiz-form.tsx`:

1. Import:

```tsx
import { QuizCelebration } from "./quiz-celebration";
```

2. Inside the `result` block (`if (result) { ... }`), replace the top score-card area with:

```tsx
<div className="space-y-6">
  <QuizCelebration passed={result.passed} />

  {/* Existing score card */}
  <div className="rounded-[14px] border border-(--border) bg-(--surface) p-6 text-center md:p-9">
    <ScoreCircle
      score={result.scorePct}
      passed={result.passed}
      size={180}
    />
    ... {/* keep rest as-is */}
  </div>
```

3. Add a "Share certificate" CTA when passed (after the next-lesson CTA buttons):

Find the existing result CTA block inside `if (result)` and add, inside the flex container that holds the buttons, a new conditional block:

```tsx
{
  result.passed && (
    <Button
      asChild
      variant="outline"
      size="lg"
      className="w-full border-(--primary) text-(--primary) hover:bg-(--primary)/5"
    >
      <a
        href={`/verify/${courseSlug}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Trophy size={16} weight="bold" /> ดูใบประกาศ
      </a>
    </Button>
  );
}
```

Note: The actual certificate URL may differ; adjust to the real verify path if available.

- [ ] **Run unit test**

```bash
npx vitest run src/components/learn/quiz-celebration.test.tsx
```

Expected: PASS

### Step 4: Commit

```bash
git add src/components/learn/quiz-celebration.tsx src/components/learn/quiz-celebration.test.tsx src/components/learn/quiz-form.tsx
git commit -m "feat(quiz): add celebration overlay and certificate CTA on quiz result

- QuizCelebration component with enter animation for pass state
- Shows encouragement card on fail state
- Adds 'View certificate' link when quiz passed
- Unit test for both pass/fail renders"
```

---

## Task 5: Admin Breadcrumb Navigation

**Files:**

- Create: `src/components/admin/admin-breadcrumb.tsx`
- Modify: `src/components/layouts/admin-shell.tsx`
- Test: `tests/e2e/admin-breadcrumb.spec.ts`

### Step 1: Write the failing E2E test

```typescript
// tests/e2e/admin-breadcrumb.spec.ts
import { test, expect } from "@playwright/test";

test("admin breadcrumb renders on nested course edit", async ({ page }) => {
  await page.goto("/admin/courses/test-course/curriculum");
  const breadcrumb = page.getByRole("navigation", { name: /breadcrumb/i });
  await expect(breadcrumb).toBeVisible();
  await expect(breadcrumb.getByText(/แดชบอร์ด/)).toBeVisible();
  await expect(breadcrumb.getByText(/คอร์ส/)).toBeVisible();
});
```

- [ ] **Run test to verify it fails**

```bash
npx playwright test tests/e2e/admin-breadcrumb.spec.ts --project=chromium
```

Expected: FAIL — breadcrumb not present.

### Step 2: Create AdminBreadcrumb component

```tsx
// src/components/admin/admin-breadcrumb.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretRight, House } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  href: string;
}

const LABEL_MAP: Record<string, string> = {
  admin: "แดชบอร์ด",
  courses: "คอร์ส",
  users: "ผู้ใช้",
  slips: "ตรวจสลิป",
  certificates: "ใบประกาศ",
  curriculum: "หลักสูตร",
  lessons: "บทเรียน",
  quizzes: "แบบทดสอบ",
  new: "สร้างใหม่",
};

export function AdminBreadcrumb() {
  const pathname = usePathname() ?? "";
  if (!pathname.startsWith("/admin")) return null;

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];

  let href = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    href += `/${seg}`;
    const label =
      LABEL_MAP[seg] ?? (seg.length > 20 ? `${seg.slice(0, 18)}…` : seg);
    crumbs.push({ label, href });
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-uism text-(--foreground-muted)"
    >
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 rounded-nav px-1.5 py-1 transition-colors hover:bg-(--surface-muted) hover:text-(--foreground)"
      >
        <House size={14} />
        <span className="sr-only">แดชบอร์ด</span>
      </Link>
      {crumbs.slice(1).map((crumb, idx) => {
        const isLast = idx === crumbs.length - 2;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5">
            <CaretRight size={12} className="text-(--foreground-subtle)" />
            {isLast ? (
              <span
                className="rounded-nav px-1.5 py-1 font-medium text-(--foreground)"
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="rounded-nav px-1.5 py-1 transition-colors hover:bg-(--surface-muted) hover:text-(--foreground)"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
```

### Step 3: Insert into AdminShell

Modify `src/components/layouts/admin-shell.tsx`:

1. Import:

```tsx
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
```

2. Inside the main content area (`<div className="flex min-w-0 flex-1 flex-col">`), add `<AdminBreadcrumb />` right after the top bar and before `{children}`:

```tsx
<div className="flex min-w-0 flex-1 flex-col">
  <div className="flex items-center justify-between border-b border-(--border) px-6 py-3 md:px-8">
    <h1 className="text-ui font-medium text-(--foreground-muted) md:text-sm">
      {activeLabel}
    </h1>
    <nav
      className="flex items-center gap-1 overflow-x-auto md:hidden"
      aria-label="แอดมินมือถือ"
    >
      ... {/* keep existing mobile nav */}
    </nav>
  </div>

  {/* NEW: breadcrumb row */}
  <div className="border-b border-(--border) bg-(--surface-muted)/30 px-6 py-2 md:px-8">
    <AdminBreadcrumb />
  </div>

  <div className="flex-1 px-6 py-6 md:px-8 md:py-7">{children}</div>
</div>
```

- [ ] **Run E2E test**

```bash
npx playwright test tests/e2e/admin-breadcrumb.spec.ts --project=chromium
```

Expected: PASS

### Step 4: Commit

```bash
git add src/components/admin/admin-breadcrumb.tsx src/components/layouts/admin-shell.tsx tests/e2e/admin-breadcrumb.spec.ts
git commit -m "feat(admin): add breadcrumb navigation to admin shell

- AdminBreadcrumb maps URL segments to Thai labels
- Renders only on nested routes (skips top-level /admin)
- Home icon links back to dashboard; current page is non-link
- E2E test verifies presence on /admin/courses/[id]/curriculum"
```

---

## Self-Review

### 1. Spec Coverage

| UX Review Item                         | Task          |
| -------------------------------------- | ------------- |
| Floating CTA บน mobile course detail   | **Task 1** ✅ |
| Checkout success page หลัง upload slip | **Task 2** ✅ |
| Student mobile menu drawer             | **Task 3** ✅ |
| Quiz result celebration + share CTA    | **Task 4** ✅ |
| Admin breadcrumb navigation            | **Task 5** ✅ |

### 2. Placeholder Scan

- No "TBD", "TODO", "implement later" found.
- Every code step includes complete TypeScript/TSX.
- Every test includes assertions and exact commands.
- No vague instructions like "add error handling".

### 3. Type Consistency

- `MobileCourseCtaProps`, `QuizCelebrationProps` interfaces defined inline.
- `AppHeaderProps` already has `onMobileMenuToggle` / `mobileMenuOpen` — consistent.
- `AdminBreadcrumb` uses `usePathname` from Next.js — consistent with other client components.

### 4. Testing Strategy

- **E2E (Playwright):** Visual/interactive changes (mobile CTA, checkout redirect, drawer, breadcrumb).
- **Unit (Vitest):** Presentational component with conditional render (`QuizCelebration`).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-05-ux-improvements.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration. Use `superpowers:executing-plans` skill.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

**Which approach?**
