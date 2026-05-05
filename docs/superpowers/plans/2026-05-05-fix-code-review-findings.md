# Fix Code Review Findings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 findings from code review of the 4-commit refactor: catch-all error swallowing, missing `updateModule` tests, inverted validation order in `createModuleAction`, and implicit `ADMIN_NAV` derivation.

**Architecture:** No structural changes — targeted fixes within existing modules.

**Tech Stack:** TypeScript, Vitest

---

## File Map

| File                                           | Role                                                       |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `src/server/services/curriculum-admin.ts`      | Fix catch-all `catch` in `reorderModules`/`reorderLessons` |
| `src/server/services/curriculum-admin.test.ts` | Add `updateModule` tests                                   |
| `src/server/actions/admin-curriculum.ts`       | Fix validation order in `createModuleAction`               |
| `src/lib/navigation.ts`                        | Fix implicit `ADMIN_NAV` derivation                        |

---

## Commit 1: Fix Catch-All Error Handling in CurriculumAdminService

**Goal:** Distinguish expected errors (foreign key violation) from unexpected infrastructure errors. Re-throw unexpected errors so they surface as 500s.

**Files:**

- Modify: `src/server/services/curriculum-admin.ts`

### Step 1: Add error classification helper

In `src/server/services/curriculum-admin.ts`, add a helper function near the top (after imports, before interface):

```typescript
function classifyDbError(
  err: unknown,
): "not_found" | "invalid_input" | "unexpected" {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("foreign key") || msg.includes("violates foreign")) {
      return "not_found";
    }
    if (msg.includes("unique constraint") || msg.includes("violates unique")) {
      return "invalid_input";
    }
  }
  return "unexpected";
}
```

### Step 2: Replace catch-all blocks

Replace the `reorderModules` and `reorderLessons` methods:

```typescript
async reorderModules(courseId: string, orderedIds: string[]): Promise<
	{ ok: true } | { ok: false; error: "not_found" | "invalid_input" }
> {
	try {
		await deps.reorderAdminModules(courseId, orderedIds);
		return { ok: true };
	} catch (err) {
		const kind = classifyDbError(err);
		if (kind === "unexpected") throw err;
		return { ok: false, error: kind };
	}
}

async reorderLessons(moduleId: string, orderedIds: string[]): Promise<
	{ ok: true } | { ok: false; error: "not_found" | "invalid_input" }
> {
	try {
		await deps.reorderAdminLessons(moduleId, orderedIds);
		return { ok: true };
	} catch (err) {
		const kind = classifyDbError(err);
		if (kind === "unexpected") throw err;
		return { ok: false, error: kind };
	}
}
```

### Step 3: Verify types compile

```bash
cd /Users/puwanutpansailom/Desktop/learning/second-brain/projects/Finalive/code/finalive-nextjs
npx tsc --noEmit
```

Expected: No errors.

### Step 4: Run service tests

```bash
npx vitest run src/server/services/curriculum-admin.test.ts
```

Expected: All tests still pass (catch-all behavior unchanged for FK/unique errors; unexpected errors now propagate as thrown).

### Step 5: Commit

```bash
git add -A
git commit -m "fix: distinguish expected vs unexpected errors in CurriculumAdminService

- Add classifyDbError() helper: FK violation → not_found, unique → invalid_input,
  everything else → unexpected
- reorderModules and reorderLessons now re-throw unexpected errors instead of
  swallowing them as misleading user-facing messages"
```

---

## Commit 2: Add updateModule Tests

**Goal:** Cover the `updateModule` method on `CurriculumAdminService`.

**Files:**

- Modify: `src/server/services/curriculum-admin.test.ts`

### Step 1: Add describe block

Append this `describe` block to the test file, after the existing `describe("deleteLesson", ...)` block and before the closing `describe("CurriculumAdminService", ...)`:

```typescript
describe("updateModule", () => {
  it("updates a module when it belongs to the course", async () => {
    const deps = fakeDeps({
      getCourseCurriculum: makeCurriculum([
        { id: "m1", title: "A", sortOrder: 0, lessons: [] },
      ]),
    });
    const svc = createCurriculumAdminService(deps);
    const result = await svc.updateModule("c1", "m1", { title: "Updated" });
    expect(result).toEqual({ ok: true });
    expect(deps.updateAdminModule).toHaveBeenCalledWith("m1", {
      title: "Updated",
    });
  });

  it("returns not_found when module does not belong to course", async () => {
    const deps = fakeDeps();
    const svc = createCurriculumAdminService(deps);
    const result = await svc.updateModule("c1", "mX", { title: "Updated" });
    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(deps.updateAdminModule).not.toHaveBeenCalled();
  });

  it("passes the full patch through to the repo", async () => {
    const deps = fakeDeps({
      getCourseCurriculum: makeCurriculum([
        { id: "m1", title: "A", sortOrder: 0, lessons: [] },
      ]),
    });
    const svc = createCurriculumAdminService(deps);
    await svc.updateModule("c1", "m1", { title: "Renamed" });
    expect(deps.updateAdminModule).toHaveBeenCalledWith("m1", {
      title: "Renamed",
    });
  });
});
```

