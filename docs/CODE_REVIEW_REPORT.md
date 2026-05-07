# Finalive Next.js — Senior Engineer Code Review

**Reviewer:** Senior software engineer (multi-agent assisted)
**Date:** 2026-05-07
**Scope:** Full codebase (382 TS/TSX files)
**Stack:** Next.js 16.2.4 (App Router) · React 19.2 · TypeScript · Drizzle 0.36 · Better Auth 1.6 · Tailwind 4 · Zustand · TanStack Query · Vitest · Playwright

This report consolidates findings from six parallel reviews (frontend, backend, state/cache, tests, shared lib/DRY, dead-code/comment cleanup). Every finding cites `file:line`. Severity legend: **CRITICAL** = correctness/security risk in production; **HIGH** = ship-blocker for next refactor sprint; **MEDIUM** = clear maintainability win; **LOW** = polish.

---

## Executive summary

The codebase is well-structured for a small team — Drizzle schemas are clean, the `container.ts` IoC root is a good idea, and the service layer has visible TDD shape (DI + fakes) for the payment/cert flow. **Five themes need attention before scaling**:

1. **Caching is opted out, not invalidated.** 23 routes pinned `dynamic = "force-dynamic"`, **zero** `revalidateTag` calls, and several mutations forget `revalidatePath` entirely (publish, grant, slip review, enrollment, certificate revoke). The codebase pays full DB cost on every render *and* still serves stale data after writes.
2. **Repos throw `ApiError` and run business transactions.** `SlipRepo.runAcceptTx`/`runRejectTx`/`finalizeUploadTx` orchestrate state machines and emit Thai HTTP error messages — leaking transport semantics into persistence.
3. **Status enums and role checks are stringly-typed throughout.** `"admin"` literal scattered in 12+ places, `LessonProgressStatus`/`PendingStatus`/`EnrollmentStatus`/`CourseStatus` repeated as inline tuples or bare `string`, with `as PendingStatus` casts at every render boundary.
4. **Forms never use `zodResolver`.** Every login/register/account form does `useForm()` then re-validates manually with `safeParse` and loops `setError` — bypassing RHF entirely. `@hookform/resolvers` isn't even in `package.json`.
5. **A handful of components/pages are 400–800 lines** mixing data shaping, formatting, server calls, hardcoded marketing data, and SVG geometry. The two biggest (`app/page.tsx` 797, `app/admin/page.tsx` 672) also contain runtime bugs (missing icon imports, props that don't exist on the component, mocked activity rendered as real, typos in Thai copy).

The good news: most fixes are local, mechanical, and unblock follow-up improvements (e.g. extracting one `<StatusChip>` deletes ~6 inline copies, moving formatters into `src/lib/format.ts` deletes 30+ duplicates).

### Top 12 priorities (highest leverage first)

| # | Issue | Severity | Effort |
|---|---|---|---|
| 1 | Wrap `getSession`, `getLearnCourse`, `getCourseCurriculum` in React `cache()` — eliminates 2-3 duplicate DB calls per request on every learn-route navigation. | CRITICAL | S |
| 2 | Add missing `revalidatePath`/`revalidateTag` to `publish`, `grantCourse`, `acceptSlip`/`rejectSlip` (single + bulk), `enrollFree`, `createPendingEnrollment`, `revokeCertificate`, `submitQuiz`. | CRITICAL | S |
| 3 | Stop leaking `e.message` from `apiRoute`'s 500 handler (`src/lib/api-route.ts:155-157`) and `cron-route.ts:32-33`. Use `thaiErrorMessage(code)` for the response, log details server-side with `request_id`. | CRITICAL | S |
| 4 | Remove repos throwing `ApiError` and running multi-step business transactions (`SlipRepo.runAcceptTx`, `runRejectTx`, `finalizeUploadTx`). Move to `SlipReviewService`/`SlipUploadService`; keep repo methods narrow. | HIGH | M |
| 5 | Fix idempotency repo: lease has no TTL after commit `8bd3efb`; a crashed holder freezes the row forever. Add `lease_expires_at` and break-on-stale in `tryAcquire`. | HIGH | S |
| 6 | Fix `useNotePreview` cross-user privacy leak — `Object.keys(localStorage)` matches *any* key ending in `-${lessonId}` including other users' notes (`src/hooks/use-note-preview.ts:14-19`). | HIGH | XS |
| 7 | Fix runtime/correctness bugs in `src/app/admin/page.tsx`: missing `Calendar`/`UploadSimple` icon imports (`:344, :353`), `KpiCard` called with non-existent `trend`/`trendPositive` props (`:423, 432, 440, 449`), hardcoded mock activity rows (`:616-664`), Thai typo "เผยแพ่" (`:410`). | HIGH | XS |
| 8 | Wire forms to `zodResolver`. Add `@hookform/resolvers` to dependencies. Delete the manual `safeParse`/`setError` loops in `login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`, `account/page.tsx`. | HIGH | S |
| 9 | Replace string-comparison error mapping in `curriculum-admin.ts:4-17` with SQLSTATE checks via existing `lib/pg-error.ts`. | HIGH | XS |
| 10 | Delete the unused `useUiStore` zustand store (and its test) — pure dead code that ships in the client bundle. | HIGH | XS |
| 11 | Centralize role check (`isAdmin(user)` in `auth-session.ts`) and status enums (`COURSE_STATUSES`, `LESSON_PROGRESS_STATUSES`, `ENROLLMENT_STATUSES`, `PENDING_STATUSES`). Replace 30+ inline literals. | HIGH | M |
| 12 | Decompose the 9 largest files (page.tsx, admin/page.tsx, account/page.tsx, quiz-form.tsx, course-tabs.tsx, curriculum-tree.tsx, new-course-form.tsx, instructor/page.tsx, dashboard/page.tsx) — extract sections, presenters, view-models. | HIGH | L |

---

## 1. Big components → small components (Best practice: ≤ 800 lines, < 50 lines per function)

| Severity | Location | Problem | Fix |
|---|---|---|---|
| HIGH | `src/app/page.tsx:1-797` | One module with 6 hardcoded datasets + inline `StaticCourseCard`, `Eyebrow`, `TrustStat`, `HeroVisual`, and 8 distinct sections | Split into `src/components/home/{hero, social-proof-bar, featured-courses, categories-section, how-it-works, why-finalive, testimonials, instructor-spotlight, cta-banner, hero-visual}.tsx`. Move data to `src/lib/home-content.ts`. Page should be ~50 lines |
| HIGH | `src/app/admin/page.tsx:48-305` | KpiCard, StatusBadge, RevenueChart inline; 160 lines of SVG path math mixed with JSX; mock activity table at `:616-664` | Extract `src/components/admin/{kpi-card, status-badge, revenue-chart, activity-table}.tsx`. Pull SVG geometry into `computeRevenueChartGeometry(data, w, h, p)` for unit testing |
| HIGH | `src/app/(student)/account/page.tsx:80-480` | Four unrelated client forms (`ProfileSection`, `ChangePasswordSection`, `SessionSection`, `DangerZoneSection`) with their own state, validation, server calls | Move each to `src/components/account/`. Page becomes a server component layout passing `initialHasCredential` to children |
| HIGH | `src/components/learn/quiz-form.tsx:34-468` | Three views (question step, results screen, score circle) packed in one file with inline radio styling and a `FormData` round-trip on a typed action | Extract `score-circle.tsx`, `result-row.tsx`, `quiz-question-step.tsx`, `quiz-results-view.tsx`. Container becomes a state machine |
| HIGH | `src/app/courses/[slug]/course-tabs.tsx:24-324` | 5 inline subcomponents, 2 hardcoded data arrays, all rendered inside a `"use client"` boundary that doesn't need to be one | Split into `src/components/course-detail/*` and convert non-stateful pieces (LearningOutcomes, CurriculumTab, InstructorTab, FaqTab, InstructorCard, CourseContentsCard) to RSCs. Keep only `<CourseTabsNav>` as client |
| HIGH | `src/components/admin/curriculum-tree.tsx:67-403` | 11-arg prop barrel, optimistic UI logic in 6 places, signature-based effect sync (`lastSyncRef`) | Extract `useOptimisticCurriculum(initialModules)` returning `{ modules, addModule, renameModule, deleteModule, addLesson, renameLesson, deleteLesson, reorderModules, reorderLessons }`. Pass via `CurriculumTreeContext` |
| HIGH | `src/app/admin/courses/new/new-course-form.tsx:14-181` | Co-located `CoverUpload` (~115 lines, duplicates the standalone `cover-image-upload.tsx`) and `PreviewCard` | Move to `src/components/admin/cover-image-upload.tsx` (already exists — dedupe). Move `PreviewCard` to `src/components/course/course-preview-card.tsx` |
| HIGH | `src/app/instructor/page.tsx:204-381` | Hardcoded 5-row timeline, 10 expertise tags, social links inline | Extract `<Timeline>`, `<TagCloud>`, `<SocialLinks>` and source data from `src/lib/instructor-content.ts` |
| MEDIUM | `src/app/(student)/dashboard/page.tsx:23-305` | Two local `formatDuration*` helpers + inline 5-week heatmap with palette duplicated twice (`:265-271, :294-299`) | Move formatters to `src/lib/format.ts`. Extract `<HeatmapCalendar>` to `src/components/dashboard/heatmap-calendar.tsx` |
| MEDIUM | `src/components/learn/curriculum-sidebar.tsx:62-352` | `CircularProgress`, 4 status icons (`StatusIcon`, `CheckCircleIcon`, `QuizIcon`), `SidebarNotesCard` all inline | Extract `<CircularProgress>` to `src/components/ui/`. Consolidate icons into `<LessonStatusIcon variant="…">` |

---

## 2. Business logic out of UI

| Severity | Location | Problem | Fix |
|---|---|---|---|
| HIGH | `src/app/admin/page.tsx:314-325` | Domain ranking (filter, sort, slice, map for `topCourses`) inside the page body | Move to `formatTopCourses(courses)` in the existing `src/server/services/admin-dashboard-presenter.ts` |
| HIGH | `src/app/courses/[slug]/page.tsx:57-89` | `totalLessons`, `totalDuration`, `isFreeView`, `hasPreviewableLesson`, `durationHours`, `lastUpdated`, `featurePills` derived inline in an RSC | Build `buildCourseDetailViewModel(course, curriculum)` in a new `src/server/services/course-detail-view-model.ts`; page receives a flat VM |
| HIGH | `src/components/learn/quiz-form.tsx:249-274` | Quiz result coalescing (resultMap, selectedChoice, correctChoice, explanation, genericExp) built inside JSX | Move to `buildQuizResultRows(quiz, result)` in `src/lib/quiz-types.ts`. Component just maps |
| HIGH | `src/components/courses/course-filters.tsx:106-146` | 5-level nested ternary deciding `activeQuickFilter` + 28-line state-transition `handleQuickFilter` inside the component | Move to `deriveActiveQuickFilter({ q, freeOnly, price, duration, sortBy })` and a `useReducer` keyed by quick-filter type. Unit-test |
| HIGH | `src/app/(student)/account/page.tsx:109, 191-194, 307-322` | UI calls `authClient.updateUser`, `authClient.changePassword`, *and* a hand-rolled `fetch("/api/auth/revoke-sessions")` for the same module | Wrap in `src/server/actions/account.ts` server actions or `src/lib/account-client.ts`. Pick one transport |
| MEDIUM | `src/components/learn/quiz-form.tsx:184-201` | Manually constructs `FormData`, `JSON.stringify(answers)`, then calls server action | The action's zod schema accepts a plain object. Drop the `FormData` round-trip |
| MEDIUM | `src/app/admin/courses/new/new-course-form.tsx:23-70, 205-229` | Mixes uncontrolled (`formData.get("slug")`) and controlled (`formValues.title`) inputs; XHR upload duplicated with `cover-image-upload.tsx` | Adopt React 19 `useActionState` + RHF + zod resolver. Expose a `useImageUpload({ endpoint, maxBytes })` hook |
| MEDIUM | `src/components/learn/lesson-client.tsx:32-51` | `fetch('/api/learn/start')` from a `useEffect`; errors caught and dropped silently | Move to `useLessonStart(lessonId)` hook with proper error state. HMR / strict-mode double-mount currently calls it twice |
| MEDIUM | `src/app/instructor/page.tsx:62-65` | Student-count formatter inline | Move to `formatThaiCount(n)` in `src/lib/format.ts` |
| MEDIUM | `src/app/courses/[slug]/course-tabs.tsx:60` | `const playable = lesson.isPreview \|\| lesson.isFree;` predicate duplicated in `course-detail/page.tsx:67-69`, `curriculum-sidebar.tsx`, etc. | Centralize `isLessonPlayable(lesson)` next to `course-authz.ts` |

---

## 3. SOLID

### SRP — Single Responsibility

- **HIGH** — `src/server/payments/slip-repo.ts:111-211` — `runAcceptTx`/`runRejectTx` mutate three tables, throw `ApiError("slip_already_reviewed")`/`("enrollment_already_active")`, own state-machine rules. Move orchestration to `SlipReviewService`; let repo expose primitives (`updateSlipStatus`, `markPendingPaid`, `insertEnrollment`).
- **HIGH** — `src/server/payments/slip-repo.ts:254-293` — `finalizeUploadTx` writes media_asset, slip, pending status in one tx with ownership predicate at `:286-288`. Same fix.
- **MEDIUM** — `src/server/repos/admin-course.ts` — bundles course CRUD + module CRUD + lesson CRUD + soft-delete cascade (`:291-318`). Split into 3 repos.
- **MEDIUM** — `src/server/repos/learn.ts:53-185` — `getLearnCourse` loads course, builds curriculum, fetches enrollment, computes progress, *and* picks the resume lesson (the `outer:` label at `:162-176`). Split read vs view-model.
- **MEDIUM** — `src/server/services/curriculum-admin.ts:4-17` — own `classifyDbError` does substring matching on PG error messages. Replace with `lib/pg-error.ts`.
- **MEDIUM** — `src/server/payments/slip-upload-service.ts:94-175` — 7 sequential side effects with no compensation if R2 succeeds and DB fails. Either compensate or invert ordering.

### DIP — Dependency Inversion

- **HIGH** — `src/server/services/quiz-service.ts:1-19` — service imports concrete repos (`getQuizById`, `EnrollmentRepo`, `getCourseIdByLessonId`) just to declare its `*Deps` types via `typeof`. Define proper port interfaces; let `container.ts` adapt repos to ports.
- **HIGH** — `src/server/services/{slip-notifier,notifier}-factory.ts` — direct singleton coupling to `db`. Inject `DbWriter`.
- **MEDIUM** — `src/server/payments/slip-upload-service.ts:155` — leaks `process.env.ADMIN_NOTIFY_EMAIL` inside the service. Add to deps.
- **MEDIUM** — `src/server/services/slip-notifier.ts:113, 142` — `getEnv()` inside the service. Container already has `baseUrl()`; inject it.
- **MEDIUM** — `src/server/actions/admin-curriculum.ts:28-41` — builds its own service object at import time, bypassing `container.ts`. Pick one composition root.

### OCP / ISP / LSP

- **MEDIUM** — `src/server/email/dispatch.ts:36-131` — giant `switch (template)` with `params as { … }` casts. Replace with typed registry: `Record<TemplateName, { component, subject, paramsSchema }>`.
- **MEDIUM** — `src/server/payments/slip-review-service.ts:43-153` — accept and reject paths are 90% structural duplicates. Extract template method or strategy table.
- **MEDIUM** — `src/server/payments/slip-upload-service.ts:53` — `SlipRepoShape` exposes 9 methods to two services that each need 3-4. Define narrower ports `SlipReviewRepo`, `SlipUploadRepo`.

---

## 4. State / cache / data fetching

### Cache invalidation gaps (CRITICAL — actively serves stale data)

| File | Action | Missing |
|---|---|---|
| `src/server/actions/admin-publish.ts:29-50` | publish course | `/courses` list, `/courses/[slug]`, `/sitemap.xml`, `/admin/courses` |
| `src/server/actions/admin-grant.ts:14-35` | grant course | `/admin/users/[id]`, `/dashboard`, `/account/enrollments` |
| `src/server/actions/quiz.ts:33-46` | submit quiz | `/learn/[courseSlug]` (only client `router.refresh()` saves it) |
| `src/server/actions/admin-slip.ts:25-51` + 4 API routes | slip review (single + bulk) | `/account/enrollments`, `/dashboard` |
| `src/server/actions/enroll-free.ts`, `enrollment.ts:10-16` | enroll | `/account/enrollments`, `/dashboard`, `/courses/[slug]` |
| `src/server/actions/certificate-admin.ts:12-18` | revoke certificate | `/verify/[certCode]` (public!), `/admin/certificates` |
| `src/server/actions/admin-quiz.ts:60-73` | save quiz | `/learn/[courseSlug]/quiz/[quizId]` (works only because of `force-dynamic`) |

**Recommendation:** replace path-based `revalidatePath` with **tag-based** invalidation (`unstable_cache(..., { tags: ['course', 'course:'+slug] })`, then `revalidateTag('course:'+id)`). The codebase has **zero** `revalidateTag` calls today.

### Request-level memoization

- **HIGH** — `src/server/auth-session.ts:38-60` `getSession()` is called from layouts AND pages on the same render (`learn/[courseSlug]/layout.tsx:18` + `page.tsx:13` + `[lessonId]/page.tsx:17`). With its `UserRepo.getRoleById` fallback at `:47`, every duplicate call may hit the DB. Wrap in `import { cache } from 'react'`.
- **HIGH** — `src/app/learn/[courseSlug]/{layout,page,[lessonId]/page,quiz/[quizId]/page}.tsx` all call `getLearnCourse(slug, userId, …)` with identical args = 2-3 DB round-trips per navigation. Wrap in `cache()`.

### React Query

- **HIGH** — repo-wide — no query-key factory. Inline `["admin-slips", status]`, `["slip-image-url", slipId]`, `["pending-status", pendingId]` work only by string accident. Centralize in `src/lib/query-keys.ts`.
- **HIGH** — `src/components/admin/use-slip-queue.ts:154-220` — accept/reject mutations are hand-rolled `fetch`. Convert to `useMutation` with `onMutate` optimistic + `onError` rollback. Today every action waits a network round-trip.
- **HIGH** — `src/components/checkout/slip-pending-poll.tsx:41-46` — `useQuery` polls every 15s with no `staleTime`, no `enabled` guard, and no terminal-state handling. After redirect on `paid` it keeps polling; on `gone` it errors silently. Set `refetchInterval` to a function returning `false` once status is terminal.
- **MEDIUM** — `src/components/admin/use-slip-queue.ts:150` — `qc.invalidateQueries(...)` *and* `router.refresh()` after every action = two fetches.
- **MEDIUM** — only `use-slip-queue.ts` uses TanStack Query at all. Either commit RQ for client mutations across the app or remove it for everything except slip.

### Forms

- **HIGH** — repo-wide — **`zodResolver` is never used.** Every form does `useForm()` + manual `safeParse` + `setError` loop in `onSubmit`. Add `@hookform/resolvers` to deps; use it in `login/page.tsx:59-75`, `register/page.tsx:5-45`, `forgot-password/page.tsx`, `reset-password/page.tsx`, `account/page.tsx:91-201`.
- **MEDIUM** — `src/app/(student)/account/page.tsx:96` — `useForm({ values: { name } })` reactively resets on every `useSession` change, can stomp in-progress edits. Use `defaultValues` + `reset()` after save.

### Privacy / data leak

- **HIGH** — `src/hooks/use-note-preview.ts:14-19` — iterates `Object.keys(localStorage)` looking for any key ending in `-${lessonId}`. **Cross-user leak**: user A in the curriculum sidebar can see user B's note preview when they share a browser. Scope key to `${userId}-${lessonId}` with strict equality.

### Memoization issues

- **HIGH** — `src/components/learn/learn-topbar.tsx:62-67` — `useParams()` called inline inside JSX. Hoist.
- **MEDIUM** — `src/components/learn/learn-layout.tsx:35-41` — `useMemo(() => new Map(Object.entries(passedQuizIds)), [passedQuizIds])` — `passedQuizIds` identity changes every render. Memo saves nothing.
- **MEDIUM** — `src/hooks/use-curriculum-progress.ts:48-82` — two memos walking the same lessons twice. Combine into one reducer.

---

## 5. Tests

### Coverage matrix highlights (modules with NO tests)

**Server services:** `quiz-service.ts` (3KB, drives `submitQuizAction`), `quiz-scorer.ts`, `audit.ts` (compliance touchpoint!), `cert-code.ts`, `mailer.ts`, `notifier.ts`, `slip-notifier.ts`, `student-dashboard.ts`, all 5 factory files.

**Server actions:** all 13 files, no unit tests. Most exercised only indirectly.

**Repos without coverage:** `account.ts`, `activity.ts`, `app-setting.ts`, `auth-account.ts`, `checkout.ts`, `course-queries.ts`, `email-queue.ts`, `heatmap.ts`, `idempotency.ts` ⚠ critical, `media-asset.ts`, `pending-enrollment.ts`, `preview-lesson.ts`, `publish.ts`, `revenue.ts`, `streak.ts`, `student-activity.ts`, `student-enrollment.ts`, `user.ts`, `watch-time.ts`.

**API routes:** ~25 routes, ZERO real route-handler tests. The one colocated `route.test.ts` (`api/upload/image/route.test.ts:20-66`) only tests the `sharp` library, not the route. Vanity coverage.

**UI components without tests:** all 22 `src/components/admin/*` (curriculum-tree, slip-detail-panel, video-uploader, lesson-editor, quiz-builder, course-edit-form, …); all 4 `src/components/checkout/*` (money path!); all `src/components/dashboard/*`, `account/*`, `auth/*`.

### Quality issues

- **HIGH** — `src/server/payments/slip-upload-service.test.ts:7-22` — sets up `mockDb.select/insert/update/transaction` but the SUT only calls `repo.*`/`storage.*`. The `withIdempotency` mock just calls `run()` through, so **the test does not verify the idempotency wrapper actually short-circuits**. Add a test where `withIdempotency` returns the cached result.
- **HIGH** — `src/server/payments/slip-review-service.test.ts:253-258, 299-306` — overrides `svc.accept`/`svc.reject` with `vi.fn()` to test bulk methods. **Mocks the SUT itself**; if bulk later inlines accept logic, tests still pass.
- **HIGH** — `src/server/services/course-completion.test.ts:104` — "is idempotent — safe to call twice" asserts the SUT was called twice and child collaborators twice. Tautology that always passes.
- **HIGH** — `src/app/api/upload/image/route.test.ts` — misnamed, only tests `sharp`. Rename to `image-resize.test.ts` and write a real route test.
- **HIGH** — `tests/integration/admin-slip-action.test.ts:15-26` — mocks `@/server/auth-session` to inject admin role *while hitting real DB*. Authz path is never exercised end-to-end.
- **HIGH** — Playwright suite shells out to `docker exec finalive-db psql` in `tests/e2e/{full-pay-loop,learn-flow,quiz-flow}.spec.ts`, `ui/checkout.spec.ts`. Couples tests to dev workstation; can't run on most CI. Use a Node `pg` client.
- **HIGH** — `tests/e2e/{full-pay-loop:60-63, quiz-flow:27-30, learn-flow:44-47}.spec.ts` — `test.skip` on missing seed = silent green. Run Playwright with `--fail-on-skip` in CI.
- **HIGH** — `vitest.config.ts:11-15` — no coverage `thresholds`. Project rule says 80%; nothing enforces it.
- **MEDIUM** — `tests/integration/setup.ts:1-25` — silently swallows missing `.env.local` (`catch {}` line 23). CI failures are opaque.
- **MEDIUM** — `vitest.integration.config.ts:14-16` — `singleFork` + `fileParallelism: false` because every file `TRUNCATE`s the same shared DB. Use per-worker schemas (`SET search_path`) for real parallelism.
- **MEDIUM** — `vitest.workspace.ts` exists but `pnpm test` resolves `vitest.config.ts` first and ignores the workspace. The third config `vitest.ui.config.ts` is dead code. Consolidate.
- **MEDIUM** — Heavy setup duplication: every integration test re-defines its own admin/student insert (`auth.test.ts:14`, `enrollment.test.ts`, `certificate.test.ts:73`, `course-curriculum.test.ts:144`, etc.). Extract `tests/integration/factories/{user,course,enrollment,slip}.ts`.
- **MEDIUM** — `tests/integration/auth.test.ts:15` — `Date.now()` for unique emails. Same-millisecond loop clobbers. Use `randomUUID()`.
- **MEDIUM** — `src/app/register/page.test.tsx:31-44` — `document.querySelectorAll(".h-1.rounded-full")` and asserts Tailwind class names. Refactoring CSS breaks tests.
- **LOW** — `src/server/services/dashboard-view-model.test.ts:13-17` — uses `new Date()` (today-relative). Use `vi.useFakeTimers()`.

---

## 6. Shared lib / DRY (Top extraction candidates)

| # | Duplicated logic | Sites | Proposed location |
|---|---|---|---|
| 1 | Three `formatDuration` variants (m:ss, hours-rounded, h.t/m) | `lib/format.ts:11`, `lib/format-duration.ts:2`, `app/(student)/dashboard/page.tsx:23-34` | `src/lib/format.ts` — `formatMmSs`, `formatMinutesShort`, `formatHoursMinutesSplit` |
| 2 | Buddhist-year + Thai date strings via `toLocaleDateString("th-TH",…)` | 8+ files (admin certs, verify, users, checkout pending, courses, account certs) | Add `thaiDateLong`, `thaiDateTime` to `src/lib/format-time.ts` |
| 3 | `MONTH_LABELS` Thai month tables | `lib/format-time.ts:9-22`, `services/admin-dashboard-presenter.ts:7-20` | Single export from `lib/format-time.ts` |
| 4 | Slip drag-drop component (190 lines copy-pasted) | `inline-slip-upload.tsx`, `slip-upload-form.tsx` differ only in wrapping `<h2>` and button copy | New `src/components/checkout/slip-drop-zone.tsx`, parameterize submit-label |
| 5 | File-upload constants `MAX_*_BYTES`, slip MIME accept list, error copy | 8 files | `src/lib/upload-limits.ts` — `MAX_SLIP_BYTES`, `SLIP_ACCEPT`, `IMAGE_ACCEPT` |
| 6 | `isAdmin` role check (`session?.user?.role === "admin"`) | 12+ files | `auth-session.ts` — `isAdmin(user)` + `ROLE.ADMIN` constant |
| 7 | Status string literals (lesson-progress, enrollment, course, pending) | 30+ sites | `src/lib/domain-status.ts` — typed unions; remove all `as PendingStatus` casts |
| 8 | Toast strings + ApiError → user-facing | 50+ toast sites + `api-route.ts` response builder | `src/lib/toast-messages.ts` catalogue + wire `apiRoute` to use `thaiErrorMessage(code)` |
| 9 | Storage-key construction (`covers/${uuid}-{640,1200}.webp`, `slips/${u}/${p}/${id}.${ext}`, `certs/${code}.pdf`) | 6 files | `src/lib/storage-keys.ts` |
| 10 | Base-URL trim (`BETTER_AUTH_URL.replace(/\/$/, "")`) | 6 files | `src/lib/urls.ts` — `getBaseUrl()`, `getPublicCdnBase()` |

### Logger usage

- **HIGH** — `console.error/log` in production paths instead of `lib/logger.ts`: `lib/api-route.ts:155`, `lib/cron-route.ts:32`, `repos/email-queue.ts:41`, `certificates/certificate-issuer.ts:158`, `services/cover-image.ts:44`, `services/course-grant.ts:98`, `services/image-upload-factory.ts:69`, `app/checkout/start/route.ts:37`. Only 5 files use the structured logger. Pass `requestId`/`userId` via `logger.withContext`.

### Error message handling

- **CRITICAL** — `src/lib/api-route.ts:156-157` returns `e.message` (English/internal) as the API error body. Stack-internal text (e.g. `"insert returned no rows"`, `"idempotency: lease holder vanished — retry"`) reaches the browser. Use `thaiErrorMessage(e.code)` for the response, log `e.message` server-side.
- **HIGH** — `src/lib/error-messages.ts:18` `thaiErrorMessage` exists but is not wired to `apiRoute`. Toast call-sites (e.g. `course-edit-form.tsx:105`) display `e.message` raw.

### Constants / enums

- **CRITICAL** — `"admin"` role literal scattered without central constant. 12+ sites listed above.
- **HIGH** — `STATUS_VALUES` redeclared in `src/app/api/admin/slips/route.ts:5-10` with `satisfies` to `SlipQueueStatus`. Export the array from the type's home.
- **HIGH** — Course/lesson-progress/enrollment statuses repeated as inline tuples in zod and as bare `string` in DTOs. Centralize.

### Env validation

- **HIGH** — Direct `process.env` reads bypass `getEnv()`: `slip-upload-service.ts:155` (`ADMIN_NOTIFY_EMAIL`), `app/api/config/oauth/route.ts:6`. Use the typed env.
- **MEDIUM** — `EMAIL_FROM` schema is `z.string()` not `z.string().email()` (`env.ts:16`). `ADMIN_NOTIFY_EMAIL` is `.email()` for comparison. Tighten.

---

## 7. API routes

- **HIGH** — Inconsistent error envelopes: `apiRoute` standardises `{ code, message, request_id }` but `app/api/checkout/[pendingId]/status/route.ts:14` returns `{ error: "not_found" }` with status 200, `app/api/upload/image/route.ts` returns `{ error: "invalid_form" }`, `app/api/webhooks/bunny/route.ts:29-45` returns `{ error: "unsupported_signature_scheme" }` with status 200, `app/api/admin/lesson-video/route.ts:57, 63, 96, 119` returns custom envelopes. Standardise.
- **HIGH** — Missing rate limits on `/api/admin/slips/{[slipId]/{accept,reject},bulk-accept,bulk-reject}`, `/api/checkout/[pendingId]/status` (polled), `/api/admin/video-status` (calls Bunny on every request).
- **HIGH** — `app/api/webhooks/bunny/route.ts:24` — `if (webhookSecret)` means an unset env makes the webhook accept *unsigned* requests. **Fail closed**.
- **HIGH** — `src/lib/rate-limit.ts:22-40` trusts `x-vercel-forwarded-for`/`cf-connecting-ip`/`x-real-ip` unconditionally. Document the trusted-proxy assumption; ideally drive from `TRUSTED_PROXY` env.
- **MEDIUM** — `src/lib/rate-limit.ts:52-71` — in-memory bucket. Won't survive serverless instance recycling; multiple containers fragment buckets, multiplying the effective limit by N. Replace with Upstash Redis.
- **MEDIUM** — `app/api/learn/progress/route.ts:14` — magic `COMPLETE_SENTINEL = 999_000` to mean "treat watchedSeconds ≥ 999000 as complete". Wire-protocol invariant disguised as a constant. Use `markComplete: boolean`.
- **MEDIUM** — `new URL(req.url).pathname.split("/").slice(-2)[0]!` in 4 admin routes. Use Next's second `{ params }` arg.

---

## 8. Domain modeling

- **HIGH** — Anemic types — IDs are bare strings everywhere (`courseId: string`, `lessonId: string`, `pendingId: string`). `runAcceptTx(slipId, pendingId, row, adminUserId)` (`slip-repo.ts:111-116`) — swap any two and it crashes at runtime. Brand: `type CourseId = string & {readonly _: unique symbol}`.
- **MEDIUM** — `enrollment.status`, `paymentSlip.status`, `pendingEnrollment.status`, `lessonProgress.status` are `text` with DB CHECK constraints, but TS uses `string` everywhere. Either `pgEnum` in Drizzle or unioned types throughout repos.
- **MEDIUM** — `priceAtPurchase: string` (numeric → string) — bare `string` lets `"abc"` slip through. Brand `Money`.

---

## 9. Concurrency / idempotency

- **CRITICAL** — `src/server/repos/idempotency.ts:80-105` — polling loop with no leasing TTL after commit `8bd3efb refactor: drop TTL from idempotency_record`. If the holder process is killed mid-run, the row is `data: null` forever; subsequent attempts poll for 30s then fail. Add `lease_expires_at` and break-on-stale.
- **HIGH** — `src/server/payments/slip-upload-service.ts:73-85` — idempotency key includes `attempt = countSlipsForPending`. Two concurrent uploads with the same `attempt` and same hashed bytes collapse into one. Verify with a test.
- **HIGH** — `src/server/payments/slip-review-service.ts:45-90` — `loadSlipForReview` runs outside the tx; concurrent admin clicks both load row, both enter tx (DB CAS protects). But notifications fire after commit without dedup — `bulkAccept` running 5 concurrent against shared queues can double-notify.
- **HIGH** — `src/server/payments/pending-enrollment-service.ts:71-101` — TOCTOU between `findExisting` (line 72), `expireOutdated` (75), and `insert` (81). Wrap in a tx.
- **MEDIUM** — `src/server/services/course-completion.ts` + `learn-completion.ts:101-112` — `UPDATE … WHERE completedAt IS NULL` race: only one request issues the cert; the other returns `enrollmentId: null` → user sees `courseCompleted: false` even though it was issued. Re-read state.
- **MEDIUM** — `src/server/payments/slip-upload-service.ts:144-160` — DB insert succeeds, then admin email send fails → caller throws → user re-uploads → fresh insert + another admin email. Audit row enqueued *after* notify, so notify failure also drops audit. Reorder.
- **MEDIUM** — `src/server/services/quiz-service.ts:88-98` — completion re-evaluation only on pass; if a passed quiz is later failed, `enrollment.completedAt` stays set forever (cert remains issued).

---

## 10. Drizzle / DB

- **HIGH** — `src/server/repos/learn.ts:99-157` — 4 sequential queries (curriculum tree → enrollment → progress → resume) per learn page render. Combine into `getLearnPage(slug, userId)` with a CTE.
- **HIGH** — `src/server/repos/course.ts:146-157` — `durationMin/Max` filter applied **after** `LIMIT/OFFSET`. Pagination shows wrong count and "missing" rows on filtered pages. TODO at `:16` acknowledges.
- **HIGH** — `src/server/repos/learn-completion.ts:38-99` — 4 round-trips per lesson finish (lesson count → completed count → quiz list → attempts). Single CTE with `bool_and(passed)`.
- **MEDIUM** — `src/server/repos/admin-course.ts:84-103` — `listGrantableCoursesForUser` does fetch + `notInArray`. Use `LEFT JOIN enrollment WHERE enrollment.id IS NULL`.
- **MEDIUM** — `src/server/repos/course-queries.ts:8-16` — `enrollmentCountSubq` has no `LATERAL` / time bounds; scans all active enrollments per query. Materialize as a view.
- **MEDIUM** — Soft-delete predicate `isNull(course.deletedAt)` repeated in 14+ queries. Build helper `aliveCourse()`/`aliveLesson()`/`aliveModule()`.
- **MEDIUM** — `src/server/repos/learn.ts:103-114` re-implements `EnrollmentRepo.hasActive`. Use the canonical one.
- **MEDIUM** — `src/server/repos/learn-completion.ts:60-99` and `repos/quiz.ts:35-71` both compute "latest attempt pass map" — encoded twice, can drift.

---

## 11. Server / client component boundaries

- **HIGH** — `src/app/courses/[slug]/course-tabs.tsx:1` is `"use client"` but 80% of subviews are static. Convert `LearningOutcomes`, `CurriculumTab`, `InstructorTab`, `FaqTab`, `InstructorCard`, `CourseContentsCard` to RSCs.
- **HIGH** — `src/app/(student)/account/page.tsx:39-41` — client component fetches an RSC datum (`userHasCredentialAccount()`) inside `useEffect`. Make page a server component, pass `initialHasCredential` down.
- **HIGH** — `src/components/courses/course-filters.tsx:1-338` — entire 339-line filter is client-only just to push URL search params. Server-render the chrome and result grid; only `<FilterControls>` needs to be client.
- **MEDIUM** — `src/app/(student)/dashboard/page.tsx:176-180`, `new-course-form.tsx:91, 149` — raw `<img>` instead of `next/image`.

---

## 12. Readability / correctness bugs

- **HIGH** — `src/app/admin/page.tsx:344` — `<Calendar size={16} />` renders without an import (`@phosphor-icons/react/dist/ssr` block at `:14-24` doesn't list it). Likely only avoided because the button is `disabled`. Same at `:353` for `UploadSimple`.
- **HIGH** — `src/app/admin/page.tsx:423, 432, 440, 449-450` — passes `trend="↑ 12%"` and `trendPositive` to `KpiCard`, but `KpiCardProps` (`:36-46`) only declares `delta`/`subtext`/`subtextTone`. Trend strings silently dropped.
- **HIGH** — `src/app/admin/page.tsx:616-664` — hardcoded mock activity table (Thai names, amounts) shipped to production despite the page already importing `ActivityRepo` and `formatActivityRows` (`:5-8`). The repo is fetched but never rendered.
- **HIGH** — `src/app/admin/page.tsx:410` — typo "เผยแพ่" should be "เผยแพร่" (correct elsewhere at `:46`).
- **MEDIUM** — Inline `style={{ fontSize: 24, … }}` defeats design tokens in `globals.css`. `src/app/page.tsx:204-206, 213-216, 343-348, 488, 499, 510`. Promote to Tailwind classes.
- **MEDIUM** — Hardcoded color literals (`#4F46E5`, `#10B981`, gradient stops) in 7+ files break dark mode and brand reskinning. Promote to CSS custom properties.
- **MEDIUM** — `src/components/courses/course-filters.tsx:65, 286-294` — both `freeOnly` and `price === "free"` flags coexist for the same concept.
- **MEDIUM** — `src/app/(student)/dashboard/page.tsx:23-28` — `${hours}.${Math.round((mins/60)*10)}` produces strings like `"3.5"` mixing minutes-as-decimal-of-hour, no unit suffix, hint comes from sibling helper. Combine into `formatDurationParts(seconds)`.

---

## 13. Cleanup actions executed

### Files removed (LOW risk, fully verified)

| File | Reason |
|---|---|
| `src/components/admin/admin-breadcrumb.tsx` | Orphaned by commit `8bc9f11` ("remove breadcrumb strip from admin shell"). 0 imports. |
| `src/lib/cron-route.ts` | Orphaned by commit `1ef2863` ("drop remaining cron jobs"). 0 imports. |
| `src/lib/cron-auth.ts` | Only consumer was `cron-route.ts` (also deleted). |
| `src/server/services/course-completion-factory.ts` | Superseded by `container.ts`. 0 imports. |
| `src/components/courses/course-catalog-client.tsx` | Never wired up; `course-catalog.tsx` is the active version. |
| `src/components/courses/view-mode-toggle.tsx` | Only used by `course-catalog-client.tsx` (also deleted). |
| `src/stores/ui-store.ts` + `src/stores/ui-store.test.ts` | 0 production consumers; only the test imports it. Pure dead code. |
| `src/app/test-video/page.tsx` | Public dev scratch page reachable in production at `/test-video`, hardcoded w3schools sample MP4. |

### Comments removed

~155 redundant JSX section-banner comments (`{/* Hero */}`, `{/* Stats */}`, etc.) across 38 files. These add no value beyond what the structure already shows. Two banner-style comments were **kept** because they document design-system intent (`enrollment-card.tsx:79`, `admin-shell.tsx:175`).

### Files NOT removed (require manual decision)

- `src/app/_dev/primitives/page.tsx` — dev primitives gallery. Self-gates with `notFound()` in production. Keep if used as a design reference; otherwise delete.
- `src/components/checkout/inline-slip-upload.tsx` — duplicate of `slip-upload-form.tsx` (190 lines, differs only in wrapper + button copy). Should be merged but requires component-design call.

### Eslint-disable lines flagged for justification

The following carry `// eslint-disable-next-line` without an inline `-- reason` suffix; either fix the underlying issue or annotate:

- `src/app/admin/courses/new/new-course-form.tsx:91, 149` — blob/object URL preview
- `src/components/ui/avatar-initials.tsx:53` — gravatar URL
- `src/components/admin/cover-image-upload.tsx:95` — local preview
- `src/components/admin/slip-image-viewer.tsx:80` — same presigned-URL reason as `:57`
- `src/components/checkout/payment-method-tabs.tsx:145`
- `src/components/checkout/inline-slip-upload.tsx:103`, `slip-upload-form.tsx:111` — local preview
- `src/components/courses/course-filters.tsx:95` — `react-hooks/exhaustive-deps` without explanation

---

## 14. Suggested follow-up roadmap

**Sprint 1 (correctness + security):** items 1-7 of the priorities table. Plus fix `webhooks/bunny` fail-open, idempotency lease TTL, and the `useNotePreview` cross-user leak. ~3 days.

**Sprint 2 (reuse + clarity):** extract candidates 1-10 from §6, the four "big component → small" splits (page.tsx, admin/page.tsx, account/page.tsx, course-tabs.tsx), and the `<StatusChip>`/`<CircularProgress>`/`<CoverFallback>`/`<SectionHeading>` UI primitives. ~5 days.

**Sprint 3 (architecture):** repos to narrow ports; one composition root (kill the parallel factory files); branded ID types; tag-based cache invalidation; convert `course-tabs.tsx` to RSC + tiny client tab nav (biggest single bundle reduction). ~5 days.

**Sprint 4 (testing):** integration test factories, per-worker DB schemas for parallelism, replace `docker exec psql` in E2E, add `--fail-on-skip` to CI, add coverage thresholds, write the missing route-handler tests, write tests for `quiz-service`, `quiz-scorer`, `audit`, `cert-code`, `idempotency` repo. ~5 days.

---

**Note on `src/db/schema/index.ts`:** initially flagged as an unused barrel, but `src/db/client.ts:4` does `import * as schema from "./schema"` and re-exports it; restored.

*Total findings catalogued: ~280 across six themes. Files removed: 9. Comments removed: ~155.*
