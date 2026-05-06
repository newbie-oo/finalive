# Deepening Round 3 — All 7 Opportunities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 7 architectural deepening opportunities discovered in the post-ADR-0004 codebase survey.

**Architecture:** Extract focused modules from god modules, remove leaky seams, and move presentation logic to the view layer. Build bottom-up: repos → services → presenters → views.

**Tech Stack:** Next.js App Router, Drizzle ORM, React, TypeScript

---

## Task 1: Extract `dashboard-view-model.ts` from `student-dashboard.ts` service

**Files:**

- Create: `src/server/services/dashboard-view-model.ts`
- Modify: `src/server/services/student-dashboard.ts`
- Test: `src/server/services/dashboard-view-model.test.ts`

**Context:** `student-dashboard.ts` mixes async orchestration (`Promise.all([...])`) with pure view-model functions (`computeStreak`, `buildHeatmap`, `buildAchievements`). The pure functions are untestable without mocking all 7 repo dependencies because they're called inside the orchestrator. The service also imports `coverImageUrl` (presentation utility) to enrich enrollment rows, violating the service-to-presentation seam.

**Steps:**

- [ ] **Step 1: Create `dashboard-view-model.ts` with pure functions**

Move `computeStreak`, `buildHeatmap`, `buildAchievements`, and their types from `student-dashboard.ts` into a new pure module. The new file exports:

- `computeStreak(sortedDates: string[]): number`
- `buildHeatmap(days, start, lessonsByDate): number[]`
- `buildAchievements(certCount, streak, totalDoneLessons, quizPassCount): AchievementItem[]`
- Types: `AchievementItem`

- [ ] **Step 2: Update `student-dashboard.ts` to import from view-model**

Remove the pure functions and types from `student-dashboard.ts`. Import them from `dashboard-view-model.ts`. The service now only orchestrates repo calls and delegates view-model building.

- [ ] **Step 3: Write tests for pure view-model functions**

Test `computeStreak` with various date patterns (consecutive, gaps, empty). Test `buildHeatmap` bucketing logic (0→0, 1→1, 3→2, 5→3, 6→4). Test `buildAchievements` with/without quiz passes.

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/server/services/dashboard-view-model.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: extract dashboard-view-model pure functions from student-dashboard service"
```

---

## Task 2: Extract `useAutoplayCountdown` and `useLessonCompletionEvent` hooks

**Files:**

- Create: `src/hooks/use-autoplay-countdown.ts`
- Create: `src/hooks/use-lesson-completion-event.ts`
- Modify: `src/components/learn/lesson-content.tsx`

**Context:** `lesson-content.tsx` (~130 lines) mixes video player orchestration, autoplay countdown logic (`setInterval` + `useRef` + `useState`), sidebar toggle logic, router navigation, and custom event listeners. The countdown logic is ~30 lines of impure code embedded directly in the layout module.

**Steps:**

- [ ] **Step 1: Create `useAutoplayCountdown` hook**

Encapsulates: countdown timer state, `setInterval` management, cancellation ref, auto-navigation on zero. Returns `{ showCountdown, countdownValue, startCountdown, cancelCountdown }`.

- [ ] **Step 2: Create `useLessonCompletionEvent` hook**

Encapsulates: `window.addEventListener("lesson-completed")`, filtering by `lessonId`, calling `router.refresh()`. Returns nothing (side effect only).

- [ ] **Step 3: Refactor `LessonContent` to use hooks**

Replace inline countdown and event logic with hook calls. `LessonContent` becomes a thin shell: compose hooks, pass derived state to `LessonPlayerLayout`.

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: extract useAutoplayCountdown and useLessonCompletionEvent hooks from LessonContent"
```

---

## Task 3: Fix `container.ts` shallow adapter closures

**Files:**

- Create: `src/server/adapters/course-repo-adapter.ts`
- Create: `src/server/adapters/free-enrollment-adapter.ts`
- Create: `src/server/adapters/course-grant-adapter.ts`
- Modify: `src/server/container.ts`

**Context:** `container.ts` uses inline arrow functions (e.g., `updateCourseCover`, `getCourseBySlug`, `createEnrollment`) that add zero behavior — they just forward arguments. These closures are invisible to tests. The container also mixes env access (`getEnv().BETTER_AUTH_URL`) with dependency wiring.

**Steps:**

- [ ] **Step 1: Create `course-repo-adapter.ts`**

