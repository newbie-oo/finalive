# Finalive Code Review & Improvement Plan

**Reviewer:** Senior Software Engineer  
**Date:** 2026-05-02  
**Project:** Finalive — Next.js LMS Platform  
**Stack:** Next.js 16.2.4, React 19.2.4, Tailwind v4, Drizzle ORM, Better Auth, PostgreSQL, Bunny.net, Cloudflare R2

---

## Executive Summary

The codebase is **architecturally sound** with good separation of concerns (repos → services → actions → components), solid database schema design with proper constraints, and thoughtful business logic around payments, enrollments, and content access. The developer clearly understands domain modeling and has built defensible abstractions.

**However**, the project is currently **not CI-ready**. Lint errors block builds, the test suite has critical environment misconfigurations, and there are several security edge cases, performance anti-patterns, and React 19 compatibility issues that need immediate attention before this code handles real money and real users.

**Bottom line:** Good bones, sloppy finishing. Fix the blockers in Phase 1 before shipping anything.

---

## Phase 1: BLOCKERS — Fix Before Merge

### 1.1 Test Suite Is Broken (70 failures / 325 tests)

**Severity:** CRITICAL  
**Files:** `vitest.config.ts`, all `*.test.tsx` component tests

**Problem:** Vitest is configured with `environment: "node"` but 14 test files render React components. They all fail with `ReferenceError: document is not defined`.

**Root Cause:**

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    environment: "node",  // ← Wrong. Component tests need jsdom.
```

**Fix:**

- Split into two configs (already partially done with integration config):
  - `vitest.config.ts` → `environment: "jsdom"` for unit tests
  - `vitest.node.config.ts` → `environment: "node"` for pure logic tests (if any)
- Or use workspace config to run both environments in one command.
- Add `jsdom` to devDependencies if not present.
- Update `test-setup.ts` to include cleanup:

```ts
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

