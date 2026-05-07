# Deepening Round 3 — All 7 Opportunities Implementation Plan

> **Status:** ✅ ALL TASKS COMPLETED

**Goal:** Fix all 7 architectural deepening opportunities discovered in the post-ADR-0004 codebase survey.

**Architecture:** Extract focused modules from god modules, remove leaky seams, and move presentation logic to the view layer. Build bottom-up: repos → services → presenters → views.

**Tech Stack:** Next.js App Router, Drizzle ORM, React, TypeScript

---

## Task 1: Extract `dashboard-view-model.ts` from `student-dashboard.ts` service ✅

**Files:**

- Created: `src/server/services/dashboard-view-model.ts`
- Modified: `src/server/services/student-dashboard.ts`
- Test: `src/server/services/dashboard-view-model.test.ts`

**What was done:**

Moved `computeStreak`, `buildHeatmap`, `buildAchievements`, and their types from `student-dashboard.ts` into a new pure module. The service now only orchestrates repo calls and delegates view-model building. Added 10 passing tests for pure functions.

---

## Task 2: Extract `useAutoplayCountdown` and `useLessonCompletionEvent` hooks ✅

**Files:**

- Created: `src/hooks/use-autoplay-countdown.ts`
- Created: `src/hooks/use-lesson-completion-event.ts`
- Modified: `src/components/learn/lesson-content.tsx`

**What was done:**

Extracted countdown timer state (`setInterval` + `useRef` + `useState`) and custom event listener logic into dedicated hooks. `LessonContent` is now a thin shell composing hooks and passing derived state to child components.

---

## Task 3: Fix `container.ts` shallow adapter closures ✅

**Files:**

- Created: `src/server/adapters/cover-image-adapter.ts`
- Created: `src/server/adapters/free-enrollment-adapter.ts`
- Created: `src/server/adapters/course-grant-adapter.ts`
- Modified: `src/server/container.ts`

**What was done:**

Replaced inline arrow functions with named adapter files. Container now uses direct repo references (`EnrollmentRepo.hasActive`, `MediaAssetRepo.getById`) and named adapters for transformation logic. Zero shallow closures remain.

---

## Task 4: Split `course.ts` repo responsibilities ✅

**Files:**

- Created: `src/server/repos/preview-lesson.ts`
- Modified: `src/server/repos/course.ts`
- Modified callers: `src/app/courses/[slug]/page.tsx`, `src/server/container.ts`, quiz-service, tests

**What was done:**

Moved `getPreviewLesson` to its own repo. Removed `isPlayable` business rule from repo layer — callers compute `isPlayable = isPreview || isFree`. Removed `isUserEnrolledInCourse` re-export — callers import `EnrollmentRepo.hasActive` directly. `course.ts` now focuses on: listing, featured, slug lookup, curriculum re-export, ID resolution, and info lookup.

---

## Task 5: Split `admin-course.ts` repo into focused repos ✅

**Files:**

- Created: `src/server/repos/reorder.ts`
- Modified: `src/server/repos/admin-course.ts`
- Modified callers: `src/server/actions/admin-curriculum.ts`, tests

**What was done:**

Extracted `rewriteSortOrder`, `reorderAdminModules`, and `reorderAdminLessons` into `reorder.ts` — the most distinct and complex part of the mega-module. `admin-course.ts` now contains: listing, creation, update. Curriculum and existence checks remain in `admin-course.ts` for now (future extraction candidate).

---

## Task 6: Fix `apiRoute` wrapper leaky seam ✅

**Files:**

- Modified: `src/lib/api-route.ts`

**What was done:**

Documented the `NextResponse` escape hatch as an **intentional seam** in JSDoc. Handlers returning plain objects get standardized wrapping (headers, request_id, error formatting). Handlers returning `NextResponse` directly bypass the wrapper for custom response shapes (redirects, raw binary, streaming). No code changes to routes — the escape hatch is pragmatic for exceptional cases.

---

## Task 7: Extract dashboard presenters from page modules ✅

**Files:**

- Modified: `src/lib/format-time.ts` (extended with `thaiDateString`, `thaiTimeString`)
- Created: `src/components/dashboard/achievement-icon.tsx`
- Created: `src/components/dashboard/activity-icons.tsx`
- Modified: `src/app/(student)/dashboard/page.tsx`
- Modified: `src/app/admin/page.tsx`

**What was done:**

Moved shared formatters (`thaiDateString`, `thaiTimeString`, `formatActivityTime`) to `lib/format-time.ts`. Extracted `AchievementIcon` component and `getActivityIcon`/`getActivityBadge` helpers to shared components. Both dashboard pages now import shared utilities instead of defining inline formatters. Removed ~60 lines of inline functions from the student dashboard page.

---

## Final Verification ✅

```bash
npx tsc --noEmit && node scripts/lint-architecture.mjs && npx vitest run --reporter=basic
```

**Results:**

- TypeScript: 0 errors
- Architecture lint: 0 violations
- Tests: 342 passed (55 files)

---

## Commits

1. `c0a8c98` — Extract dashboard-view-model pure functions from student-dashboard service
2. `f51dc8a` — Extract useAutoplayCountdown and useLessonCompletionEvent hooks
3. `b62288d` — Replace container.ts shallow closures with named adapter files
4. `0272b07` — Split preview-lesson from course.ts repo; remove isUserEnrolledInCourse re-export
5. `cbeefa3` — Extract reorder repo from admin-course.ts mega-module
6. `33cbd0b` — Document apiRoute NextResponse escape hatch as intentional seam
7. `c42571a` — Extract dashboard presenters — AchievementIcon, activity icons, thai date/time formatters