### Step 2: Run service tests

```bash
npx vitest run src/server/services/curriculum-admin.test.ts
```

Expected: 3 new tests pass. Total tests for this file should increase by 3.

### Step 3: Commit

```bash
git add -A
git commit -m "test: add updateModule coverage for CurriculumAdminService

- updateModule calls repo when module belongs to course
- updateModule returns not_found for foreign module
- updateModule passes full patch through unchanged"
```

---

## Commit 3: Fix Validation Order in createModuleAction

**Goal:** Parse and validate `FormData` with Zod BEFORE calling `requireCourseAccess`. Use the validated `courseId`, not the raw `FormData` value.

**Files:**

- Modify: `src/server/actions/admin-curriculum.ts`

### Step 1: Reorder validation in createModuleAction

Find `createModuleAction` and change the body from:

```typescript
export async function createModuleAction(formData: FormData) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const courseId = formData.get("courseId") as string;
	const access = await requireCourseAccess(auth.session, courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	const parsed = createModuleSchema.safeParse({
		courseId,
		title: formData.get("title"),
	});
	if (!parsed.success) return { ok: false, error: "invalid_input" as const };
```

To:

```typescript
export async function createModuleAction(formData: FormData) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const parsed = createModuleSchema.safeParse({
		courseId: formData.get("courseId"),
		title: formData.get("title"),
	});
	if (!parsed.success) return { ok: false, error: "invalid_input" as const };

	const access = await requireCourseAccess(auth.session, parsed.data.courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;
```

### Step 2: Verify types compile

```bash
npx tsc --noEmit
```

Expected: No errors.

### Step 3: Commit

```bash
git add -A
git commit -m "fix: validate FormData before requireCourseAccess in createModuleAction

- Move Zod parsing before requireCourseAccess call
- Use parsed.data.courseId instead of raw formData.get() cast"
```

---

## Commit 4: Fix Implicit ADMIN_NAV Derivation

**Goal:** Make admin nav explicit opt-in instead of implicit inclusion of `"always"` items.

**Files:**

- Modify: `src/lib/navigation.ts`

### Step 1: Change ADMIN_NAV to explicit opt-in

Replace:

```typescript
export const ADMIN_NAV: NavItem[] = [
  { href: "/courses", label: "คอร์ส" },
  { href: "/instructor", label: "ผู้สอน" },
  { href: "/admin", label: "แผงควบคุม" },
];
```

With:

```typescript
export const ADMIN_NAV: NavItem[] = [
  { href: "/courses", label: "คอร์ส", visibility: "always" },
  { href: "/instructor", label: "ผู้สอน", visibility: "always" },
  { href: "/admin", label: "แผงควบคุม", visibility: "admin" },
];
```

Add a comment above it:

```typescript
// Admin nav is explicitly defined (not derived from PUBLIC_NAV) so that
// adding new public routes does not silently inject them into the admin header.
```

### Step 2: Verify types compile

```bash
npx tsc --noEmit
```

Expected: No errors. `ADMIN_NAV` type is still `NavItem[]`; adding `visibility` to items is compatible.

### Step 3: Run full test suite

```bash
npx vitest run
```

Expected: No regressions.

### Step 4: Commit

```bash
git add -A
git commit -m "fix: make ADMIN_NAV explicit opt-in instead of derived filter

- ADMIN_NAV is now hardcoded with explicit visibility flags
- Prevents future public routes from silently appearing in admin nav
- Add comment explaining why it is not derived from PUBLIC_NAV"
```

---

## Self-Review Checklist

### Spec Coverage (Review Findings)

| Finding                                                     | Task     |
| ----------------------------------------------------------- | -------- |
| Catch-all error swallowing in reorderModules/reorderLessons | Commit 1 |
| Missing updateModule tests                                  | Commit 2 |
| Inverted validation order in createModuleAction             | Commit 3 |
| Implicit ADMIN_NAV derivation                               | Commit 4 |

### Placeholder Scan

- [x] No "TBD", "TODO", "implement later"
- [x] All code blocks contain complete, runnable code
- [x] All file paths exact
- [x] No "similar to Task N" references

### Type Consistency

- [x] `classifyDbError` return type matches usage in `reorderModules`/`reorderLessons`
- [x] `updateModule` test signatures match service interface
- [x] `createModuleAction` still returns same discriminated union after reorder
- [x] `ADMIN_NAV` items still satisfy `NavItem` interface

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-05-fix-code-review-findings.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per commit, review between commits

**2. Inline Execution** — Execute all 4 commits in this session using executing-plans

**Which approach?**
