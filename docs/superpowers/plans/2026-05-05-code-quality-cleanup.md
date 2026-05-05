# Code Quality Cleanup & Architecture Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead code, eliminate unnecessary comments, fix prettier/eslint issues, verify business logic correctness, and evaluate domain/DB separation.

**Architecture:** Each task is self-contained. Tasks are ordered by risk (dead code removal first → low risk, business logic changes last → high risk).

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, Drizzle ORM, Vitest, Playwright.

---

## File Structure

| File                                                | Action     | Responsibility                                                        |
| --------------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| `src/components/learn/learn-shell.tsx`              | **Delete** | Unused — superseded by learn-shell-context + learn-layout             |
| `src/components/learn/lesson-nav.tsx`               | **Delete** | Unused — navigation handled by curriculum-sidebar                     |
| `src/components/learn/quiz-content.tsx`             | **Delete** | Unused — quiz rendering handled by quiz-form                          |
| `src/components/course/bunny-player.tsx`            | **Delete** | Unused — replaced by vidstack-player                                  |
| `src/components/admin/admin-table-skeleton.tsx`     | **Delete** | Unused — no references in codebase                                    |
| `src/components/logout-button.tsx`                  | **Delete** | Unused — only imported by deleted learn-shell                         |
| `src/lib/test-utils.tsx`                            | **Delete** | Unused — test utilities not imported anywhere                         |
| `src/server/actions/certificate.tsx`                | **Delete** | Unused — certificate issuance via certificate-issuer.ts               |
| `src/server/lib/lesson-content.ts`                  | **Delete** | Only exports `__testing` symbol, unused                               |
| `src/lib/media-url.ts`                              | **Modify** | Remove unused `buildCoverImageUrl` export                             |
| `src/components/ui/button.tsx`                      | **Modify** | Remove unused `buttonVariants` export                                 |
| `src/lib/markdown.tsx`                              | **Modify** | Remove unused `sanitizeRichHtml` export                               |
| `src/server/services/bunny.ts`                      | **Modify** | Remove unused `buildEmbedUrl`, `createBunnyVideo`, `uploadBunnyVideo` |
| `src/server/services/bunny-video-status.ts`         | **Modify** | Remove unused `BUNNY_STATUS`, `BUNNY_WEBHOOK_STATUS` exports          |
| `src/server/payments/pending-enrollment-service.ts` | **Modify** | Remove unused `defaultDeps`                                           |
| `src/lib/navigation.ts`                             | **Modify** | Evaluate `PUBLIC_NAV` usage                                           |
| `src/server/actions/admin-slip.ts`                  | **Modify** | Remove unused type exports                                            |
| `src/server/email/templates/index.ts`               | **Modify** | Remove unused `EMAIL_TEMPLATE_NAMES`                                  |
| `src/server/services/course-completion-factory.ts`  | **Modify** | Remove unused `updateWatchedSeconds` export                           |
| Multiple files                                      | **Modify** | Remove unnecessary comments (see Task 4)                              |
| Multiple files                                      | **Modify** | Fix eslint-disable comments (see Task 5)                              |

---

## Task 1: Delete Unused Files

### Step 1: Verify each file is truly unused

```bash
# Verify no imports exist (excluding self-imports)
grep -rn "from.*learn-shell\"" src/ --include="*.ts" --include="*.tsx" | grep -v "learn-shell.tsx"
grep -rn "from.*lesson-nav\"" src/ --include="*.ts" --include="*.tsx" | grep -v "lesson-nav.tsx"
grep -rn "from.*quiz-content\"" src/ --include="*.ts" --include="*.tsx" | grep -v "quiz-content.tsx"
grep -rn "from.*bunny-player\"" src/ --include="*.ts" --include="*.tsx" | grep -v "bunny-player.tsx"
grep -rn "from.*admin-table-skeleton\"" src/ --include="*.ts" --include="*.tsx" | grep -v "admin-table-skeleton.tsx"
grep -rn "from.*logout-button\"" src/ --include="*.ts" --include="*.tsx" | grep -v "logout-button.tsx"
grep -rn "from.*test-utils\"" src/ --include="*.ts" --include="*.tsx" | grep -v "test-utils.tsx"
grep -rn "from.*certificate\.tsx\"" src/ --include="*.ts" --include="*.tsx" | grep -v "certificate.tsx"
grep -rn "from.*lesson-content\"" src/ --include="*.ts" --include="*.tsx" | grep -v "lesson-content.ts"
```

Expected: All commands return **no output** (no imports found).

