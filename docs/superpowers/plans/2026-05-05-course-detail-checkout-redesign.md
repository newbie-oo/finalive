# Course Detail + Checkout Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Course Detail (`/courses/[slug]`) and Checkout flow (`/checkout/*`) to match the LMS design system (`screen-detail.jsx`, `screen-checkout.jsx`).

**Architecture:** Server Components for data fetching, Client Components for interactive elements (tabs, countdown, stepper). Reuse existing design tokens and primitives.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, Tailwind CSS, Phosphor Icons

---

## File Map

| File                                                | Role                                                                                                       |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/app/courses/[slug]/page.tsx`                   | **Modify** — hero section, breadcrumb, cover with play overlay, instructor, feature pills, sticky CTA card |
| `src/app/courses/[slug]/course-tabs.tsx`            | **Modify** — tabs (เนื้อหา/ผู้สอน/FAQ), "what you'll learn" card, curriculum accordion, instructor card    |
| `src/components/layouts/checkout-shell.tsx`         | **Modify** — minimal header with security badge, redesigned stepper                                        |
| `src/components/ui/stepper.tsx`                     | **Modify** — 3-step design: ข้อมูล → ชำระเงิน → เสร็จสิ้น                                                  |
| `src/app/checkout/[pendingId]/page.tsx`             | **Modify** — order summary card, payment method tabs, bank details, ref code card                          |
| `src/app/checkout/[pendingId]/upload-slip/page.tsx` | **Modify** — redesigned upload slip area with LMS styling                                                  |
| `src/components/checkout/countdown-timer.tsx`       | **Modify** — larger, more prominent countdown display                                                      |
| `src/components/checkout/slip-upload-form.tsx`      | **Modify** — LMS-style upload area with file preview                                                       |

---

## Commit 1: Course Detail Hero + CTA Card

**Goal:** Redesign the hero section to match LMS design: breadcrumb, cover with play button overlay, badges, instructor row, feature pills, sticky CTA card with price/discount/countdown.

**Files:**

- Modify: `src/app/courses/[slug]/page.tsx`

### Step 1: Read current page

Read `src/app/courses/[slug]/page.tsx` to understand current data available.

### Step 2: Redesign hero section

Replace the hero section with LMS-inspired design:

```tsx
{
  /* Breadcrumb */
}
<nav
  aria-label="breadcrumb"
  className="mb-4 flex items-center gap-2 text-uism text-(--foreground-muted)"
>
  <Link href="/courses" className="hover:text-(--foreground)">
    คอร์สทั้งหมด
  </Link>
  <CaretRight size={14} />
  <span className="truncate text-(--foreground)">{course.title}</span>
</nav>;

