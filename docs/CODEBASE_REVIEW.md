# Finalive — Senior Engineering Codebase Review

**Date:** 2026-05-08
**Scope:** Full codebase (`src/**`, `tests/**`, configs)
**Stack:** Next.js 16.2.4, React 19.2, TypeScript 5 (strict), TanStack Query 5, Zustand 5, Drizzle 0.36, Better Auth 1.6, Vitest 2, Playwright 1.49

---

## Executive Summary

The codebase is **structurally healthy** — strong TypeScript hygiene (no `any`, no `@ts-ignore`), centralized query keys, well-tuned polling in critical flows, branded ID types, and a clear `app / components / hooks / lib / server` split. However, four systemic issues hold it back from senior-grade quality:

| # | Theme | Severity | Effort |
|---|---|---|---|
| 1 | **Business logic leaks into UI components** (forms, slip panel, lesson player) | High | M |
| 2 | **Repo / service / handler layers blur** — repos hold business rules, fat API handlers reimplement authz | High | M |
| 3 | **Test coverage is thin where it matters most** — repos ~3%, hooks 0%, services 27% | High | L |
| 4 | **State-management inconsistencies** — manual `fetch` for server state, oversized `useState` clusters in admin/forms | Medium | S |

The largest design red-flag (per Ousterhout) is **Information Leakage**: the same business decisions (free-vs-paid pricing, role normalization, enrollment-active rule, course-status enum) are re-implemented in 3+ modules each. Fixing these alone yields the biggest payoff.

---

## 1. Software-Design Principles (Ousterhout / SOLID / DRY / KISS)

### 1.1 Information Leakage (most important)

A single business decision should live in one module. Today these are duplicated:

- **Free / paid pricing rule** — `src/server/repos/admin-course.ts:128` (create) and `src/server/repos/admin-course.ts:164` (update) both normalize `isFree ↔ price=0`. The action layer pre-defaults the price separately at `src/server/actions/admin-course.ts:46`. → Extract `normalizeCoursePrice()` into a single domain helper.
- **Role normalization** — three implementations: `src/server/auth-session.ts:29` `normalizeRole()`, `src/server/admin/admin-command.ts:35` `requireAdmin()`, `src/server/services/course-authz.ts:19` `canEditCoursePure()`. Plus 15+ raw `role === "admin"` checks in `src/app/learn/**`, `src/app/admin/**`, and `src/app/api/**` that ignore the `isAdmin()` helper at `src/lib/auth-utils.ts:12`. → One `RoleAuthorizer` service, one type guard.
- **Course-status enum** — `"draft" | "published" | "archived"` redefined inline in `src/app/admin/courses/page.tsx`, `src/server/repos/admin-course.ts:8`, and `src/server/actions/admin-course.ts`. → Centralize a `COURSE_STATUS` const + type next to the schema.
- **Enrollment-active rule** — `src/server/repos/enrollment.ts:7-21` (`hasActive`) and `src/server/payments/slip-review-service.ts:49-102` (catches `EnrollmentAlreadyActiveError`) both reason about the same condition. → A single `isEnrollmentActive(...)` predicate.

### 1.2 Shallow Modules / Pass-Through Methods

- `src/server/adapters/free-enrollment-adapter.ts:16` — `createActiveEnrollment()` is a 1:1 wrapper over `EnrollmentRepo.create()` adding `status: "active"`.
- `src/server/adapters/course-grant-adapter.ts:4` — Wraps a single repo call hard-coding `source: "admin_grant"`.
- `src/server/services/slip-notifier.ts:50-160` — Methods are thin pass-throughs into email templates.
- **Container** at `src/server/container.ts:64-172` — Behaves like an object literal of factories. No lazy init, no lifecycle. `R2ObjectStorage` is constructed 4 times; `makeDbAuditLogger()` is recreated on every `slipReview()` call (`container.ts:97`). → Either remove the container or give it real value (singletons + lifecycle).

### 1.3 Mixing Concerns / Wrong Layer