### Step 2: Delete the files

```bash
git rm \
  src/components/learn/learn-shell.tsx \
  src/components/learn/lesson-nav.tsx \
  src/components/learn/quiz-content.tsx \
  src/components/course/bunny-player.tsx \
  src/components/admin/admin-table-skeleton.tsx \
  src/components/logout-button.tsx \
  src/lib/test-utils.tsx \
  src/server/actions/certificate.tsx \
  src/server/lib/lesson-content.ts
```

### Step 3: Run tests to ensure nothing breaks

```bash
npx tsc --noEmit 2>&1 | grep -v "password-input.tsx" | head -20
```

Expected: No errors related to deleted files.

```bash
npx vitest run 2>&1 | tail -10
```

Expected: All tests pass.

### Step 4: Commit

```bash
git commit -m "chore: delete 9 unused files

Removes components, utilities, and actions with zero imports:
- learn-shell.tsx (superseded by learn-shell-context)
- lesson-nav.tsx (unused)
- quiz-content.tsx (unused)
- bunny-player.tsx (replaced by vidstack-player)
- admin-table-skeleton.tsx (unused)
- logout-button.tsx (only imported by deleted learn-shell)
- test-utils.tsx (unused)
- certificate.tsx action (unused)
- lesson-content.ts (only exported __testing symbol)"
```

---

## Task 2: Remove Unused Exports

### Step 1: Remove unused `buttonVariants` from button.tsx

File: `src/components/ui/button.tsx`

Change:

```typescript
// FROM:
export { Button, buttonVariants };

// TO:
export { Button };
```

Verify:

```bash
grep -rn "buttonVariants" src/ --include="*.ts" --include="*.tsx" | grep -v "button.tsx"
```

Expected: No output (unused).

### Step 2: Remove unused exports from media-url.ts

File: `src/lib/media-url.ts`

Remove `buildCoverImageUrl` function entirely (if unused). If it has value, keep but un-export.

Verify:

```bash
grep -rn "buildCoverImageUrl" src/ --include="*.ts" --include="*.tsx" | grep -v "media-url.ts"
```

### Step 3: Remove unused `sanitizeRichHtml` from markdown.tsx

File: `src/lib/markdown.tsx`

Verify:

```bash
grep -rn "sanitizeRichHtml" src/ --include="*.ts" --include="*.tsx" | grep -v "markdown.tsx"
```

If unused, remove the export. If used internally only, remove `export` keyword.

### Step 4: Remove unused Bunny service exports

File: `src/server/services/bunny.ts`

Remove unused exports: `buildEmbedUrl`, `createBunnyVideo`, `uploadBunnyVideo`.

Verify each:

```bash
grep -rn "buildEmbedUrl\|createBunnyVideo\|uploadBunnyVideo" src/ --include="*.ts" --include="*.tsx" | grep -v "bunny.ts"
```

### Step 5: Remove unused status exports

File: `src/server/services/bunny-video-status.ts`

Remove: `BUNNY_STATUS`, `BUNNY_WEBHOOK_STATUS` exports.

Verify:

```bash
grep -rn "BUNNY_STATUS\|BUNNY_WEBHOOK_STATUS" src/ --include="*.ts" --include="*.tsx" | grep -v "bunny-video-status.ts"
```

### Step 6: Remove `defaultDeps` from pending-enrollment-service.ts

File: `src/server/payments/pending-enrollment-service.ts`

Verify:

```bash
grep -rn "defaultDeps" src/ --include="*.ts" --include="*.tsx" | grep -v "pending-enrollment-service.ts"
```

### Step 7: Remove unused type exports from admin-slip.ts

File: `src/server/actions/admin-slip.ts`

Remove unused type exports: `REJECT_REASON_LABEL` (if unused), `RejectReason`, `RejectSlipInput`, `RejectSlipResult`, `AcceptSlipResult`, `BulkResult`.

Verify each:

```bash
grep -rn "RejectSlipInput\|RejectSlipResult\|AcceptSlipResult\|BulkResult" src/ --include="*.ts" --include="*.tsx" | grep -v "admin-slip.ts"
```

### Step 8: Commit

```bash
git add -A
git commit -m "chore: remove unused exports across codebase

- button.tsx: remove buttonVariants export
- media-url.ts: remove buildCoverImageUrl
- markdown.tsx: un-export sanitizeRichHtml
- bunny.ts: remove buildEmbedUrl, createBunnyVideo, uploadBunnyVideo
- bunny-video-status.ts: remove BUNNY_STATUS, BUNNY_WEBHOOK_STATUS
- pending-enrollment-service.ts: remove defaultDeps
- admin-slip.ts: remove unused type exports"
```

