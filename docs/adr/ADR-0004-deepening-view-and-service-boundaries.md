# ADR-0004: Deepening View and Service Boundaries

## Status

Accepted

## Context

After completing ADR-0001 through ADR-0003, our layered architecture (Repository → Service → Controller → View) was structurally sound but still contained several "shallow modules" — single files doing too many unrelated things, and a few client/server boundary violations. Eight specific friction points needed resolution:

1. **`student-dashboard.ts` repo** — one function with 10+ unrelated aggregates (enrollments, watch time, streak, heatmap, activity, certificates). Impossible to test or reuse individually.
2. **`admin-dashboard.ts` repo** — same problem: counts, revenue, and activity all in one file. Revenue had an N+1 query (5 iterations × 2 queries = 10 round trips).
3. **`slip-queue.tsx`** — 230+ lines mixing infinite query logic, selection state, keyboard shortcuts, bulk actions, and UI rendering.
4. **`curriculum-sidebar.tsx`** — inline access-control rules (`!isAdmin && !isEnrolled && !les.isPreview`) scattered across render, plus inline `localStorage` note reading.
5. **`quiz.ts` repo** — contained business logic (`QuizScorer.score`) and used a dynamic `await import()` to avoid circular dependencies, violating the "repo = raw data only" rule.
6. **`auth-session.ts`** — had an inline fallback DB query for user role instead of delegating to a repo.
7. **`CourseCard`** — called `coverImageUrl()` (a server-only function that reads `process.env`) inside a Client Component, causing runtime crashes when env vars were missing during hydration.
8. **`coverImageUrl` in `course.ts` repo** — repos were importing a presentation utility from `@/lib/media-url`, violating the "repo-no-presentation" lint rule.

## Decision

We will deepen each shallow module by splitting it into focused, single-responsibility modules, and we will enforce the **client/server boundary** at the data-type level.

### 1. Split student-dashboard into 5 focused repos

| Repo                    | Responsibility                                       |
| ----------------------- | ---------------------------------------------------- |
| `StudentEnrollmentRepo` | List enrollments with progress counts per course     |
| `WatchTimeRepo`         | Total + weekly watched seconds                       |
| `StreakRepo`            | Distinct dates of lesson progress                    |
| `HeatmapRepo`           | Activity intensity per day (35-day window)           |
| `StudentActivityRepo`   | Recent lessons, quizzes, completions merged + sorted |

The service layer (`student-dashboard.ts`) becomes a pure **orchestrator**: `Promise.all([...])` to fetch from repos, then transform into view models. Each repo is independently testable.

### 2. Split admin-dashboard into 3 focused repos

| Repo             | Responsibility                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `AdminStatsRepo` | Aggregate counts (submitted slips, active enrollments, published courses, revenue MTD, certs MTD) |
| `RevenueRepo`    | Monthly revenue with year-over-year comparison                                                    |
| `ActivityRepo`   | Union of recent enrollments, slip uploads, and certificates                                       |

**N+1 fix**: replaced the loop-based revenue query (5 months × 2 queries) with 2 aggregate `GROUP BY year, month` queries, then bucketed in JavaScript. This reduced round trips from 10 → 2.

### 3. Extract `useSlipQueue` hook

Move all data-fetching and state logic out of `slip-queue.tsx`:

- `useInfiniteQuery` + pagination
- Row selection (`Set<string>`) with visibility filtering
- Keyboard navigation (`j`/`k`, `a` accept, `r` reject, `Space` select, `Escape` clear)
- Action handlers: `accept`, `reject`, `bulkAccept`, `bulkReject`
- URL sync (`?selected=`)

The `SlipQueue` component becomes a thin shell: `const { rows, active, accept, ... } = useSlipQueue({ status, initialSelectedId })`.

### 4. Extract `useLessonAccess` + `useNotePreview` hooks

- `useLessonAccess({ modules, isEnrolled, isAdmin })` → returns `lessonLocked` and `moduleLocked` `Map`s. The access rules (preview/free/admin fallback) live in one place.
- `useNotePreview(lessonId)` → encapsulates `localStorage` key scanning and truncation. Sidebar no longer touches `localStorage` directly.