- `src/server/repos/admin-course.ts:128-173` — Repo enforces business invariants (free/paid sync). Repos should be data-only.
- `src/server/admin/admin-command.ts:18-127` — Wraps auth + parsing + authorization in one function. Split authn vs authz.
- `src/components/admin/slip-detail-panel.tsx:1-196` — Accepts a raw slip and formats trust signals + status + rejection reasons inline. → Move presenter logic into a service-level VM (e.g. `slip-detail.presenter.ts`) and pass pre-shaped `SlipDetailVM` into the component.
- `src/components/admin/course-edit-form.tsx:42-107` — Validation, errors, and the API mutation are all inline. → `useCourseEditForm()` hook owning RHF + Zod + mutation; component becomes a renderer.
- `src/components/learn/lesson-player-layout.tsx:73-96` — Inline fetch + mutation for "mark complete". → Extract `useMarkLessonComplete()`.

### 1.4 Repetition (DRY)

- **Form sections** repeat identical scaffolding in `src/app/(student)/account/account-panels.tsx:92-175` (saved/serverError/RHF/toast pattern duplicated for `ProfileSection` and `ChangePasswordSection`). → `useFormSection({ onSuccess, onError })`.
- **Info cards** at `src/components/admin/slip-detail-panel.tsx:125-155` — two near-identical `<div className="rounded-card border ...">` blocks. → `<InfoCard icon title subtitle/>`.
- **Landing-page sections** at `src/app/page.tsx:209-253` — two near-identical `grid.gap-6.md:grid-cols-3` mappings over `STEPS` and `FEATURES`. → `<SectionGrid items renderItem/>`.
- **Repo "select first" pattern** — `rows[0] ?? null` repeated in `enrollment.ts:78`, `course.ts:111`, `admin-course.ts:111`. → `firstOrNull()` helper.
- **Filter SQL builders** — 50+ lines of filter construction duplicated between `src/server/repos/course.ts:69-98` and `src/server/repos/admin-course.ts:50-87`. → `CourseFilterBuilder`.
- **Zod primitives** — `z.string().uuid()` (~20×) and `z.coerce.number().int().min(1).max(100)` repeated. → `src/lib/zod-helpers.ts`.
- **Constants** — Thai year offset `+ 543` (`src/lib/format-time.ts:37,59`), and ms constants `60000 / 3600000 / 86400000` (`format-time.ts:28-30`). → Named constants.

### 1.5 Big Files / Functions (split candidates)

| File | Lines | Recommended split |
|---|---|---|
| `src/components/courses/course-filters.tsx` | 427 | Extract `useCourseFilters()` hook + `MobileFilterDrawer` + `DesktopFilterPanel`. |
| `src/app/(student)/account/account-panels.tsx` | 487 | One file per section (`profile-section.tsx`, `change-password-section.tsx`, `sessions-section.tsx`, `danger-zone.tsx`). |
| `src/app/page.tsx` | 540 | Extract `home/hero`, `home/features`, `home/instructor`, `home/testimonials`. |
| `src/components/admin/slip-detail-panel.tsx` | 332 | `StudentInfoCard`, `PaymentDetailsPanel`, `RejectionSummary`. |
| `src/components/learn/curriculum-sidebar.tsx` | 344 | Pull out `CircularProgress`, `StatusIcon`, `ModuleList`, `LessonItem`. |
| `src/components/admin/tiptap-editor.tsx` | 310 | `EditorToolbar` + `useEditorImageUpload()`. |
| `src/server/repos/admin-course.ts` | 389 | Split into `admin-course-repo.ts`, `admin-module-repo.ts`, `admin-lesson-repo.ts`. |
| `src/server/repos/learn.ts` | 334 | `_getLearnCourse()` (99 lines, lines 72-170) calls resume DB twice (lines 145 and 165-172). Memoize or collapse. |

---

## 2. Business Logic Out of UI

### 2.1 Where it leaks today