---

## Task 3: Fix ESLint Disable Comments

### Step 1: Fix `@next/next/no-img-element` disables

**Root cause:** These disable comments suggest using `next/Image`, but the images use dynamic/presigned URLs that cannot use `next/image` optimization.

**Strategy:** Replace inline `eslint-disable` comments with a shared Image component that documents why `img` is used.

Create: `src/components/ui/remote-image.tsx`

```tsx
"use client";

/**
 * RemoteImage uses a plain `<img>` tag because the source is a
 * dynamic/presigned URL (Bunny Stream, R2 presigned, etc.) that cannot
 * benefit from Next.js Image optimization. The domain is not known at
 * build time and the URL contains signature tokens.
 */
interface RemoteImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export function RemoteImage({
  src,
  alt,
  className,
  width,
  height,
}: RemoteImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
    />
  );
}
```

Then replace all inline eslint-disable comments with `<RemoteImage>`:

Files to update:

- `src/app/admin/courses/new/new-course-form.tsx` (2 occurrences)
- `src/components/ui/avatar-initials.tsx` (1 occurrence)
- `src/components/admin/cover-image-upload.tsx` (1 occurrence)
- `src/components/admin/slip-image-viewer.tsx` (2 occurrences)
- `src/components/checkout/payment-method-tabs.tsx` (1 occurrence)
- `src/components/checkout/inline-slip-upload.tsx` (1 occurrence)
- `src/components/checkout/slip-upload-form.tsx` (1 occurrence)

### Step 2: Fix `react-hooks/exhaustive-deps` disables

File: `src/components/courses/course-filters.tsx:95`

**Strategy:** Review the dependency array and either:

- Add the missing dependency (preferred)
- Or extract the effect logic into a named function with a comment explaining why deps are omitted

### Step 3: Fix `react-hooks/set-state-in-effect` disables

Files:

- `src/components/course/free-course-cta.tsx:52`
- `src/components/layouts/cookie-banner.tsx:34`

**Strategy:** These are likely intentional (syncing external state). Move the setState call to an event handler or use a `useSyncExternalStore` pattern instead.

### Step 4: Fix `no-console` disable in logger.ts

File: `src/lib/logger.ts:6`

**Strategy:** The logger is designed to console.log. Instead of disabling the rule globally in the file, suppress the specific lines:

```typescript
// Replace the file-level disable with line-level:
// eslint-disable-next-line no-console
console.log(...);
```

### Step 5: Commit

```bash
git add -A
git commit -m "chore: consolidate eslint-disable comments into RemoteImage component

- Create RemoteImage component for dynamic/presigned URLs
- Replace 9 inline eslint-disable-next-line @next/next/no-img-element
- Fix react-hooks/exhaustive-deps in course-filters.tsx
- Fix react-hooks/set-state-in-effect in free-course-cta, cookie-banner
- Convert logger.ts file-level disable to line-level"
```

---

## Task 4: Remove Unnecessary Comments

### Guideline: Remove comments that state what the code already clearly does. Keep comments that explain:

- **Why** a decision was made (business rules, edge cases)
- **Non-obvious** behavior (sentinel values, race conditions)
- **External references** (design docs, RFCs, bug tickets)

### Step 1: Clean server/repos/course.ts

Remove these comments (code is self-explanatory):

```typescript
// BEFORE (line 25):
// Reusable subquery: active enrollments per course.
const enrollmentCountSubq = ...

// AFTER:
const enrollmentCountSubq = ...
```

```typescript
// BEFORE (line 36):
// TODO: replace with real subquery once lesson durations are indexed.
const courseDurationSubq = ...

// AFTER: Keep the TODO (it's actionable)
const courseDurationSubq = ...
```

```typescript
// BEFORE (line 169):
// Client-side duration filter (TODO: move to SQL when duration is indexed)

// AFTER: Keep the TODO
```

### Step 2: Clean certificate-issuer.ts

Remove step-by-step comments that mirror the code:

```typescript
// REMOVE these lines (the method names explain the steps):
// Verify enrollment belongs to user and is completed.
// Fetch course title and student name.
// Render PDF.
// Upload to storage.
// Create media_asset for the PDF.
// Create certificate row.
```

Keep:

```typescript
// Idempotent: return existing certificate. ← KEEP (explains why)
// Admins preview courses without paying or enrolling — by design they
// never earn a certificate. ← KEEP (explains business rule)
```