afterEach(() => {
  cleanup();
});
```

**Evidence:**

```
Test Files  14 failed | 41 passed (55)
Tests  70 failed | 255 passed (325)
```

All 70 failures are `ReferenceError: document is not defined` in `.test.tsx` files.

---

### 1.2 Lint Errors Block CI (32 errors, 9 warnings)

**Severity:** CRITICAL  
**Evidence:** `pnpm lint` exits with code 1.

**Breakdown:**

| Error                                  | Count      | Location                                          |
| -------------------------------------- | ---------- | ------------------------------------------------- |
| React hooks — setState in effect       | 1          | `course-tabs.tsx:252`                             |
| React hooks — ref access during render | 2          | `encoding-status.tsx:55`, `tiptap-editor.tsx:259` |
| Unused variables                       | 3          | `progress.ts`, `.pi/gsd/hooks/*.js`               |
| `eqeqeq` (`!=` instead of `!==`)       | 1          | `user-account.ts:24`                              |
| `require()` in JS files                | 2          | `.pi/gsd/hooks/*.js`                              |
| `import()` type annotations            | 8 warnings | `api-route.test.ts`                               |
| Type-only import warnings              | 1          | `video-status/route.ts`                           |

**Fixes:**

**a) `src/app/courses/[slug]/course-tabs.tsx:252`**

```tsx
// BEFORE — eslint error: setState in effect
useEffect(() => {
  if (typeof window === "undefined") return;
  if (window.location.hash === "#instructor") {
    setActiveTab("instructor");        // ← BAD: cascading render
    instructorRef.current?.scrollIntoView({...});
  }
}, []);

// AFTER — use initial state + scroll without setState
const [activeTab, setActiveTab] = useState<TabId>(() => {
  if (typeof window !== "undefined" && window.location.hash === "#instructor") {
    return "instructor";
  }
  return "curriculum";
});

useEffect(() => {
  if (activeTab === "instructor") {
    instructorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}, [activeTab]);
```

**b) `src/components/admin/encoding-status.tsx:55`**

```tsx
// BEFORE — ref updated during render
const onReadyRef = useRef(onReady);
onReadyRef.current = onReady; // ← BAD

// AFTER — use useEffect to sync the ref
const onReadyRef = useRef(onReady);
useEffect(() => {
  onReadyRef.current = onReady;
}, [onReady]);
```

**c) `src/components/admin/tiptap-editor.tsx:259`**

```tsx
// BEFORE — addImage is a function defined in render scope
{btn(false, addImage, ...)}  // ← triggers react-hooks/refs

// AFTER — wrap in useCallback or move definition outside render flow
const addImage = useCallback(() => { ... }, [editor, isUploading]);
// Then: {btn(false, addImage, ...)}
```

**d) `src/server/actions/user-account.ts:24`**

```ts
// BEFORE
a.password != null; // ← eqeqeq error

// AFTER
a.password !== null && a.password !== undefined;
```

**e) `src/server/repos/progress.ts`**

```ts
// BEFORE — unused imports
import { and, eq } from "drizzle-orm";

// AFTER
import { eq } from "drizzle-orm";
// or: import { and as _and, eq } if `and` is genuinely needed later
```

**f) `.pi/gsd/hooks/*.js`** — These are GSD agent hooks, not app code. Either:

- Add `eslint.config.mjs` ignore pattern for `.pi/`
- Or add `/* eslint-disable */` headers since they're not production code

```js
// eslint.config.mjs
export default [
  // ...existing config
  {
    ignores: [".pi/**", ".next/**", "node_modules/**"],
  },
];
```

---

### 1.3 Type Assertions on SessionUser Instead of Proper Typing

**Severity:** HIGH  
**Files:** `src/app/api/learn/start/route.ts`, `src/app/api/learn/progress/route.ts`

**Problem:** Both routes cast `user` to check role instead of using the typed `SessionUser`:

```ts
if ((user as { role?: string }).role === "admin") { ... }
```

This is a code smell. The `requireSession()` function already returns `SessionContext` with `user.role: Role` ("admin" | "user"). The cast suggests either:

1. Better Auth's `user` type doesn't include `role`, or
2. There's a mismatch between `SessionUser` and what `requireSession` actually returns.

**Fix:**
In `auth-session.ts`, the `getSession()` function does a DB fallback for role. Ensure `requireSession()` propagates the full `SessionUser` type. Then simply use:

```ts
if (user.role === "admin") { ... }
```

If Better Auth's `result.user` doesn't include `role`, the current DB fallback is correct but the return type should still be `SessionUser` after normalization. Verify the type pipeline.

---

### 1.4 Missing Rate Limiting on Learning Progress APIs

**Severity:** HIGH  
**Files:** `src/app/api/learn/start/route.ts`, `src/app/api/learn/progress/route.ts`

**Problem:** These endpoints are called on every lesson page load and video progress update. No rate limiting means:

- A malicious script can spam progress updates
- Database can be flooded with upserts
- Admin preview detection is bypassable

**Fix:** Apply the existing `checkRateLimit` utility:

```ts
import {
  checkRateLimit,
  getClientIP,
  rateLimitConfigs,
} from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limit = checkRateLimit(
    getClientIP(req),
    "/api/learn/progress",
    rateLimitConfigs.api,
  );
  if (!limit.allowed) {
    return NextResponse.json({ code: "rate_limited" }, { status: 429 });
  }
  // ...rest
}
```

**Note:** The in-memory rate limiter is fine for single-instance deploys but **will not work** on Vercel (serverless, multi-region). Document this in `docs/deploy-checklist.md` and plan for Redis-backed rate limiting before production scaling.

---

### 1.5 React 19 Ref Safety Violations

**Severity:** HIGH  
**Files:** `encoding-status.tsx`, `tiptap-editor.tsx`

React 19 is stricter about ref access during render. The ESLint `react-hooks/refs` rule is catching real bugs that will cause runtime issues.

See fixes in section 1.2(b) and 1.2(c) above.

---

## Phase 2: HIGH PRIORITY — Security & Correctness

### 2.1 `getCourseCurriculum` Loads ALL Lessons (Performance Bug)

**Severity:** HIGH  
**File:** `src/server/repos/course.ts`

**Problem:**

```ts
const lessons = await db
  .select({...})
  .from(lesson)
  .where(isNull(lesson.deletedAt))   // ← Missing: eq(lesson.moduleId, ...)
  .orderBy(asc(lesson.sortOrder));