- **Slip detail panel** (`src/components/admin/slip-detail-panel.tsx:1-196`) — formats trust signals, maps `REJECT_REASON_LABEL`, derives status from raw rows.
- **Course edit form** (`src/components/admin/course-edit-form.tsx:32-107`) — 8 `useState` calls, manual validation despite RHF being imported.
- **Lesson player** (`src/components/learn/lesson-player-layout.tsx:73-96`) — completion mutation inlined.
- **Account panels** (`src/app/(student)/account/account-panels.tsx:103-113`) — calls `authClient.updateUser()` directly, no error boundary.
- **Slip pending poll** (`src/components/checkout/slip-pending-poll.tsx`) — polling logic in component (the polling rules are sound, but the component owns them).

### 2.2 Recommended pattern

```
component (presentational)
   └── hook (use*Form / use*Mutation)
         └── server action / fetch (DTO in/out)
               └── service (rules)
                     └── repo (drizzle only)
```

Concretely:

1. Components receive **VMs**, not raw rows.
2. Mutations go through `useMutation` with `onSuccess: invalidateQueries` — never raw `fetch` for server state.
3. Forms always `react-hook-form + zodResolver`, server errors via `setError("root.server", ...)`.

---

## 3. State & Cache Management

### Strengths
- Centralized query keys at `src/lib/query-keys.ts` ✓
- Smart polling: `src/components/checkout/slip-pending-poll.tsx:42-66` uses dynamic `refetchInterval` and stops on terminal status — exemplary.
- `src/components/admin/slip-image-viewer.tsx:28-34` aligns `staleTime` to signed-URL TTL (540 s) — exemplary.
- Devtools correctly gated to non-prod (`src/components/providers/query-provider.tsx:25-27`).

### Issues

| File | Issue | Fix |
|---|---|---|
| `src/hooks/use-lesson-progress.ts:39-46` | Fire-and-forget `fetch` for server state; no retry, no error UI. | `useMutation`, `onError` toast. |
| `src/components/admin/use-slip-queue.ts:81-86` | Real-time admin queue inherits the global `staleTime: 60000`. | Override `staleTime: 0`. |
| `src/components/admin/use-slip-queue.ts:150-217` | Cache invalidation via callback chain + `router.refresh()`. | Move into mutation `onSuccess` and target queries with `invalidateQueries({ queryKey: keys.slips.all })`. |
| `src/components/admin/course-edit-form.tsx:32-40` | 8 `useState`s for one form. | RHF + Zod (already a dep). |
| `src/components/courses/course-filters.tsx:82-88` | 5 `useState` + debounce + `isFirstRun` ref + URL sync. | `useCourseFilters()` hook + `useQueryString()` helper. |
| `src/hooks/use-note-preview.ts` | Implemented as a hook but only reads localStorage with no state/effect. | Plain function. |
| `src/hooks/use-curriculum-progress.ts:44` | Custom `lesson-marked-complete` event to notify sidebar. | Replace with TanStack Query invalidation; events bypass the cache and risk drift. |
| `src/app/(student)/account/account-panels.tsx:94-113` | Server errors stored in a separate `useState` next to RHF. | `setError("root.server", ...)`. |

### Zustand
The package is in `dependencies` but **no store is implemented**. Either commit to Zustand for genuinely client-only cross-tree state (e.g. an editor-wide curriculum draft) or remove the dependency.

---

## 4. Big Components → Small Components

Top 6 split targets, in order of payoff:

1. **`src/app/page.tsx` (540 LOC)** — sectionize into `_home/*` files.
2. **`src/app/(student)/account/account-panels.tsx` (487 LOC)** — one file per section + shared `useFormSection`.
3. **`src/components/courses/course-filters.tsx` (427 LOC)** — hook out the filter state; split mobile/desktop UI.
4. **`src/components/learn/curriculum-sidebar.tsx` (344 LOC)** — reduce 9-prop interface to 2 props + a `CurriculumContext`.
5. **`src/components/admin/slip-detail-panel.tsx` (332 LOC)** — 11+ props → `SlipPanelContext`; presenter VM.
6. **`src/components/admin/tiptap-editor.tsx` (310 LOC)** — toolbar component + upload hook.