### Step 3: Clean course-authz.ts

Remove:

```typescript
// Check if user is the course owner. ← REMOVE (code says this)
// Check collaborator role. ← REMOVE (code says this)
```

### Step 4: Clean admin/quiz-builder.tsx

Remove:

```typescript
// Validate: each question must have at least 2 choices and exactly 1 correct answer. ← REMOVE (zod schema is clear)
```

### Step 5: Clean app/courses/[slug]/page.tsx

Remove:

```typescript
// Defensive: render free if either flag set OR price is literally 0 — keeps
// the page UX correct even if a stray row escaped the create/update invariant.
```

Replace with self-documenting code:

```typescript
const isFreeView = course.isFree || Number(course.price) === 0; // invariant enforced at create/update
```

### Step 6: Clean components/course/course-card.tsx

Remove:

```typescript
// Defensive: if a row slipped through with price=0 && isFree=false...
```

Replace with:

```typescript
const isFree = course.isFree || Number(course.price) === 0; // belt-and-braces
```

### Step 7: Clean dashboard/page.tsx helpers

Move helper functions to `lib/dashboard.ts` and remove inline comments:

```typescript
// BEFORE: 5 inline helper functions with comments
// AFTER: import { formatDuration, timeAgo, getActivityMeta } from "@/lib/dashboard"
```

### Step 8: Commit

```bash
git add -A
git commit -m "style: remove unnecessary comments

Removes comments that state what code already clearly does.
Keeps comments explaining why (business rules, edge cases, sentinels).
Moves dashboard helpers to lib/dashboard.ts."
```

---

## Task 5: Fix Prettier/Format Issues

### Step 1: Run prettier on all source files

```bash
npx prettier --write "src/**/*.{ts,tsx}" "tests/**/*.{ts,tsx}"
```

### Step 2: Verify no unformatted files remain

```bash
npx prettier --check "src/**/*.{ts,tsx}" "tests/**/*.{ts,tsx}"
```

Expected: `All matched files use Prettier code style!`

### Step 3: Run ESLint with fix

```bash
npx eslint --fix "src/**/*.{ts,tsx}" "tests/**/*.{ts,tsx}"
```

### Step 4: Verify clean lint

```bash
npx eslint "src/**/*.{ts,tsx}" "tests/**/*.{ts,tsx}"
```

Expected: No errors (except pre-existing password-input.tsx issues).

### Step 5: Commit

```bash
git add -A
git commit -m "style: run prettier and eslint --fix across codebase"
```

---

## Task 6: Business Logic Review & Fixes

### Step 1: Fix `safeNext` to use URL API (security)

File: `src/app/login/page.tsx`

Current:

```typescript
function safeNext(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}
```

Issue: `startsWith("//")` check is insufficient. `"/\\example.com"` bypasses.

Fix:

```typescript
function safeNext(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  try {
    const url = new URL(raw, "http://localhost");
    if (url.host !== "localhost") return fallback; // not a relative path
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}
```

### Step 2: Fix `quiz.ts` action — missing auth check

File: `src/server/actions/quiz.ts`

Current: Calls `getSession()` but doesn't handle the case where user exists but isn't enrolled in the course.

Add enrollment check before submitting quiz:

```typescript
const quiz = await getQuizById(quizId);
if (!quiz) return { ok: false, error: "quiz_not_found" };

// Verify user is enrolled in the course containing this quiz
const isEnrolled = await isUserEnrolledInCourse(session.user.id, quiz.courseId);
if (!isEnrolled) return { ok: false, error: "not_enrolled" };
```

### Step 3: Fix `admin-command.ts` — potential race condition

File: `src/server/admin/admin-command.ts`

Review the `requireCourseAccess` function. It does two sequential DB queries (course owner check, then collaborator check). These should be parallelized:

```typescript
// BEFORE: sequential
const courseRows = await db.select(...).from(course).where(...);
const collabRows = await db.select(...).from(courseCollaborator).where(...);

// AFTER: parallel
const [courseRows, collabRows] = await Promise.all([
  db.select(...).from(course).where(...),
  db.select(...).from(courseCollaborator).where(...),
]);
```

### Step 4: Fix `pending-fsm.ts` — `isActionable` type safety

File: `src/server/services/pending-fsm.ts`

Current:

```typescript
export function isActionable(status: string): boolean {
  return status === "awaiting_payment" || status === "slip_submitted";
}
```