Export `updateCourseCover(courseId, mediaAssetId)` that wraps `updateAdminCourse`. Export `getCourseBySlugForEnrollment(slug)` that calls `getPublishedCourseBySlug` with `includeUnpublished: true` and returns `row ?? undefined`.

- [ ] **Step 2: Create `free-enrollment-adapter.ts`**

Export `createActiveEnrollment(args)` that wraps `EnrollmentRepo.create({ ...args, status: "active" })`.

- [ ] **Step 3: Create `course-grant-adapter.ts`**

Export `createEnrollmentFromGrant(args)` that wraps `EnrollmentRepo.create` with `source: "admin_grant"`. Export `sendGrantNotification(n)` that wraps `sendGrantCourseEmail`.

- [ ] **Step 4: Refactor `container.ts`**

Replace inline closures with direct references to adapters and repos. Remove `baseUrl()` env access from container (not needed there). Container should only construct objects with direct function references.

- [ ] **Step 5: Verify compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "refactor: replace container.ts shallow closures with named adapter files"
```

---

## Task 4: Split `course.ts` repo responsibilities

**Files:**

- Create: `src/server/repos/preview-lesson.ts`
- Modify: `src/server/repos/course.ts`
- Modify callers: `src/app/courses/[slug]/page.tsx`, `src/server/services/learn-access.ts`

**Context:** `course.ts` repo handles published course listing, featured courses, preview lessons, curriculum re-export, course ID resolution, and course info lookup. `listPublishedCourses` performs client-side duration filtering after the DB query. `getPreviewLesson` embeds the `isPlayable` business rule inside the repo. It also re-exports `EnrollmentRepo.hasActive` as `isUserEnrolledInCourse`.

**Steps:**

- [ ] **Step 1: Create `preview-lesson.ts` repo**

Move `getPreviewLesson` and `PreviewLesson` type from `course.ts`. The `isPlayable` field is removed from the repo return type; repo returns `isPreview` and `isFree` as raw booleans. Callers compute `isPlayable`.

- [ ] **Step 2: Clean `course.ts`**

Remove `getPreviewLesson`, `PreviewLesson` type, and `isUserEnrolledInCourse` re-export. Remove client-side duration filtering from `listPublishedCourses` — return `totalSeconds` and let page/presenter filter. Keep: `listPublishedCourses`, `listFeaturedCourses`, `getPublishedCourseBySlug`, `getCourseCurriculum`, `getCourseIdByLessonId`, `getCourseInfo`.

- [ ] **Step 3: Update callers**

Update `courses/[slug]/page.tsx` to import `getPreviewLesson` from new repo and compute `isPlayable = isPreview || isFree`. Update `learn-access.ts` to import `isUserEnrolledInCourse` directly from `EnrollmentRepo`.

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: split preview-lesson from course.ts repo; remove isPlayable business rule from repo layer"
```

---

## Task 5: Split `admin-course.ts` repo into focused repos

**Files:**

- Create: `src/server/repos/admin-curriculum.ts`
- Create: `src/server/repos/reorder.ts`
- Modify: `src/server/repos/admin-course.ts`
- Modify callers: `src/server/actions/admin-course.ts`, `src/server/actions/admin-curriculum.ts`, `src/server/admin/admin-command.ts`

**Context:** `admin-course.ts` contains: admin course listing, course creation/update, curriculum CRUD, soft-delete transactions, complex SQL reordering, and existence checks. Interface surface is nearly as large as implementation.

**Steps:**

- [ ] **Step 1: Create `reorder.ts` repo**

Move `rewriteSortOrder`, `reorderAdminModules`, and `reorderAdminLessons` from `admin-course.ts`. This is pure SQL range-shifting logic.

- [ ] **Step 2: Create `admin-curriculum.ts` repo**

Move curriculum-specific functions: `getAdminCourseCurriculum`, `getAdminLessonById`, `createAdminModule`, `createAdminLesson`, `updateAdminModule`, `updateAdminLesson`, `deleteAdminModule`, `deleteAdminLesson`. Also move `moduleExistsInCourse` and `lessonExistsInCourse`.

- [ ] **Step 3: Clean `admin-course.ts`**

Keep only: `listAdminCourses`, `listGrantableCoursesForUser`, `getAdminCourseById`, `createAdminCourse`, `updateAdminCourse`.