**Heuristic for this codebase:** any TSX file > 300 LOC, any component with > 8 props, and any component with > 5 `useState` calls is a refactor candidate.

---

## 5. Readable & Reusable Code

### Naming red flags
- `useCurriculumState()` — owns DnD wiring, expansion, selection, AND mutations. Rename `useCurriculumEditor()` and split.
- `SlipDetailData` — bundles payment + trust + rejection. Split into a discriminated union.
- `runSlipAction` — a generic name covering accept/reject/bulk paths. Rename per action; let TanStack mutations replace this entirely.

### Reuse opportunities
- `<InfoCard/>`, `<EmptyState/>`, `<SectionGrid/>` are obvious extractions visible from the duplications above.
- `firstOrNull()`, `paginate()` (already exists ✓), `CourseFilterBuilder`, `useFormSection`, `useQueryString`.

---

## 6. API Routes & Server Actions

### Inconsistent error envelope
- `src/app/api/admin/reencode-video/route.ts:42,48,55,69` returns bare `{ code: "..." }` with HTTP 200.
- `src/app/api/admin/video-status/route.ts:23,39` returns `{ error: "..." }` with HTTP 200.
- → Always `throw new ApiError(...)`; the wrapper at `src/lib/api-route.ts:142-164` already handles status mapping.

### Fat handlers (move to services)
- `src/app/api/admin/lesson-video/route.ts:40-112` — 73 lines of logic.
- `src/app/api/admin/reencode-video/route.ts:27-81` — 54 lines, including ownership re-implementation.
- `src/app/api/webhooks/bunny/route.ts:17-91` — 74 lines of verification + parsing + business calls.

### Duplicated authorization
`requireCourseAccess()` exists in `src/server/admin/admin-command.ts:133-165` and is used by server actions, but **API routes reimplement the same checks inline** (`lesson-video/route.ts:47-60`, `reencode-video/route.ts:30-43`). → `apiCourseRoute()` wrapper to mirror `adminCourseAction()`.

### Missing authorization (HIGH)
- `src/app/api/learn/progress/route.ts:18` — accepts arbitrary `lessonId`; no enrollment check.
- `src/app/api/learn/start/route.ts:16` — same.
- `src/app/api/checkout/[pendingId]/status/route.ts:14` ✓ does verify ownership — use as the template.

### Mixed validation
Most admin routes use Zod, but `src/app/api/slip/upload/route.ts:10-42` validates manually. Use Zod via the FormData branch of `apiRouteRaw`.

### Rate limiting
Bulk admin actions bound to `rateLimitConfigs.checkout` (`bulk-accept/route.ts:12`, `bulk-reject/route.ts:14`). Reconsider — bulk should likely use `.upload` (3/min) or a dedicated `.bulk` profile.

### Route-vs-action duplication
`/api/admin/slips/[slipId]/accept/route.ts` only wraps `acceptSlip()` from `admin-slip.ts:33-38`; same for bulk. Either remove the routes or remove the action — pick one transport.

---

## 7. Tests

### Coverage thresholds (LOW)
`vitest.config.ts` enforces lines 25 / functions 45 / branches 70 / statements 25. For an LMS that handles payments and enrollments, raise to **lines 60 / functions 70 / branches 80 / statements 60**.

### Coverage by area (estimated)
| Area | Files | With tests | Coverage |
|---|---|---|---|
| `src/lib` | ~30 | well-covered | ~70% |
| `src/server/services` | 30 | 8 | ~27% |
| `src/server/repos` | 37 | 1 (`idempotency`) | **~3%** |
| `src/hooks` | 6 | 0 | **0%** |
| `src/components` | 155 | 34 | ~22% |
| `src/app/api` | ~20 | ~10 | ~50% |

**Overall ~35-40%** — well below industry expectation for payment-critical systems.