Issue: Accepts `string` but should accept `PendingStatus` for type safety:

```typescript
export function isActionable(status: PendingStatus): boolean {
  return status === "awaiting_payment" || status === "slip_submitted";
}
```

### Step 5: Fix `checkout/[pendingId]/page.tsx` — missing expired check

File: `src/app/checkout/[pendingId]/page.tsx`

Verify that expired pending enrollments are properly handled. The page checks `isExpired` but ensure the upload form is also disabled when expired.

### Step 6: Commit

```bash
git add -A
git commit -m "fix: business logic correctness issues

- safeNext: use URL API for robust open-redirect prevention
- quiz action: add enrollment check before quiz submission
- admin-command: parallelize course access checks
- pending-fsm: tighten isActionable to PendingStatus type
- checkout page: verify expired state handling"
```

---

## Task 7: Evaluate Domain/DB Separation

### Current State

**DB Schema = Domain Model.** `course.ts` schema defines both the table structure AND the domain entity:

```typescript
// db/schema/course.ts
export const course = pgTable("course", { ... });
export type Course = typeof course.$inferSelect;
export type NewCourse = typeof course.$inferInsert;
```

### Recommendation: **NO — Don't Separate (Yet)**

**Reasoning:**

1. **Drizzle's type inference is the whole point.** `pgTable` already gives you `.$inferSelect` and `.$inferInsert` for free. Adding a separate domain layer means maintaining parallel type definitions.

2. **The codebase is not large enough.** ~200 source files. The complexity cost of a mapping layer outweighs the benefits at this scale.

3. **Schema IS the contract.** In a TypeScript+Drizzle project, the DB schema is the single source of truth. The "repository" layer (`server/repos/`) already provides the abstraction boundary.

4. **When TO separate (future trigger):**
   - Multiple database backends (Mongo + Postgres)
   - Event sourcing or CQRS
   - Domain logic becomes complex enough to need value objects, aggregates, etc.
   - > 500 source files

### What TO Do Instead

Keep the current pattern but improve naming:

```typescript
// GOOD (current):
export type Course = typeof course.$inferSelect;

// BETTER (more explicit):
export type CourseRow = typeof course.$inferSelect;
export type CourseInsert = typeof course.$inferInsert;
```

This makes it clear these are DB row types, not domain entities.

### Step: Add naming convention ADR

Create: `docs/adr/ADR-001-db-type-naming.md`

Document the decision: "We use Drizzle's inferred types directly as our domain types. If we ever need a separate domain model, we'll add a mapping layer at that time."

### Step: Commit

```bash
git add -A
git commit -m "docs(adr): document domain/DB type coupling decision

Decided NOT to separate domain entities from DB schema.
Drizzle's inferred types serve as both DB and domain types.
Repository layer (server/repos/) provides the abstraction boundary.
If scale exceeds ~500 files or we add a second DB, revisit this decision."
```

---

## Self-Review

### 1. Spec Coverage

| Requirement                 | Task                                                      |
| --------------------------- | --------------------------------------------------------- |
| Remove dead code            | **Task 1** (delete files), **Task 2** (remove exports) ✅ |
| Remove unnecessary comments | **Task 4** ✅                                             |
| Fix prettier/eslint         | **Task 3** (eslint), **Task 5** (prettier) ✅             |
| Business logic correctness  | **Task 6** ✅                                             |
| Domain/DB separation        | **Task 7** (evaluate + ADR) ✅                            |

### 2. Risk Assessment

| Task                 | Risk     | Mitigation                            |
| -------------------- | -------- | ------------------------------------- |
| Delete unused files  | Low      | Verify with grep before deleting      |
| Remove exports       | Low      | Verify with grep before removing      |
| Fix eslint comments  | Medium   | Test all affected components visually |
| Remove comments      | Low      | Only remove obvious ones              |
| Prettier format      | Low      | Automated, reversible                 |
| Business logic fixes | **High** | Write tests before changing           |
| ADR                  | None     | Documentation only                    |

### 3. Commit Strategy

Each task is a separate commit for easy bisection if issues arise.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-05-code-quality-cleanup.md`.**

**Execution options:**

**1. Subagent-Driven (recommended)** — Dispatch fresh subagent per task. Tasks 1-5 are low-risk and can be batched. Task 6 (business logic) requires careful testing.

**2. Inline Execution** — Execute in this session, task by task, with verification after each.

---

## Task 8: Eliminate ALL `any` and `unknown` Types

**Policy:** `any` and `unknown` are banned in production code. Every value must have a concrete type.

### Step 1: Fix `any` in admin/page.tsx

```typescript
// BEFORE:
function KpiCard({ icon: Icon, iconColorClass, iconBgClass, value, label, trend, trendPositive = true, href }: any) { ... }
function StatusBadge({ variant, children }: any) { ... }
const map: any = { ... }