### 5. Move quiz scoring from repo to `QuizService`

The repo (`quiz.ts`) previously:

1. Fetched questions + correct choices
2. Dynamically imported `QuizScorer`
3. Scored answers
4. Inserted attempt

Now the repo only **reads** (`getCorrectChoices`) and **writes** (`insertQuizAttempt`). `QuizService` orchestrates: fetch → score with statically imported `QuizScorer` → insert → trigger completion check. This removes the dynamic import and keeps business rules in the service layer.

### 6. Extract `UserRepo.getRoleById`

`auth-session.ts` no longer imports `db` or `schema`. Its role fallback delegates to `UserRepo.getRoleById(userId)`.

### 7. Fix `CourseCard` client/server boundary

`PublicCourseSummary` no longer includes `coverImageUrl`. Instead, we introduce `CourseCardData` (extends `PublicCourseSummary` with `coverImageUrl: string | null`).

- **Server Components** (pages) call `coverImageUrl(storageKey)` and pass the resolved string into `CourseCatalog`.
- **Client Components** (`CourseCard`, `CourseListItem`) receive the pre-computed URL as a prop. No env access inside client code.

### 8. Remove `coverImageUrl` from repo layer

`course.ts` repo no longer imports `@/lib/media-url`. `coverImageUrl` is computed at the page/controller layer before passing to view components. This satisfies the architecture lint rule `repo-no-presentation`.

## Consequences

### Positive

- **Testability**: Each repo has a narrow surface area. `RevenueRepo` tests only bucketing logic; `QuizScorer` tests run without DB.
- **Reusability**: `WatchTimeRepo.getTotal` can be reused in analytics or admin dashboards without dragging in streak/heatmap logic.
- **Boundary safety**: `CourseCard` can never crash from missing env vars at runtime because it receives a plain string.
- **No dynamic imports in repos**: `QuizService` uses a static `import { QuizScorer }`, which bundlers can tree-shake and type-check.
- **Consistent hook vocabulary**: `useSlipQueue`, `useLessonAccess`, `useNotePreview` follow the same naming convention and return stable references.

### Negative

- **More files**: 8 new repo files + 3 new hook files. Navigation cost increases slightly, but `adr/ADR-0002.md` already documents the seam rationale.
- **Type proliferation**: `CourseCardData` is an extra type alias. We accept this because the alternative (server-only function in client code) is a runtime error.
- **Page-level enrichment**: Every page using `CourseCard` must now map `coverImageUrl` before passing to the catalog. This is 3 call sites (`/courses`, `/instructor`, home featured section) — acceptable trade-off.

## Migration notes

Files deleted:

- `src/server/repos/admin-dashboard.ts` → replaced by `admin-stats.ts`, `revenue.ts`, `activity.ts`
- `src/server/repos/student-dashboard.ts` → replaced by `student-enrollment.ts`, `watch-time.ts`, `streak.ts`, `heatmap.ts`, `student-activity.ts`

Files with changed public API:

- `src/server/repos/quiz.ts` — removed `submitQuizAttempt`; added `getCorrectChoices` + `insertQuizAttempt`
- `src/server/repos/course.ts` — `PublicCourseSummary` no longer has `coverImageUrl`
- `src/server/auth-session.ts` — no longer imports `db` or `schema`

## References

- `src/server/repos/student-enrollment.ts`, `watch-time.ts`, `streak.ts`, `heatmap.ts`, `student-activity.ts`
- `src/server/repos/admin-stats.ts`, `revenue.ts`, `activity.ts`
- `src/components/admin/use-slip-queue.ts`
- `src/hooks/use-lesson-access.ts`, `use-note-preview.ts`
- `src/server/services/quiz-service.ts`
- `src/components/course/course-card.tsx` — `CourseCardData` interface
- ADR-0002 — Repository Seams and Shared Query Patterns
