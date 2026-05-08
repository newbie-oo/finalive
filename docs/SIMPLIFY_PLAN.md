# Simplification Plan — Recently-Modified Files

Scope: files touched in the last 5 commits (welcome-hero, course filters
mobile sheet, slip trust signals, course hero poster, dashboard tweaks).
Goal: reduce duplication and nesting **without changing behavior**, then
verify with the existing test suites.

## Files reviewed

| File | Verdict |
|---|---|
| `src/app/(student)/dashboard/page.tsx` | Fix — duplicate phosphor import |
| `src/app/courses/[slug]/page.tsx` | Fix — split imports + 4-deep ternary + redundant boolean |
| `src/components/admin/slip-detail-panel.tsx` | Fix — repeated chip className |
| `src/components/courses/course-filters.tsx` | Fix — duplicated reset blocks + 4-deep ternary |
| `src/components/admin/user-trust-block.tsx` | Clean — leave alone |
| `src/components/course/course-hero-poster.tsx` | Clean — leave alone |
| `src/components/dashboard/welcome-hero.tsx` | Clean — leave alone |
| All four `*.test.tsx` companions | Clean — behavior unchanged, no edits |

## Fix list (already applied)

### 1. `src/app/(student)/dashboard/page.tsx`
- **Problem:** `Info` was imported a second time below the main phosphor
  `ssr` import group.
- **Fix:** Merge `Info` into the existing import block; remove the dup.
- **Risk:** None — same module, same symbol.

### 2. `src/app/courses/[slug]/page.tsx`
- **Problem A:** Server/lib imports were split across two import blocks
  separated by the `STUB_REVIEWS` constant.
- **Fix:** Consolidate into the top import section; keep `STUB_REVIEWS`
  near where it's used (still flagged by the existing `TODO(reviews)`).
- **Problem B:** A 4-level nested ternary computed `durationHours`.
- **Fix:** Extract `formatCourseDuration(totalSeconds)` helper at the
  bottom of the file with guard-clause returns.
- **Problem C:** Redundant `hasPreviewableLesson` boolean shadowed
  `previewHref !== null`.
- **Fix:** Drop the boolean; use `previewHref` directly in the JSX guard
  (`!isEnrolled && !course.isFree && previewHref`).
- **Risk:** None — purely structural; renders identically.

### 3. `src/components/admin/slip-detail-panel.tsx`
- **Problem:** Each of the four `SlipStatusChip` branches repeated the
  same 7-utility-class layout string (`inline-flex items-center gap-1
  rounded-full px-2.5 py-0.5 text-[12px] font-medium`).
- **Fix:** Extract module-level `STATUS_CHIP_BASE` constant; each branch
  now appends only the variant-specific bg/text classes.
- **Risk:** None — output classnames are identical.

### 4. `src/components/courses/course-filters.tsx`
- **Problem A:** The 4-setter "reset to defaults" block was duplicated
  in `handleClear` and 5 branches of `handleQuickFilter`.
- **Fix:** Extract `resetFilters()` closure; `handleClear` calls it
  after clearing `q`; each branch of `handleQuickFilter` now reads as
  "reset, then apply this single facet".
- **Problem B:** A 4-level nested ternary computed `activeQuickFilter`.
- **Fix:** Extract `getActiveQuickFilter(state)` pure helper using guard
  clauses; typed via a `QuickFilterState` interface and the
  `QuickFilterType` alias.
- **Risk:** Behavior preserved — same boolean precedence, same toggle
  semantics for the "free" and "duration" chips. Verified against the
  4 existing tests in `course-filters.test.tsx`.

## Considered but skipped

- **Extract `SlipStatusChip` to its own file.** It's private to the
  panel and ~30 lines; moving it adds an import without payoff.
- **Move `STUB_REVIEWS` to a sibling file.** The `TODO(reviews)`
  comment intentionally flags it as throwaway data.
- **Restructure dashboard "continue learning" header card.** Worthwhile
  but a structural refactor, not a simplification — would risk visual
  diffs.
- **Driver array for `UserTrustBlock` chips.** Functionally identical
  but adds an intermediate type for negligible LOC savings.

## How to test

All edits are behavior-preserving simplifications, so the existing
suites are sufficient — no new tests required.

```bash
# Targeted unit tests for the touched components
bun run vitest run \
  src/components/courses/course-filters.test.tsx \
  src/components/courses/active-filter-chips.test.tsx \
  src/app/courses/\[slug\]/course-tabs.test.tsx \
  src/components/admin/slip-shortcuts-help.test.tsx \
  src/components/admin/user-trust-block.test.tsx \
  src/components/course/course-hero-poster.test.tsx \
  src/components/dashboard/welcome-hero.test.tsx

# Full type-check + lint
bun run tsc --noEmit
bun run lint

# Optional: full suite
bun run test
```

### Manual smoke (Auto mode skips by default)

- `/courses` — open the mobile filter sheet, click each quick-filter
  chip, click "ล้างตัวกรอง". Verify URL updates the same as before.
- `/courses/[slug]` — page renders with duration label
  ("X ชม." for ≥3600s, "X นาที" for <3600s, hidden when 0). Hero
  poster's "preview" CTA shows only when not enrolled and not free.
- `/admin/.../slip` — slip status chips render in all four states
  (accepted / rejected / submitted / fallback) with correct colors.
- `/dashboard` — `Info` icon renders next to the streak tooltip.

## Commit plan

Single commit, since all four edits are the same kind of work:

```
refactor: simplify recently-touched view components

- dashboard: merge duplicate phosphor Info import
- course detail: consolidate imports, extract formatCourseDuration,
  drop redundant hasPreviewableLesson boolean
- slip-detail-panel: extract STATUS_CHIP_BASE constant for chip layout
- course-filters: extract resetFilters closure and getActiveQuickFilter
  helper to remove duplicated reset blocks and a 4-deep ternary

Behavior-preserving. Verified by existing component tests.
```