### Highest-leverage gaps
1. **Repos** — SQL bugs, pagination, filter edges. Start with `course`, `enrollment`, `progress`, `learn`, `slip-repo`.
2. **Hooks** — `use-lesson-progress`, `use-curriculum-progress`, `use-lesson-access` (test with `@testing-library/react`).
3. **Services** — `course-completion`, `course-publish-validator`, `pending-fsm`, `slip-notifier`, `learn-access`, `course-authz`.
4. **E2E gaps** — free enrollment, course completion → certificate generation, refund/unenroll, bulk grant, multi-device resume.

### Quality nitpicks
- `src/lib/api-route.test.ts` uses `as unknown as NextRequest` six times. Build a typed `makeMockRequest()` factory.
- `pending-fsm.test.ts` covers the happy path only — add a state-transition graph test that asserts every illegal transition rejects.

### TypeScript practices ✓
- `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch` enabled.
- 0 instances of `any`, `as any`, `@ts-ignore`, `@ts-expect-error` in `src/`.
- Branded ID types in `src/lib/branded.ts` are well-applied.

---

## 8. Cross-Layer Hygiene

- No client component imports `src/server/db` ✓.
- Server-only utilities not leaking into `"use client"` files ✓.
- Schema types (`PendingEnrollment` etc.) flow through the action layer cleanly.

---

## 9. Prioritized Action Plan

### Sprint 1 — Information leakage & authz (highest value)
1. Centralize role + admin checks (`isAdmin()` everywhere; remove inline `role === "admin"`).
2. Centralize `COURSE_STATUS` enum next to schema; remove inline string unions.
3. Extract `normalizeCoursePrice()` from `admin-course.ts`.
4. Build `apiCourseRoute()` wrapper; migrate `lesson-video`, `reencode-video`, `video-status` routes.
5. Add enrollment ownership check to `/api/learn/progress` and `/api/learn/start`. **(security)**
6. Replace bare `{ code: ... }` returns with `ApiError` in admin video routes.

### Sprint 2 — UI / state cleanup
1. Convert `use-lesson-progress` to `useMutation`; rip out the custom event in favor of query invalidation.
2. Migrate `course-edit-form` to RHF + Zod (already a dep).
3. Split `account-panels.tsx`, `course-filters.tsx`, `slip-detail-panel.tsx`, `curriculum-sidebar.tsx`.
4. `useFormSection`, `useQueryString`, `<InfoCard/>`, `<SectionGrid/>` extractions.
5. Demote `use-note-preview` to a function.

### Sprint 3 — Tests & coverage
1. Raise vitest thresholds incrementally (lines 25 → 40 → 60 over three PRs).
2. Repo unit tests for `course`, `enrollment`, `progress`, `learn`, `slip-repo`.
3. Hook tests for the six files in `src/hooks/`.
4. Playwright: free-enrollment, certificate generation, bulk grant, refund.
5. State-transition test for `pending-fsm`.

### Sprint 4 — Servers & DI
1. Decide on `container.ts`: harden it (singletons, lifecycle) or delete it.
2. Cache `makeDbAuditLogger()` in the container.
3. Split `admin-course.ts` repo by domain (course / module / lesson).
4. Extract `CourseFilterBuilder` shared by `course.ts` and `admin-course.ts` repos.

---

## Appendix — Findings Index

- **Information leakage:** §1.1 (4 cases)
- **Shallow modules / pass-through:** §1.2 (4 cases)
- **Mixing concerns:** §1.3 (5 cases)
- **DRY violations:** §1.4 (7 cases)
- **Big files:** §1.5 (8 files)
- **Business logic in UI:** §2.1 (5 cases)
- **State / cache:** §3 (8 issues)
- **Component splits:** §4 (6 components)
- **Naming:** §5 (3 cases)
- **API design:** §6 (5 categories)
- **Tests:** §7 (5 priority gaps)

**Total: ~60 distinct findings.** Each cites a `file:line`. Severity-weighted, the seven items in Sprint 1 deliver ~70% of the design-quality lift.