- [ ] **Step 4: Update callers**

Update `admin-course.ts` action, `admin-curriculum.ts` action, and `admin-command.ts` to import from correct repos.

- [ ] **Step 5: Verify compilation and tests**

```bash
npx tsc --noEmit && npx vitest run --reporter=basic
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "refactor: split admin-course.ts into admin-course, admin-curriculum, and reorder repos"
```

---

## Task 6: Fix `apiRoute` wrapper leaky seam

**Files:**

- Modify: `src/lib/api-route.ts`
- Modify: `src/app/api/admin/lesson-video/route.ts`
- Modify: `src/app/api/slip/upload/route.ts`

**Context:** `apiRoute`/`apiRouteRaw` allow handlers to return `NextResponse` directly, bypassing standardized error formatting, request ID injection, and response wrapping. Routes like `api/admin/lesson-video` and `api/slip/upload` use this escape hatch extensively.

**Decision after exploration:** Instead of redesigning the wrapper (which would touch 17+ routes), we will **document the escape hatch as an intentional seam** for routes that need custom response shapes (redirects, raw binary, webhooks). The wrapper already handles the common case; the escape hatch is for exceptional routes.

Add a JSDoc comment to `apiRoute`/`apiRouteRaw` explaining when `NextResponse` returns are appropriate. Add an ADR note.

**Steps:**

- [ ] **Step 1: Add JSDoc to `apiRoute` and `apiRouteRaw`**

Document: "Handlers may return `NextResponse` directly for custom response shapes (redirects, raw binary, streaming). This bypasses the wrapper's standard formatting and should be used sparingly."

- [ ] **Step 2: No code changes to routes**

The escape hatch is intentional for routes with exotic response needs. The alternative (adding wrapper options for every case) would make the wrapper's interface as complex as hand-rolling.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "docs: document apiRoute NextResponse escape hatch as intentional seam"
```

---

## Task 7: Extract dashboard presenters from page modules

**Files:**

- Create: `src/lib/format-time.ts` (extend existing)
- Create: `src/server/presenters/student-dashboard-presenter.ts`
- Create: `src/server/presenters/admin-dashboard-presenter.ts`
- Modify: `src/app/(student)/dashboard/page.tsx`
- Modify: `src/app/admin/page.tsx`

**Context:** Both dashboard pages fetch data, compute view models, define inline formatting utilities, map icons to activity types, and render JSX. The admin page hardcodes mock activity rows. Deleting either page would not concentrate complexity.

**Steps:**

- [ ] **Step 1: Create/extend `src/lib/format-time.ts`**

Move `formatDuration`, `formatDurationLabel`, `timeAgo`, and `thaiDateString` from both pages into shared lib formatters. These are pure functions with no framework coupling.

- [ ] **Step 2: Create `student-dashboard-presenter.ts`**

Accept raw `getStudentDashboard()` output and return view-ready records: stats array (with icon components resolved), enrollment cards (with coverImageUrl pre-computed), heatmap data, achievements, activity rows (with icon/badge mapping).

- [ ] **Step 3: Create `admin-dashboard-presenter.ts`**

Accept raw `AdminStatsRepo.getCounts()`, `RevenueRepo.getMonthlyRevenue()`, `ActivityRepo.getRecent()`, and `listAdminCourses()` output. Return: KPI cards array, revenue chart data, top courses list, activity rows. Replace hardcoded mock activity rows with real data.

- [ ] **Step 4: Refactor pages to use presenters**

Both pages become thin shells: fetch → presenter → pass view records to render. Remove all inline formatters and icon mapping.

- [ ] **Step 5: Verify compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "refactor: extract dashboard presenters; move formatters to lib"
```

---

## Final Verification

After all tasks:

```bash
npx tsc --noEmit && node scripts/lint-architecture.mjs && npx vitest run --reporter=basic
```

All 332 tests must pass. Architecture lint must show 0 violations.

---

## Self-Review Checklist

1. **Spec coverage:** All 7 deepening opportunities have corresponding tasks.
2. **Placeholder scan:** No TBD, TODO, or "implement later" in plan.
3. **Type consistency:** `AchievementItem` defined once in view-model and reused. `CourseCardData` pattern from ADR-0004 is followed.
4. **ADR alignment:** No contradictions with ADR-0001–0004. Task 6 documents an escape hatch rather than removing it (consistent with ADR-0003's pragmatic approach).