{
  /* Hero */
}
<section className="bg-(--surface-muted)">
  <div className="mx-auto max-w-[1200px] px-6 py-8 md:py-12">
    <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
      {/* Left column */}
      <div>
        {/* Cover with play overlay */}
        <div className="relative mb-6 overflow-hidden rounded-2xl shadow-lg">
          {course.coverStorageKey ? (
            <div className="relative aspect-video w-full">
              <Image
                src={coverImageUrl(course.coverStorageKey)!}
                alt={course.title}
                fill
                sizes="(max-width: 1024px) 100vw, 720px"
                className="object-cover"
                priority
              />
            </div>
          ) : (
            <div className="aspect-video w-full bg-gradient-to-br from-[#312E81] to-[#1E1B4B]" />
          )}
          {/* Play button overlay */}
          {hasPreviewableLesson && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Link
                href="#curriculum"
                className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white shadow-lg transition-transform hover:scale-105"
              >
                <Play
                  size={28}
                  weight="fill"
                  className="ml-1 text-(--primary)"
                />
              </Link>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {course.enrollmentCount >= 100 && (
            <span className="inline-flex items-center rounded-full bg-(--accent)/10 px-2.5 py-1 text-xs font-semibold text-(--accent)">
              BESTSELLER
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-(--primary)/10 px-2.5 py-1 text-xs font-semibold text-(--primary)">
            มีคนเรียน {course.enrollmentCount.toLocaleString("th-TH")} คน
          </span>
          {isFreeView && (
            <span className="inline-flex items-center rounded-full bg-(--success)/10 px-2.5 py-1 text-xs font-semibold text-(--success)">
              ฟรี
            </span>
          )}
          {isAdmin && course.status !== "published" && (
            <span className="inline-flex items-center rounded-full bg-(--warning)/10 px-2.5 py-1 text-xs font-semibold text-(--warning)">
              {course.status === "draft"
                ? "ร่าง · admin preview"
                : "เก็บถาวร · admin preview"}
            </span>
          )}
        </div>

        <h1 className="text-h1 font-bold text-(--foreground)">
          {course.title}
        </h1>

        {/* Meta row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-uism text-(--foreground-muted)">
          <span className="inline-flex items-center gap-1.5">
            <Users size={16} />
            <span className="num font-semibold text-(--foreground)">
              {course.enrollmentCount.toLocaleString("th-TH")}
            </span>{" "}
            ผู้เรียน
          </span>
          <span>·</span>
          <span>
            อัปเดตล่าสุด{" "}
            {course.updatedAt?.toLocaleDateString("th-TH", {
              month: "short",
              year: "numeric",
            }) ?? "-"}
          </span>
          <span>·</span>
          <span>ภาษาไทย</span>
        </div>

        {/* Instructor */}
        <Link
          href="/instructor"
          className="mt-5 inline-flex items-center gap-3"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-sm font-semibold text-white">
            อา
          </div>
          <div>
            <div className="text-ui font-semibold text-(--foreground)">
              อ.อาร์ม ริลีย์
            </div>
            <div className="text-caption text-(--foreground-muted)">
              นักวิเคราะห์การเงิน · CFA Charterholder
            </div>
          </div>
        </Link>

        <p className="mt-5 text-bodylg text-(--foreground-muted)">
          {course.summary}
        </p>

        {/* Feature pills */}
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { icon: Video, label: `${totalLessons} บทเรียน` },
            { icon: Clock, label: formatDuration(totalDuration) },
            { icon: CertificateIcon, label: "ใบประกาศ" },
            { icon: ChatCircle, label: "Q&A กับผู้สอน" },
            { icon: FileText, label: "Excel template" },
          ].map((f) => (
            <span
              key={f.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-(--border) bg-white px-3.5 py-2 text-sm text-(--foreground)"
            >
              <f.icon size={16} className="text-(--primary)" />
              {f.label}
            </span>
          ))}
        </div>
      </div>

      {/* Right: Sticky CTA */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card noPadding className="overflow-hidden">
          <div className="p-6">
            {/* Price */}
            <div className="mb-1 flex items-baseline gap-3">
              <span className="num text-h1 font-bold text-(--primary)">
                {price}
              </span>
              {!course.isFree &&
                course.originalPrice &&
                Number(course.originalPrice) > Number(course.price) && (
                  <span className="num text-uism text-(--foreground-muted) line-through">
                    {formatTHB(course.originalPrice)}
                  </span>
                )}
            </div>
            {!course.isFree &&
              course.originalPrice &&
              Number(course.originalPrice) > Number(course.price) && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-(--accent)/10 px-2 py-0.5 text-xs font-semibold text-(--accent)">
                    ประหยัด{" "}
                    {Math.round(
                      (1 -
                        Number(course.price) / Number(course.originalPrice)) *
                        100,
                    )}
                    %
                  </span>
                </div>
              )}

            <hr className="my-5 border-(--border)" />

            {/* Feature checklist */}
            <ul className="mb-5 space-y-3">
              {INCLUDES.map((it) => {
                const Ic = it.icon;
                return (
                  <li
                    key={it.label}
                    className="flex items-start gap-2.5 text-sm text-(--foreground)"
                  >
                    <Check
                      size={18}
                      weight="bold"
                      className="mt-0.5 shrink-0 text-(--success)"
                    />
                    {it.label}
                  </li>
                );
              })}
            </ul>

            {/* CTA Buttons */}
            {isAdmin ? (
              <Button asChild variant="primary" size="lg" className="w-full">
                <Link href={`/learn/${course.slug}`}>
                  เข้าเรียน (admin preview)
                </Link>
              </Button>
            ) : isEnrolled ? (
              <Button asChild variant="primary" size="lg" className="w-full">
                <Link href={`/learn/${course.slug}`}>เข้าเรียน</Link>
              </Button>
            ) : course.isFree ? (
              <FreeCourseCta courseSlug={course.slug} />
            ) : (
              <>
                <form action="/checkout/start" method="post">
                  <input type="hidden" name="courseSlug" value={course.slug} />
                  <Button
                    type="submit"
                    variant="accent"
                    size="lg"
                    className="w-full"
                  >
                    ลงทะเบียนเรียน
                  </Button>
                </form>
                {!isEnrolled && !course.isFree && hasPreviewableLesson && (
                  <Button
                    asChild
                    variant="secondary"
                    size="md"
                    className="mt-3 w-full"
                  >
                    <Link href="#curriculum">
                      <PlayOutline size={16} /> ดูตัวอย่างฟรี
                    </Link>
                  </Button>
                )}
              </>
            )}

            {/* Refund guarantee */}
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-(--surface-muted) p-3">
              <ShieldCheck size={18} className="shrink-0 text-(--success)" />
              <span className="text-uism text-(--foreground)">
                รับประกันคืนเงินภายใน 7 วัน
              </span>
            </div>

            {/* Enrollment count footer */}
            <div className="mt-4 border-t border-(--border) pt-4 text-center">
              <span className="text-caption text-(--foreground-muted)">
                🔥{" "}
                <span className="num font-semibold text-(--foreground)">
                  {course.enrollmentCount.toLocaleString("th-TH")}
                </span>{" "}
                นักเรียนลงทะเบียนแล้ว
              </span>
            </div>
          </div>
        </Card>
      </aside>
    </div>
  </div>
</section>;
```

Note: Add imports for `Video`, `ChatCircle`, `FileText`, `PlayOutline`, `ShieldCheck` from Phosphor icons.

### Step 3: Verify compilation

```bash
npx tsc --noEmit
```

### Step 4: Commit

```bash
git add -A
git commit -m "redesign: course detail hero + sticky CTA card

- Add breadcrumb navigation
- Cover image with play button overlay for preview lessons
- Badges: BESTSELLER (100+ students), enrollment count, free badge
- Instructor row with avatar and credentials
- Feature pills: lessons, duration, certificate, Q&A, Excel template
- Sticky CTA card: price with discount, savings %, feature checklist
- Refund guarantee badge, enrollment count footer
- Matches LMS screen-detail.jsx design system"
```

---

## Commit 2: Course Detail Tabs + Curriculum Redesign

**Goal:** Redesign the tabs section: "what you'll learn" card with primary bg, curriculum accordion with preview/locked lesson rows, instructor card, course contents card.

**Files:**

- Modify: `src/app/courses/[slug]/course-tabs.tsx`

### Step 1: Redesign LearningOutcomes

Change the LearningOutcomes section to use the LMS primary-colored card:

```tsx
<section className="py-10 md:py-14">
  <div className="mx-auto max-w-[1200px] px-6">
    <div className="mb-8 rounded-2xl border border-(--primary)/20 bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] p-6 md:p-8">
      <h3 className="text-h3 mb-5 font-bold text-(--foreground)">สิ่งที่คุณจะได้เรียนรู้</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {outcomes.map((outcome) => (
          <div key={outcome} className="flex items-start gap-3 text-sm text-(--foreground)">
            <Check size={18} weight="bold" className="mt-0.5 shrink-0 text-(--primary)" />
            {outcome}
          </div>
        ))}
      </div>
    </div>
```

### Step 2: Redesign tabs layout with 2 columns

The LMS has a 2-column layout for tabs: left = tab content, right = instructor + course contents cards.

Wrap the tabs section in a 2-column grid:

```tsx
<section ref={instructorRef} id="instructor" className="py-10 md:py-14">
  <div className="mx-auto max-w-[1200px] px-6">
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-10">
      {/* Left: Tabs */}
      <div>
        {/* Tab nav */}
        <div className="mb-6 flex gap-6 border-b border-(--border)">
          {TABS.map((tab) => (...))}
        </div>
        {/* Tab panels */}
        ...
      </div>

      {/* Right: Instructor + Contents cards */}
      <div className="space-y-5">
        {/* Instructor card */}
        <Card className="p-5">
          <div className="mb-3 text-uism uppercase tracking-wider text-(--foreground-muted)">ผู้สอน</div>
          <div className="mb-4 flex items-center gap-3.5">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-lg font-semibold text-white">
              อา
            </div>
            <div>
              <div className="text-h4 font-bold text-(--foreground)">อ.อาร์ม ริลีย์</div>
              <div className="text-caption text-(--foreground-muted)">CFA · อดีต VP Investment</div>
            </div>
          </div>
          <p className="mb-4 text-uism text-(--foreground-muted)">
            อาจารย์อาร์มเคยทำงานด้านการลงทุนกับกองทุนใหญ่ในไทยและสิงคโปร์
          </p>
          <Button asChild variant="secondary" size="md" className="w-full">
            <Link href="/instructor">
              ดูคอร์สทั้งหมดของผู้สอน <ArrowRight size={14} />
            </Link>
          </Button>
        </Card>

        {/* Course contents card */}
        <Card className="p-5">
          <div className="mb-4 text-ui font-semibold text-(--foreground)">คอร์สนี้ประกอบด้วย</div>
          <div className="flex flex-col gap-3">
            {[
              { icon: Video, label: `${totalLessons} บทเรียน HD`, sub: formatDuration(totalDuration) },
              { icon: FileText, label: "Excel template", sub: "5 ไฟล์ดาวน์โหลด" },
              { icon: CertificateIcon, label: "ใบประกาศ", sub: "เมื่อจบคอร์ส" },
              { icon: ChatCircle, label: "Q&A กับผู้สอน", sub: "บน Discord" },
              { icon: Clock, label: "เรียนตลอดชีพ", sub: "อัปเดตเนื้อหาฟรี" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--primary)/10 text-(--primary)">
                  <item.icon size={18} />
                </div>
                <div>
                  <div className="text-ui font-semibold text-(--foreground)">{item.label}</div>
                  <div className="text-caption text-(--foreground-muted)">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  </div>
</section>
```

### Step 3: Redesign CurriculumTab accordion

Update the curriculum accordion to match LMS style with lesson number, preview/lock icons, and duration:

```tsx
function CurriculumTab({...}) {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <h3 className="text-h2 font-bold text-(--foreground)">เนื้อหาคอร์ส</h3>
        <span className="text-uism text-(--foreground-muted)">
          <span className="num">{curriculum.length}</span> โมดูล · <span className="num">{totalLessons}</span> บทเรียน · <span className="num">{formatDuration(totalDuration)}</span>
        </span>
      </div>
      ...
    </div>
  );
}
```

Update `LessonRow` to match LMS:

- Preview lessons: green play icon + "Preview" badge
- Locked lessons: gray lock icon
- Lesson number + title + duration

### Step 4: Verify compilation

```bash
npx tsc --noEmit
```

### Step 5: Commit

```bash
git add -A
git commit -m "redesign: course detail tabs + curriculum accordion

- Learning outcomes card with primary-themed background
- 2-column layout: left = tabs, right = instructor + course contents cards
- Curriculum accordion with lesson number, preview/lock icons, duration
- Instructor card with avatar, bio, and link to instructor page
- Course contents card listing: videos, templates, certificate, Q&A, lifetime access"
```

---

## Commit 3: Checkout Shell + Stepper Redesign

**Goal:** Update checkout shell header and stepper to match LMS 3-step design.

**Files:**

- Modify: `src/components/layouts/checkout-shell.tsx`
- Modify: `src/components/ui/stepper.tsx`

### Step 1: Update Stepper to 3 steps

Change `STEPS` in checkout-shell to 3 steps matching LMS:

```tsx
const STEPS = [
  { label: "ข้อมูล" },
  { label: "ชำระเงิน" },
  { label: "เสร็จสิ้น" },
];
```

Adjust page step indices: `checkout/[pendingId]/page.tsx` step=1, `upload-slip/page.tsx` step=2.

Wait — the current flow has 4 steps. The LMS has 3. Let me check: LMS shows ข้อมูล → ชำระเงิน → เสร็จสิ้น. The current app has: ลงทะเบียน (start page) → ชำระเงิน (checkout page) → ตรวจสอบ (upload slip) → เริ่มเรียน (success).

Actually, looking at the checkout flow more carefully:

- `/checkout/start` → POST creates pending, redirects to `/checkout/[pendingId]` (payment info)
- `/checkout/[pendingId]` → shows payment details
- `/checkout/[pendingId]/upload-slip` → upload slip

The LMS design shows 3 steps on the checkout page itself (which is the payment page). Let me map:

- Step 1 (active): ชำระเงิน — on `/checkout/[pendingId]`
- Step 2: upload slip — but actually in the LMS there's no separate upload page, it's all on one page

Hmm, the LMS checkout is a single-page design with everything on one page. Our app has separate pages. Let me adapt the design while keeping the existing page structure.

Actually, let me reconsider. The LMS `screen-checkout.jsx` shows a single page with:

1. Step indicator: ข้อมูล (done) → ชำระเงิน (active) → เสร็จสิ้น (future)
2. Order summary
3. Payment method tabs
4. Bank details
5. Reference code
6. Upload slip
7. Confirm button

But our app separates these into:

- `/checkout/[pendingId]` — payment info + QR + bank details
- `/checkout/[pendingId]/upload-slip` — upload slip

I think the best approach is to keep the page structure but redesign each page to match the LMS styling. For the stepper, I'll update it to look like the LMS design (circular step numbers with connecting lines).

Let me update the stepper component first, then the checkout shell.

### Step 2: Redesign Stepper component

Update `src/components/ui/stepper.tsx` to match LMS circular design:

```tsx
export function Stepper({ steps, current, className, ...props }: StepperProps) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      {steps.map((step, idx, arr) => {
        const isPast = idx < current;
        const isCurrent = idx === current;
        const isFuture = idx > current;
        return (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                  isPast && "bg-(--primary) text-white",
                  isCurrent &&
                    "bg-(--primary) text-white ring-4 ring-(--primary)/15",
                  isFuture && "bg-(--surface-muted) text-(--foreground-muted)",
                )}
              >
                {isPast ? <Check weight="bold" size={14} /> : idx + 1}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isCurrent
                    ? "text-(--foreground)"
                    : "text-(--foreground-muted)",
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < arr.length - 1 && (
              <div
                className={cn(
                  "mx-4 mb-5 h-0.5 w-16",
                  isPast ? "bg-(--primary)" : "bg-(--border)",
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
```

### Step 3: Update CheckoutShell

Update `src/components/layouts/checkout-shell.tsx`:

- Minimal header with logo + security badge
- Centered stepper (not left-aligned)
- Remove the separate stepper container

```tsx
export function CheckoutShell({ step, children }: ...) {
  return (
    <div className="flex min-h-full flex-col">
      {/* Minimal header */}
      <header className="relative flex h-16 items-center justify-center border-b border-(--border) bg-(--background)">
        <Link href="/" className="flex items-center gap-2 text-(--foreground)">
          <span className="h-2.5 w-2.5 rounded-full bg-(--primary)" aria-hidden />
          <span className="text-[18px] font-semibold tracking-tight">Finalive</span>
        </Link>
        <div className="absolute right-6 flex items-center gap-1.5 text-uism text-(--foreground-muted)">
          <ShieldCheck size={16} className="text-(--success)" />
          <span>การชำระเงินปลอดภัย</span>
        </div>
      </header>

      {/* Stepper */}
      <div className="border-b border-(--border) bg-(--surface-muted)/30 py-6">
        <div className="mx-auto max-w-[1200px] px-6">
          <Stepper steps={STEPS} current={step} />
        </div>
      </div>

      <main id="main" className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
```

### Step 4: Verify compilation

```bash
npx tsc --noEmit
```

### Step 5: Commit

```bash
git add -A
git commit -m "redesign: checkout shell header + stepper

- Minimal header with centered logo + security badge
- Redesigned stepper: circular steps with ring highlight on active step
- Connecting lines between steps, colored when past
- Matches LMS screen-checkout.jsx design system"
```

---

## Commit 4: Checkout Payment Page Redesign

**Goal:** Redesign `/checkout/[pendingId]/page.tsx` with LMS-style order summary, payment tabs, bank details, ref code card.

**Files:**

- Modify: `src/app/checkout/[pendingId]/page.tsx`

### Step 1: Redesign page layout

Center the content with max-width 560px, add order summary card with course thumbnail, payment method selection, bank details, ref code.

```tsx
<CheckoutShell step={1}>
  <div className="mx-auto max-w-[560px]">
    {/* Order summary card */}
    <Card className="mb-4 p-5">
      <div className="mb-4 text-ui font-semibold text-(--foreground)">
        สรุปการสั่งซื้อ
      </div>
      <div className="mb-4 flex gap-3.5 border-b border-(--border) pb-4">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-(--surface-muted)">
          {/* Course thumbnail */}
        </div>
        <div className="min-w-0">
          <div className="text-ui font-semibold text-(--foreground)">
            {pending.courseTitle}
          </div>
          <div className="text-uism text-(--foreground-muted)">
            อาร์ม ริลีย์ · 30 บทเรียน · 12 ชม.
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-uism text-(--foreground-muted)">ราคาคอร์ส</span>
        <span className="num font-semibold text-(--foreground)">
          {formatTHB(pending.amount)}
        </span>
      </div>
      <div className="mt-3 border-t border-(--border) pt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-ui font-semibold text-(--foreground)">
            รวมทั้งสิ้น
          </span>
          <span className="num text-2xl font-bold text-(--primary)">
            {formatTHB(pending.amount)}
          </span>
        </div>
      </div>
    </Card>

    {/* Payment method tabs */}
    <div className="mb-3 text-ui font-semibold text-(--foreground)">
      วิธีชำระเงิน
    </div>
    <div className="mb-4 grid grid-cols-2 gap-2.5">
      {/* Bank transfer tab */}
      {/* PromptPay tab */}
    </div>

    {/* Bank details card */}
    <Card className="mb-4 bg-(--surface-muted) p-5">
      {/* Bank logo, name, account number + copy button */}
    </Card>

    {/* Reference code card */}
    <Card className="mb-4 border-(--primary)/20 bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] p-5">
      {/* Ref code with copy button + countdown */}
    </Card>

    {/* Upload slip button */}
    <Button asChild variant="accent" size="lg" className="w-full">
      <Link href={`/checkout/${pending.id}/upload-slip`}>
        อัปโหลดสลิป <ArrowRight size={18} />
      </Link>
    </Button>
  </div>
</CheckoutShell>
```

This is getting very long. Let me create the plan more concisely and then execute.

Actually, this plan is getting quite large. Let me save it as-is and then ask the user about execution approach. But the user already said