// AFTER: Define proper interfaces
interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconColorClass: string;
  iconBgClass: string;
  value: string | number;
  label: string;
  trend?: string;
  trendPositive?: boolean;
  href?: string;
}

interface StatusBadgeProps {
  variant: "success" | "warning" | "destructive" | "neutral";
  children: React.ReactNode;
}
```

### Step 2: Fix `as any` casts in admin/page.tsx

```typescript
// BEFORE:
(s as any).studentName ?? "Student";

// AFTER: Define proper row type
interface TopStudentRow {
  studentName: string | null;
  // ... other fields
}
(s as TopStudentRow).studentName ?? "Student";
```

### Step 3: Fix `unknown` in auth-session.ts

```typescript
// BEFORE:
export function getUserRole(user: unknown): string | null | undefined {
  const role = (user as Record<string, unknown>).role;
  // ...
}

// AFTER: Use Better Auth's actual user type
import type { User } from "better-auth";
export function getUserRole(user: User | null): string | null | undefined {
  return user?.role ?? null;
}
```

### Step 4: Fix `unknown` in API route catch blocks

**Pattern found in 10+ files:**

```typescript
} catch (e: unknown) {
  // ...
}
```

**Strategy:** These are catch blocks. TypeScript requires `unknown` in catch. Instead of changing the catch type, ensure the error is properly narrowed before use:

```typescript
} catch (e) {
  const message = e instanceof Error ? e.message : "Unknown error";
  // ...
}
```

**Files to fix:**

- `src/app/checkout/start/route.ts`
- `src/app/api/slip/upload/route.ts`
- `src/app/api/webhooks/bunny/route.ts`
- `src/app/api/admin/slips/[slipId]/accept/route.ts`
- `src/app/api/admin/slips/[slipId]/reject/route.ts`
- `src/app/api/admin/slips/[slipId]/image-url/route.ts`
- `src/app/api/admin/slips/bulk-accept/route.ts`
- `src/app/api/admin/slips/bulk-reject/route.ts`
- `src/app/api/cron/email-retry/route.ts`
- `src/server/payments/pending-enrollment-service.ts`
- `src/server/payments/slip-review-service.ts`
- `src/server/actions/admin-grant.ts`
- `src/server/services/curriculum-admin.ts`

### Step 5: Fix `Record<string, unknown>` in actions

**Files:**

- `src/server/actions/admin-course.ts:106`
- `src/server/actions/admin-curriculum.ts:112`

```typescript
// BEFORE:
const raw: Record<string, unknown> = { courseId };

// AFTER: Use specific type
const raw: Partial<UpdateCourseInput> = { courseId };
```

### Step 6: Fix `unknown` in bunny.ts

```typescript
// BEFORE:
const data = (await res.json()) as unknown;

// AFTER: Use Zod schema
const BunnyResponseSchema = z.object({ guid: z.string() });
const data = BunnyResponseSchema.parse(await res.json());
```

### Step 7: Fix `unknown` in dispatch.ts

```typescript
// BEFORE:
params: Record<string, unknown>;

// AFTER: Use generic
interface EmailTemplate<TParams> {
  params: TParams;
}
```

### Step 8: Add ESLint rule to ban `any`

File: `eslint.config.mjs`

Add:

```javascript
"@typescript-eslint/no-explicit-any": ["error", { fixToUnknown: false }],
"@typescript-eslint/no-unsafe-assignment": "error",
"@typescript-eslint/no-unsafe-member-access": "error",
"@typescript-eslint/no-unsafe-call": "error",
"@typescript-eslint/no-unsafe-return": "error",
```

### Step 9: Commit

```bash
git add -A
git commit -m "type-safety: eliminate all any and unknown types

