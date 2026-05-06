---
status: accepted
date: 2026-05-06
---

# ADR-0002: Deepen Modules and Establish Repository Seams

## Status

accepted

## Context

After ADR-0001 established the service layer, we identified that several modules were still **shallow** — their interfaces were nearly as complex as their implementations — and some services still embedded raw Drizzle queries despite claiming dependency injection. The codebase had these specific friction points:

- `SlipReviewService` and `SlipUploadService` accepted `notifier` and `auditLogger` via DI, but performed raw `db.select`, `db.insert`, and `db.transaction` inline — making them untestable without a real database.
- `audit-logger.ts` was a pass-through wrapper around `audit.ts` with zero added abstraction.
- API routes hand-rolled auth, validation, and error formatting despite an existing `apiRoute` wrapper.
- `CurriculumModule` assembly logic was duplicated across `course.ts`, `admin-course.ts`, and `learn.ts`.
- Every admin action repeated the same auth → access check → parse → revalidate scaffold.
- `quiz.ts` repo embedded scoring business rules inside Drizzle queries.

We needed a pattern to make the **repository seam real** (not hypothetical) and to extract **deep modules** that concentrate complexity behind small interfaces.

## Decision

### 1. Repository objects are the only place that imports `db`

All data access — selects, inserts, updates, transactions — lives in repository modules. Services receive repositories through their dependency interfaces. This makes the repository seam **real** (we can inject a fake repo in tests, not mock Drizzle).

```
Service (business rules + orchestration)
  → Repository (data access, thin SQL mapping)
    → db client (Drizzle)
```

**Rules:**

- A repository is a plain object with async methods, not a class.
- Repositories return domain types, not raw schema rows (mapping happens in the repo).
- A repository owns a single aggregate or closely related aggregates (e.g. `SlipRepo` owns slip + pending + media for upload flow).
- Services must not import `db`, `@/db/schema/*`, or `drizzle-orm`.

### 2. Shallow modules are deleted, not kept

If a module's interface is as complex as the code it wraps, delete it and let callers use the underlying module directly. Only re-introduce a wrapper when it adds real behavior (batching, caching, context enrichment, async fire-and-forget).

### 3. Higher-order wrappers for cross-cutting orchestration

Repeated scaffold (auth → access → parse → revalidate) is extracted into higher-order functions (`adminAction`, `adminCourseAction`). The handler receives a context object and focuses purely on business logic.

### 4. API routes use declarative wrappers

All API routes use `apiRoute` or `apiRouteRaw` from `lib/api-route.ts`. These wrappers handle auth, rate limiting, Zod validation, request ID tracing, and error formatting. Route handlers focus on body parsing (for FormData) or direct delegation.

### 5. Single source of truth for shared queries

When the same query shape is used by multiple views (public, admin, learn), extract it into a shared repository function with a superset return type. Each view maps to its own narrower type at the call site.

## Consequences

### Positive

- **Real seams for testing.** `SlipReviewService` tests now mock `SlipRepo` — no Drizzle mocking, no transaction mocking, no call-order tracking. Tests run in milliseconds and are resilient to query rewrites.
- **Locality.** A bug in curriculum assembly is fixed in `curriculum-repo.ts` only. A bug in quiz scoring is fixed in `quiz-scorer.ts` only.
- **Deletion test passes.** Removing `audit-logger.ts` did not scatter complexity — callers simply import `audit.ts` directly. Removing `admin-command.ts` helpers would scatter auth boilerplate, so they earn their keep.
- **Framework independence reinforced.** API routes are thin declarative shells; business logic is in services; data access is in repos. Any layer can be tested in isolation.

### Negative

- **More repository files.** Each domain now has a repo file alongside its service file. For small domains this feels like overhead.
- **Repository interface must stay in sync with service needs.** When a service needs a new query, the repo must be updated first. This adds one file touch per new data requirement.
- **Superset types in shared repos.** `CurriculumLesson` returns admin-only fields (`bodyMd`, `videoMediaId`) that public/learn views ignore. This is acceptable because the alternative is query duplication.

## Validation

- `SlipRepo` extracted from `SlipReviewService` and `SlipUploadService` — both services now have zero `db` imports; 8 unit tests cover all paths with mocked repo.
- `audit-logger.ts` deleted — `audit.ts` now exports `AuditLogger` interface and `makeDbAuditLogger` directly; all 5 call sites updated.
- `adminAction`/`adminCourseAction` wrappers extracted — 6 admin actions reduced from ~15 lines of scaffold to ~5 lines of handler.
- `apiRoute` wrapper extended with `rateLimit` option — 4 API routes standardized; `admin/slips/*` routes still pending migration.
- `curriculum-repo.ts` created as single source of truth — `course.ts`, `admin-course.ts`, `learn.ts` all delegate tree assembly; 3 duplicate query blocks removed.
- `QuizScorer` extracted from `quiz.ts` repo — scoring logic is now a pure function; repo handles only data access.

## References

- `src/server/payments/slip-repo.ts`
- `src/server/payments/slip-review-service.ts`
- `src/server/payments/slip-upload-service.ts`
- `src/server/repos/curriculum-repo.ts`
- `src/server/services/quiz-scorer.ts`
- `src/server/admin/admin-command.ts`
- `src/lib/api-route.ts`
- `src/server/services/audit.ts`
- `docs/superpowers/plans/2026-05-06-prevent-tech-debt-round-2.md`