```

This loads **every lesson in the database** into memory, then filters in JS via `byModule.get(l.moduleId)`. On a platform with 1000 lessons, this fetches 1000 rows to display 10.

**Fix:**

```ts
const moduleIds = modules.map(m => m.id);
const lessons = await db
  .select({...})
  .from(lesson)
  .where(and(isNull(lesson.deletedAt), inArray(lesson.moduleId, moduleIds)))
  .orderBy(asc(lesson.sortOrder));
```

---

### 2.2 Bunny Webhook Doesn't Validate Payload Schema

**Severity:** MEDIUM-HIGH  
**File:** `src/app/api/webhooks/bunny/route.ts`

**Problem:** The webhook parses JSON and accesses fields without schema validation:

```ts
const payload = JSON.parse(rawBody) as BunnyWebhookPayload;
```

An attacker sending malformed payload shapes could cause runtime errors or logic bypasses.

**Fix:** Add Zod validation:

```ts
const bunnyWebhookSchema = z.object({
  VideoLibraryId: z.number().optional(),
  VideoGuid: z.string().uuid().optional(),
  Status: z.number().optional(),
  Length: z.number().optional(),
  Title: z.string().optional(),
});

const parsed = bunnyWebhookSchema.safeParse(JSON.parse(rawBody));
if (!parsed.success)
  return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
```

---

### 2.3 Admin Video Status Route Leaks Bunny API Errors to Client

**Severity:** MEDIUM  
**File:** `src/app/api/admin/video-status/route.ts`

**Problem:**

```ts
return NextResponse.json(
  { error: `Bunny API error: ${res.status} ${text}` },
  { status: 502 },
);
```

Bunny error responses might contain sensitive metadata. Admin routes should log full errors server-side and return generic messages to clients.

**Fix:**

```ts
logger.error("bunny.status_fetch_failed", {
  videoId,
  status: res.status,
  body: text,
});
return NextResponse.json({ error: "upstream_error" }, { status: 502 });
```

---

### 2.4 Certificate Completion Service Has No Transaction Isolation

**Severity:** MEDIUM-HIGH  
**File:** `src/app/api/learn/progress/route.ts`

**Problem:** The `CourseCompletionService.handleLessonComplete()` does multiple DB operations (mark complete, check course complete, issue certificate, send email) but the route doesn't wrap them in a transaction. Concurrent completion of the last two lessons could double-issue certificates.

**Fix:** Pass a transaction context into the service or wrap the handler:

```ts
const result = await db.transaction(async (tx) => {
  const service = new CourseCompletionService({...deps using tx...});
  return service.handleLessonComplete({...});
});
```

---

### 2.5 Inconsistent API Route Error Handling

**Severity:** MEDIUM  
**Files:** Various API routes

**Problem:** Some routes use the excellent `apiRoute()` wrapper (`src/lib/api-route.ts`) with declarative auth, body validation, and consistent error formatting. Others manually handle everything with duplicated logic.

**Routes using wrapper:** `api/admin/slips/route.ts`, `api/learn/progress` (partial)  
**Routes NOT using wrapper:** `api/admin/slips/[slipId]/accept/route.ts`, `api/admin/video-status/route.ts`, `api/webhooks/bunny/route.ts`, `checkout/start/route.ts`

**Fix:** Migrate manual routes to `apiRoute()` wrapper. The `checkout/start` route is a POST that returns a redirect, so it needs the wrapper's `handler` to return `NextResponse` directly — which the wrapper already supports.

---

### 2.6 `purgeUserData` Has Race Condition

**Severity:** MEDIUM  
**File:** `src/server/auth.ts`

**Problem:** The `beforeDelete` hook runs multiple independent DB operations without a transaction:

```ts
async function purgeUserData(userId: string): Promise<void> {
  await db.update(enrollment).set(...).where(...);
  await db.update(pendingEnrollment).set(...).where(...);
  await db.delete(quizAttempt).where(...);
  await db.delete(lessonProgress).where(...);
}
```

If the process crashes mid-purge, the user row gets deleted (Better Auth handles that) but app data is partially purged.

**Fix:** Wrap in a transaction:

```ts
async function purgeUserData(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(enrollment)...;
    await tx.update(pendingEnrollment)...;
    await tx.delete(quizAttempt)...;
    await tx.delete(lessonProgress)...;
  });
}
```

---

## Phase 3: MEDIUM PRIORITY — Architecture & Maintainability

### 3.1 Hardcoded Instructor Data in UI

**Severity:** MEDIUM  
**Files:** `src/app/courses/[slug]/page.tsx`, `src/app/courses/[slug]/course-tabs.tsx`

**Problem:** Instructor name, bio, stats, and YouTube link are hardcoded:

```tsx
<div className="inline-flex h-10 w-10 ...">อา</div>
<div className="text-ui font-semibold">อ.อาร์ม</div>
<div>นักวิเคราะห์การเงิน · CFA Charterholder</div>
```

This is fine for an MVP but needs to be data-driven before adding a second instructor. The `course` table has `ownerUserId` — use it to fetch instructor profile data.

**Recommendation:** Add a `user.bio`, `user.title`, `user.socialLinks` JSONB column or a separate `instructorProfile` table. The course page should join on `ownerUserId`.

---

### 3.2 `publicUrl` Utility Called with Potentially Null Values

**Severity:** MEDIUM  
**Files:** `src/lib/media-url.ts` (implied), `src/app/courses/[slug]/page.tsx`

**Problem:**

```tsx
<Image
  src={coverImageUrl(course.coverStorageKey)!}  // ← Non-null assertion