- Define proper interfaces for KpiCard, StatusBadge (admin/page)
- Replace as any casts with typed row interfaces
- Fix auth-session getUserRole to use User type
- Narrow catch block errors with instanceof Error
- Add Zod schema for Bunny API response
- Add ESLint rules to ban any/unknown permanently"
```

---

## Task 9: Delete Shallow Services (CourseAdminService, QuizAdminService)

**Architecture finding:** These services are pass-throughs — deleting them concentrates complexity into fewer files.

### Step 1: Inline CourseAdminService into action

File: `src/server/services/course-admin.ts` → delete

Move `price` normalization into action or a pure helper:

```typescript
// lib/course.ts
export function normalizePrice(price: string, isFree: boolean): string {
  return isFree ? "0.00" : price;
}
```

### Step 2: Delete QuizAdminService

File: `src/server/services/quiz-admin.ts` → delete

Action calls repo directly:

```typescript
// BEFORE: action → QuizAdminService → repo
// AFTER:  action → repo
```

### Step 3: Commit

```bash
git add -A
git commit -m "refactor: delete shallow CourseAdminService and QuizAdminService

- CourseAdminService was a pass-through; price normalization moved to lib/course.ts
- QuizAdminService delegated directly to repo with no added behavior
- Actions now call repos directly for simple CRUD"
```

---

## Task 10: Fix CurriculumAdminService O(N) Ownership Checks

**Problem:** `verifyModuleInCourse` and `verifyLessonInCourse` load full curriculum trees just to check ID membership.

### Step 1: Add existence queries to repo

File: `src/server/repos/admin-course.ts`

Add:

```typescript
export async function moduleExistsInCourse(moduleId: string, courseId: string): Promise<boolean> { ... }
export async function lessonExistsInCourse(lessonId: string, courseId: string): Promise<boolean> { ... }
```

### Step 2: Replace in-memory scanning with DB queries

File: `src/server/services/curriculum-admin.ts`

Replace:

```typescript
// BEFORE: loads full curriculum, scans in-memory
// AFTER: calls repo.exists methods
```

### Step 3: Commit

```bash
git add -A
git commit -m "perf: replace O(N) curriculum scans with DB existence queries

- Add moduleExistsInCourse and lessonExistsInCourse to admin-course repo
- CurriculumAdminService now does single-row lookups instead of loading trees"
```

---

## Task 11: Extract Dashboard Business Logic from Repo

**Problem:** `student-dashboard.ts` computes streaks, heatmaps, and localized achievements — these are view models, not data access.

### Step 1: Create StudentDashboardService

File: `src/server/services/student-dashboard.ts`

Move from repo:

- Streak calculation
- Heatmap intensity bucketing
- Achievement title/description generation

### Step 2: Make repo return raw rows only

File: `src/server/repos/student-dashboard.ts`

Return raw SQL results without transformation.

### Step 3: Update page to use service

File: `src/app/(student)/dashboard/page.tsx`

Call service instead of repo directly.

### Step 4: Commit

```bash
git add -A
git commit -m "refactor: extract dashboard view model from repo into service

- Create StudentDashboardService for streak/heatmap/achievement logic
- Repo returns raw rows only
- Page calls service for transformed view model"
```

---

## Task 12: Centralize Service Composition (Container)

**Problem:** `make*Service()` factories are duplicated across 6+ action files.

### Step 1: Create service container

File: `src/server/container.ts`

```typescript
export const container = {
  courseAdmin: () => new CourseAdminService({ ... }),
  coverImage: () => new CoverImageService({ ... }),
  courseCompletion: () => new CourseCompletionService({ ... }),
  slipUpload: () => new SlipUploadService({ ... }),
  slipReview: () => new SlipReviewService({ ... }),
  certificate: () => certificateIssuerFactory(),
  // ... etc
};
```

### Step 2: Replace inline factories with container calls

Files:

- `src/server/actions/admin-course.ts`
- `src/server/actions/admin-publish.ts`
- `src/server/actions/enroll-free.ts`
- `src/server/actions/quiz.ts`
- `src/server/actions/slip.ts`
- `src/server/actions/admin-slip.ts`

### Step 3: Commit

```bash
git add -A
git commit -m "refactor: centralize service composition in container.ts

- Extract make*Service factories from 6 action files
- Single container.ts owns all dependency wiring
- Actions shrink to auth-parse-call-return shells"
```

---

## Task 13: Fix CourseCompletionService Fake Dependencies

**Problem:** Quiz action injects no-op functions because it only needs `reevaluateCourseCompletion`.

### Step 1: Split service into focused interfaces

```typescript
// CourseCompletionService — full flow: lesson → course → cert
class CourseCompletionService { ... }

// CourseCompletionChecker — just checks and marks, no lesson
class CourseCompletionChecker {
  async checkAndIssue(userId, courseId): Promise<...> { ... }
}
```

### Step 2: Update quiz action

```typescript
// BEFORE: constructs full service with fake deps
// AFTER: imports checker only
const checker = container.courseCompletionChecker();
await checker.checkAndIssue({ userId, courseId });
```

### Step 3: Commit

```bash
git add -A
git commit -m "refactor: split CourseCompletionService into focused interfaces

