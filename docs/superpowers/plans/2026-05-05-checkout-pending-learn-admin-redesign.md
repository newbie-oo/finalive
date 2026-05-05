# Redesign: Checkout, Payment Pending, Learning Experience, Admin Dashboard

## Goal

Redesign 4 pages to match LMS design reference at `Desktop/learning/second-brain/projects/Finalive/code/LMS`:

1. **07 · Checkout** — `/checkout/[pendingId]/page.tsx`
2. **08 · Payment Pending** — `/checkout/[pendingId]/pending/page.tsx` (new)
3. **10 · Learning Experience** — `/learn/[courseSlug]/[lessonId]/page.tsx` + components
4. **A1 · Admin Dashboard** — `/admin/page.tsx`

## Reference Files

- `screen-checkout.jsx` — Checkout full page design
- `screen-pending.jsx` — Payment pending status page
- `screen-learn.jsx` — Learning experience (video player + sidebar)
- `screen-admin.jsx` — Admin dashboard with dark theme
- `screen-admin-slip.jsx` — Admin slip review (reference for UI patterns)

## Constraints

- Keep all existing business logic, auth checks, data fetching
- Use Thai language for UI labels
- Use existing design system tokens (`--primary`, `--surface`, `--border`, etc.)
- `npx tsc --noEmit` must pass after each commit

## Commit Plan

### Commit 1: Checkout Page Inline Upload

**File:** `src/app/checkout/[pendingId]/page.tsx`
**Changes:**

- Add inline file upload area (drag-and-drop) to checkout page
- Move `SlipUploadForm` logic inline or create new `InlineSlipUpload` component
- Change CTA from "อัปโหลดสลิป" link to "ยืนยันการชำระเงิน" button
- On submit: upload slip + redirect to pending page
- Keep existing: order summary, payment method tabs, bank details, ref code, security, next steps

### Commit 2: Payment Pending Page

**New file:** `src/app/checkout/[pendingId]/pending/page.tsx`
**Changes:**

- Create new page based on `screen-pending.jsx`
- Step indicator: done-done-active (ข้อมูล → ชำระเงิน → รอตรวจสอบ)
- Hero status card with pulsing rings, clock icon, "กำลังตรวจสอบ"
- Order ref + amount strip (3 columns: ref, amount, submitted time)
- Timeline: ส่งสลิป → กำลังตรวจ → ยืนยัน → เปิดสิทธิ์
- Email confirmation note card
- Actions: กลับหน้าแรก, ไป Dashboard
- FAQ accordion
- Support footer

### Commit 3: Learning Experience

**Files:**

- `src/components/learn/learn-topbar.tsx` — Add logo, course title, progress bar
- `src/components/learn/curriculum-sidebar.tsx` — Redesign with circular progress, better lesson icons
- `src/components/learn/lesson-player-layout.tsx` — Add lesson header, bookmark, mark-complete buttons
- `src/components/learn/lesson-content.tsx` — Keep video player, adjust layout

**Changes:**

- Header: logo + course title + progress bar (like LMS)
- Sidebar: circular SVG progress ring, curriculum with check/play/lock/lesson icons
- Main content: lesson title + description header, content card, quiz card styling
- Prev/next navigation at bottom

### Commit 4: Admin Dashboard

**File:** `src/app/admin/page.tsx`
**Changes:**

- Dark-themed admin dashboard (like LMS)
- KPI cards: รายได้รวม, นักเรียน, คอร์ส active, สลิปรอตรวจ
- Monthly revenue chart (simple SVG area chart)
- Top courses list with progress bars
- Pending slips alert card
- Recent activity table
- Date filter: 30 วันล่าสุด

## Post-implementation

After all 4 commits, run full UX/UI review across the entire web to identify any remaining gaps for MVP readiness.