```

The `!` suppresses TypeScript's safety. If `coverStorageKey` is null (which it can be per the schema), this will pass `null` to Next.js Image and crash.

**Fix:**

```tsx
{course.coverStorageKey && (
  <Image src={coverImageUrl(course.coverStorageKey)} ... />
)}
```

---

### 3.3 Missing Input Sanitization on Tiptap Content

**Severity:** MEDIUM  
**Files:** `src/components/admin/tiptap-editor.tsx`, `src/components/admin/simple-tiptap-editor.tsx`

**Problem:** Tiptap outputs HTML. The database stores `bodyMd` (misleading name — it stores HTML from Tiptap). While `isomorphic-dompurify` is in dependencies, verify it's actually used before rendering lesson content.

**Check:** In `src/lib/markdown.tsx`, ensure HTML content runs through DOMPurify:

```tsx
import DOMPurify from "isomorphic-dompurify";
// ...
const sanitized = DOMPurify.sanitize(htmlString);
```

If the `MarkdownView` component auto-detects HTML by leading `<` but doesn't sanitize, this is an XSS vector.

---

### 3.4 Course Tabs Test Uses Wrong Default Tab Assertion

**Severity:** LOW-MEDIUM  
**File:** `src/app/courses/[slug]/course-tabs.test.tsx`

**Problem:** One test asserts "renders learning outcomes by default" but the component's default tab is `"curriculum"`. The learning outcomes section renders _above_ the tabs unconditionally. This test is testing the wrong thing — it's not actually testing tab behavior.

**Fix:** Rename test to "renders learning outcomes section" and add actual tab state tests:

```ts
it("defaults to curriculum tab", () => {
  render(<CourseTabs ... />);
  expect(screen.getByRole("tab", { selected: true })).toHaveTextContent("เนื้อหา");
});
```

---

### 3.5 `use client` Overuse

**Severity:** LOW  
**Files:** Various components

**Problem:** Several components are marked `"use client"` but could be Server Components:

- `CourseCard` — only uses props, no state/effects
- `StatusChip` — pure presentational
- `EmptyState` — pure presentational
- `LessonAccessBadge` — pure presentational

**Fix:** Audit all `"use client"` directives. Remove from components that don't use hooks, browser APIs, or event handlers. This reduces client bundle size and improves initial render performance.

---

### 3.6 Logger Doesn't Propagate Request IDs Across Async Boundaries

**Severity:** LOW-MEDIUM  
**File:** `src/lib/logger.ts`

**Problem:** The logger supports `withContext()` but most server code doesn't use it. Request IDs from `apiRoute()` don't flow into service-layer logs.

**Fix:** Consider using AsyncLocalStorage for implicit request context propagation:

```ts
import { AsyncLocalStorage } from "node:async_hooks";