- CourseCompletionService: full lesson→course→cert flow
- CourseCompletionChecker: course→cert only (for quiz re-evaluation)
- Quiz action no longer injects no-op dependencies"
```

---

## Task 14: Move Quiz Orchestration from Action to Service

**Problem:** Quiz action contains "if passed, reevaluate completion" workflow.

### Step 1: Add submitAndCheckCompletion to QuizService

```typescript
class QuizService {
  async submitAndCheckCompletion(params: {
    userId: string;
    quizId: string;
    answers: Record<string, string>;
  }): Promise<{ quizResult: QuizResult; courseCompleted: boolean }> { ... }
}
```

### Step 2: Simplify action

```typescript
export async function submitQuizAction(formData: FormData) {
  // auth + parse
  const result = await quizService.submitAndCheckCompletion({
    userId,
    quizId,
    answers,
  });
  return { ok: true, result: result.quizResult };
}
```

### Step 3: Commit

```bash
git add -A
git commit -m "refactor: move quiz completion orchestration into QuizService

- QuizService.submitAndCheckCompletion handles pass → completion check flow
- Action is now pure auth + parse + call"
```

---

## Task 15: Consolidate Completion Flow Ownership

**Problem:** Completion logic is fragmented across 6+ modules.

### Step 1: Audit all completion-related modules

Files:

- `src/server/repos/progress.ts` — upsert progress
- `src/server/repos/learn-completion.ts` — check all lessons done
- `src/server/services/course-completion.ts` — orchestrate
- `src/server/services/certificate-factory.ts` — create issuer
- `src/server/actions/quiz.ts` — trigger re-evaluation
- `src/app/api/learn/progress/route.ts` — API entry point

### Step 2: Create single CompletionOrchestrator

File: `src/server/services/completion-orchestrator.ts`

Owns the entire flow:

```typescript
class CompletionOrchestrator {
  async handleLessonComplete(userId, lessonId): Promise<...> { ... }
  async handleQuizPassed(userId, courseId): Promise<...> { ... }
}
```

### Step 3: Route and action both call orchestrator

```typescript
// API route:
await orchestrator.handleLessonComplete(user.id, lessonId);

// Quiz action:
await orchestrator.handleQuizPassed(user.id, courseId);
```

### Step 4: Commit

```bash
git add -A
git commit -m "refactor: consolidate completion flow into CompletionOrchestrator

- Single owner for lesson→course→certificate flow
- API route and quiz action both call same orchestrator
- Repos expose atomic ops; orchestrator sequences them"
```

---

## Self-Review (Updated)

### Spec Coverage

| Requirement                      | Task                      |
| -------------------------------- | ------------------------- |
| Remove dead code                 | **Task 1**, **Task 2** ✅ |
| Remove unnecessary comments      | **Task 4** ✅             |
| Fix prettier/eslint              | **Task 3**, **Task 5** ✅ |
| Business logic correctness       | **Task 6** ✅             |
| Domain/DB separation             | **Task 7** (ADR) ✅       |
| **Ban any/unknown types**        | **Task 8** ✅             |
| **Delete shallow services**      | **Task 9** ✅             |
| **Fix O(N) ownership checks**    | **Task 10** ✅            |
| **Extract dashboard view model** | **Task 11** ✅            |
| **Centralize DI container**      | **Task 12** ✅            |
| **Fix fake dependencies**        | **Task 13** ✅            |
| **Move quiz orchestration**      | **Task 14** ✅            |
| **Consolidate completion flow**  | **Task 15** ✅            |

### Updated Risk Assessment

| Task                         | Risk   | Mitigation                 |
| ---------------------------- | ------ | -------------------------- |
| Tasks 1–5 (cleanup)          | Low    | Automated verification     |
| Task 6 (logic fixes)         | High   | Write tests first          |
| Task 8 (type strictness)     | Medium | Type check after each file |
| Tasks 9–10 (delete/refactor) | Medium | Verify all imports updated |
| Tasks 11–15 (architecture)   | High   | Feature-flag or branch     |

### Recommended Execution Order

**Phase 1 (safe):** Tasks 1–5 + Task 8
**Phase 2 (medium):** Tasks 9–10
**Phase 3 (risky):** Tasks 6, 11–15

**Which approach?**