const requestStore = new AsyncLocalStorage<{
  requestId: string;
  userId?: string;
}>();

export function loggerWithRequest() {
  const ctx = requestStore.getStore();
  return ctx ? logger.withContext(ctx) : logger;
}
```

Then wrap request handlers:

```ts
return requestStore.run({ requestId: rid, userId: user?.id }, async () => {
  return options.handler({ req, user, body, query });
});
```

---

### 3.7 `@radix-ui` Monolith Import

**Severity:** LOW  
**File:** `package.json`

**Problem:**

```json
"radix-ui": "^1.4.3"
```

This imports the entire Radix UI monorepo. Shadcn/ui components typically import individual packages (`@radix-ui/react-dialog`, etc.). The monolith bloats `node_modules` and may cause resolution issues.

**Fix:** Audit which Radix primitives are actually used and replace with individual packages. Or verify tree-shaking handles it (Next.js usually does, but it's still messy).

---

## Phase 4: LOW PRIORITY — Polish & Future-Proofing

### 4.1 i18n Strings Hardcoded in Thai

**Severity:** LOW  
**Files:** Throughout UI components

**Problem:** All user-facing strings are hardcoded Thai. No i18n framework is set up. If the platform ever needs English support, this will require a massive refactor.

**Recommendation:** Consider adding `next-intl` or similar early, even if only Thai is supported initially. Extract at least the repeated UI strings ("บทเรียน", "ผู้เรียน", etc.) to a messages file.

---

### 4.2 `noUncheckedIndexedAccess` Partially Defeated by Assertions

**Severity:** LOW  
**Files:** Throughout

**Problem:** `tsconfig.json` enables `noUncheckedIndexedAccess: true` (excellent choice), but code frequently uses `!` to suppress it:

```ts
const [row] = await db.select(...).limit(1);
return row!.id;  // ← Defeats the safety
```

**Better pattern:**

```ts
const [row] = await db.select(...).limit(1);
if (!row) throw new ApiError("not_found", ...);
return row.id;
```

This is already done in most places, but some slip through.

---

### 4.3 Missing `loading.tsx` on Several Routes

**Severity:** LOW  
**Files:** `app/courses/page.tsx`, `app/checkout/[pendingId]/page.tsx`

**Problem:** Routes that fetch data should have `loading.tsx` files to show skeleton states during data fetching. Without them, users see a blank page while DB queries run.

**Fix:** Add skeleton `loading.tsx` files for all data-fetching routes.

---

### 4.4 `force-dynamic` Overuse

**Severity:** LOW  
**Files:** `app/learn/[courseSlug]/[lessonId]/page.tsx`

**Problem:**

```ts
export const dynamic = "force-dynamic";
```

This disables all static optimization for the lesson page. While user-specific data requires dynamic rendering, consider:

- Using `unstable_cache` for the course curriculum (same for all users)
- Only marking truly user-specific parts as dynamic
- Using `generateStaticParams` for published course slugs

---

### 4.5 Dependency Version Pinning

**Severity:** LOW  
**File:** `package.json`

**Problem:** Some dependencies use `^` but are critical infrastructure:

- `next: "16.2.4"` — pinned, good
- `better-auth: "^1.6.9"` — caret, risky for auth
- `drizzle-orm: "^0.36.4"` — caret, risky for DB layer

**Fix:** Pin critical dependencies with exact versions. Use `pnpm update --interactive` for controlled updates.

---

### 4.6 Docker Compose Missing Health Checks

**Severity:** LOW  
**File:** `docker-compose.yml`

**Problem:** No health checks defined for PostgreSQL or MinIO services. Local development can fail silently if services aren't ready when the app starts.

**Fix:**

```yaml
services:
  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
```

---

## Phase 5: Testing Strategy Improvements

### 5.1 Test Coverage Gaps

**Current:** 325 tests, but missing coverage for:

- Bunny webhook signature verification (only happy path tested?)
- Rate limiter edge cases (bucket eviction, burst behavior)
- Certificate issuance flow end-to-end
- File upload virus/malware scenarios (file sniff is tested, but not the upload route)
- Concurrent slip submission race condition
- Admin grant/revoke flows

### 5.2 E2E Tests

**Current:** Playwright config exists but verify coverage:

- Critical user journey: register → browse course → enroll → upload slip → admin accept → learn → complete → certificate
- Payment flow (the most business-critical path)
- Admin dashboard CRUD operations

### 5.3 Integration Test Database Hygiene

**Current:** `vitest.integration.config.ts` uses `pool: "forks"` with `singleFork: true` and `fileParallelism: false`. This is correct for avoiding TRUNCATE races, but slow.

**Future:** Consider `testcontainers` for per-test database isolation, or at least per-file database schemas.

---

## Action Checklist

### Week 1: Unblock CI

- [ ] Fix vitest config: add jsdom environment for component tests
- [ ] Fix all 32 lint errors (see Phase 1.2 for per-file fixes)
- [ ] Fix `user-account.ts` eqeqeq violation
- [ ] Add `.pi/` to eslint ignore or add disable headers
- [ ] Run `pnpm check` and verify all green

### Week 2: Security & Correctness

- [ ] Fix `getCourseCurriculum` to filter lessons by module ID in SQL
- [ ] Add Zod validation to Bunny webhook
- [ ] Wrap `purgeUserData` in transaction
- [ ] Add rate limiting to `/api/learn/start` and `/api/learn/progress`
- [ ] Fix type assertion on session user role
- [ ] Wrap certificate completion in transaction

### Week 3: Architecture

- [ ] Migrate remaining manual API routes to `apiRoute()` wrapper
- [ ] Audit and remove unnecessary `"use client"` directives
- [ ] Fix `coverImageUrl()` null safety
- [ ] Verify DOMPurify is applied to all rendered HTML content
- [ ] Add `loading.tsx` skeletons for data routes

### Week 4: Polish

- [ ] Instructor data model (db schema + queries)
- [ ] AsyncLocalStorage for request context logging
- [ ] Replace `@radix-ui` monolith with individual packages
- [ ] Pin critical dependency versions
- [ ] Add Docker health checks

---

## Positive Acknowledgments

These are done well and should be preserved:

1. **Environment validation** — `getEnv()` with Zod schema and build-phase fallbacks is excellent
2. **Database schema** — Proper constraints, partial indexes, check constraints, soft deletes
3. **Idempotency** — Slip upload uses idempotency keys correctly
4. **Auth layering** — Middleware + page-level + API-level auth with defense in depth
5. **FSM for statuses** — `pending-fsm.ts` centralizes state transition logic
6. **Repo pattern** — Clean separation between DB access and business logic
7. **Service dependency injection** — Tests can fake deps easily
8. **Audit logging** — Every significant action is auditable
9. **Email templates** — React Email with test coverage
10. **Rate limiter comments** — Honest about single-instance limitations

---

## Final Verdict

| Category        | Grade | Notes                                                      |
| --------------- | ----- | ---------------------------------------------------------- |
| Architecture    | A     | Clean layers, good DI, sensible abstractions               |
| Database Design | A     | Constraints, indexes, soft deletes, checks                 |
| Security        | B+    | Good auth, missing rate limits on some endpoints           |
| Type Safety     | B+    | `noUncheckedIndexedAccess` enabled, some `!` suppression   |
| Testing         | C     | Good test count, broken environment, needs E2E coverage    |
| Code Quality    | C+    | 32 lint errors, React 19 ref issues, inconsistent patterns |
| Performance     | B     | One N+1-ish query bug, otherwise fine                      |
| DevOps/CI       | D     | Lint and tests both failing — **not shippable**            |

**Get Phase 1 done this week. Everything else can wait, but broken CI is a hard stop.**
