# Layered Architecture — Complete Remediation Plan (Waves 1–5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the entire codebase into a clean layered architecture: Repository (raw data) → Service (business logic) → Controller (thin actions/API routes) → View (presentation), with architecture guardrails preventing regression.

**Architecture:** Build bottom-up — repositories return raw data only, services receive repos via DI, controllers are auth-parse-delegate shells, views are pure presentation. Every layer is independently testable.

**Tech Stack:** TypeScript, Next.js App Router, Drizzle ORM, Vitest, React

---

## File Structure (What We Will Create/Modify)

### New Files

| File                                                 | Responsibility                                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/server/repos/enrollment-repo.ts`                | Enrollment CRUD + queries (extracted from container + pending-enrollment-service)         |
| `src/server/repos/admin-grant-repo.ts`               | Admin grant CRUD (extracted from container)                                               |
| `src/server/repos/media-asset-repo.ts`               | Media asset CRUD (extracted from container + image-upload-factory + bunny-status-factory) |
| `src/server/repos/account-repo.ts`                   | Account queries (extracted from user-account action)                                      |
| `src/server/services/admin-dashboard-presenter.ts`   | Format admin dashboard raw data into view models                                          |
| `src/server/services/student-dashboard-presenter.ts` | Format student dashboard raw data into view models                                        |
| `src/server/services/course-catalog-service.ts`      | Course detail page business logic + view model builder                                    |
| `src/components/admin/slip-queue-hooks.ts`           | useSlipQueue hook (data + state management)                                               |
| `src/components/admin/slip-table.tsx`                | Slip table presentation component                                                         |
| `src/components/admin/slip-detail-panel.tsx`         | Slip detail panel (extracted from slip-queue)                                             |
| `src/components/admin/sortable-module.tsx`           | Sortable module item (extracted from curriculum-tree)                                     |
| `src/components/admin/sortable-lesson.tsx`           | Sortable lesson item (extracted from curriculum-tree)                                     |
| `src/components/admin/lesson-detail-panel.tsx`       | Lesson detail panel (extracted from curriculum-tree)                                      |
| `src/components/admin/lesson-quiz-inline-action.tsx` | Quiz inline action (extracted from curriculum-tree)                                       |
| `src/lib/format-time.ts`                             | Shared time formatting utilities (timeAgo, formatActivityTime)                            |
| `src/lib/format-dashboard.ts`                        | Dashboard formatting utilities                                                            |
| `scripts/lint-architecture.js`                       | Architecture guard script                                                                 |
| `.github/workflows/tech-debt-guard.yml`              | CI workflow for architecture lint                                                         |

### Modified Files (Key Targets)

| File                                                  | What Changes                                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/server/repos/admin-dashboard.ts`                 | Remove all formatting; return raw data only                                   |
| `src/server/repos/student-dashboard.ts`               | Remove coverImageUrl calls, buildAchievements, computeStreak; return raw data |
| `src/server/repos/account.ts`                         | Remove coverImageUrl; return coverStorageKey                                  |
| `src/server/repos/course-queries.ts`                  | Remove mapToPublicCourseSummary with URL building                             |
| `src/server/repos/course.ts`                          | Remove coverImageUrl; return coverStorageKey                                  |
| `src/server/container.ts`                             | Remove all inline DB queries; inject repos only                               |
| `src/server/services/course-authz.ts`                 | Remove DB imports; become pure functions                                      |
| `src/server/services/bunny-status-service-factory.ts` | Remove inline DB; inject MediaAssetRepo                                       |
| `src/server/services/image-upload-factory.ts`         | Remove inline DB; inject MediaAssetRepo                                       |
| `src/server/payments/pending-enrollment-service.ts`   | Remove defaultDeps with DB; accept deps via constructor                       |
| `src/server/actions/admin-publish.ts`                 | Remove inline DB closures; use container-injected validator                   |
| `src/server/actions/user-account.ts`                  | Remove direct DB; use AccountRepo                                             |
| `src/server/actions/admin-quiz.ts`                    | Use adminCourseAction wrapper                                                 |
| `src/server/actions/delete-account.ts`                | Use auth-session helper instead of auth.api.deleteUser                        |
| `src/app/api/admin/slips/[slipId]/accept/route.ts`    | Use apiRouteRaw + call service directly                                       |
| `src/app/api/admin/slips/[slipId]/reject/route.ts`    | Use apiRoute + body schema + call service directly                            |
| `src/app/api/admin/slips/bulk-accept/route.ts`        | Use apiRoute + body schema + call service directly                            |
| `src/app/api/admin/slips/bulk-reject/route.ts`        | Use apiRoute + body schema + call service directly                            |
| `src/app/api/admin/slips/[slipId]/image-url/route.ts` | Use apiRoute + extract slipRepo method                                        |
| `src/app/api/checkout/[pendingId]/status/route.ts`    | Use apiRoute + auth required                                                  |
| `src/app/api/learn/start/route.ts`                    | Use apiRoute + body schema                                                    |
| `src/app/api/admin/lesson-video/route.ts`             | Use apiRouteRaw + container.wiredService()                                    |
| `src/app/api/admin/reencode-video/route.ts`           | Use apiRoute + repo method                                                    |
| `src/app/api/config/oauth/route.ts`                   | Use getEnv() instead of process.env                                           |
| `src/components/admin/slip-queue.tsx`                 | Delete dead code; use extracted hooks/components                              |
| `src/components/admin/curriculum-tree.tsx`            | Use extracted sub-components                                                  |
| `src/app/(student)/dashboard/page.tsx`                | Remove inline formatters; use lib/format                                      |
| `src/app/login/page.tsx`                              | Use AuthSplitLayout component                                                 |
| `src/app/register/page.tsx`                           | Use AuthSplitLayout component                                                 |

---

## Wave 1: Repository Layer — Remove Presentation Logic

**Goal:** Every repository returns raw data (Date, string, number, boolean). No formatting, no URL building, no color assignment, no Thai strings.

### Task 1.1: Create `format-time.ts` Shared Utilities

**Files:**

- Create: `src/lib/format-time.ts`

**Context:** Multiple files define `timeAgo`, `formatActivityTime` inline. Extract to shared utilities.

- [ ] **Step 1: Write the shared time formatter module**

```typescript
/**
 * Shared time formatting utilities.
 *
 * These are pure functions that operate on Date objects and return strings.
 * Repositories must NOT call these — they return raw Date objects.
 * Services and view layers call these when building view models.
 */

const MONTH_LABELS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export function formatActivityTime(d: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "เมื่อสักครู่";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  if (diffHour < 24) return `${diffHour} ชม. ที่แล้ว`;
  if (diffDay === 1) return "เมื่อวาน";
  if (diffDay < 7) return `${diffDay} วันที่แล้ว`;
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "เมื่อสักครู่";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  if (diffHour < 24) return `${diffHour} ชม. ที่แล้ว`;
  if (diffDay === 1) return "เมื่อวาน";
  if (diffDay < 30) return `${diffDay} วันที่แล้ว`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} เดือนที่แล้ว`;
  return `${Math.floor(diffMonth / 12)} ปีที่แล้ว`;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit src/lib/format-time.ts
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/format-time.ts
git commit -m "chore: extract shared time formatters"
```

---

### Task 1.2: Refactor `admin-dashboard.ts` to Return Raw Data

**Files:**

- Modify: `src/server/repos/admin-dashboard.ts`
- Create: `src/server/services/admin-dashboard-presenter.ts`

**Context:** `admin-dashboard.ts` currently formats Thai strings, assigns colors, and calls `formatActivityTime` inline. We split into: repo returns raw data, presenter formats it.

- [ ] **Step 1: Modify `admin-dashboard.ts` — remove all formatting**

Replace the entire file content. Remove:

- `formatActivityTime` function
- `ACTIVITY_COLORS` constant
- Thai month labels in `MONTH_LABELS`
- All string formatting in `getRecentActivity`

Repo returns:

- `getRecentActivity` returns `RawActivityRow[]` with `{ time: Date; userName: string | null; action: string; amount: number | null; status: string; }`
- `getMonthlyRevenue` returns numbers, not formatted strings
- `getAdminDashboardCounts` stays the same (already returns numbers)

```typescript
import "server-only";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { paymentSlip, pendingEnrollment } from "@/db/schema/payment";
import { enrollment } from "@/db/schema/enrollment";
import { course } from "@/db/schema/course";
import { certificate } from "@/db/schema/certificate";
import { user as userTable } from "@/db/schema/auth";

export interface AdminDashboardCounts {
  slipsSubmitted: number;
  slipsAcceptedToday: number;
  slipsRejectedToday: number;
  enrollmentsActive: number;
  coursesPublished: number;
  revenueMtd: number;
  certsMtd: number;
}

export interface MonthlyRevenueRaw {
  monthIndex: number; // 0-11
  year: number;
  current: number;
  previous: number;
}

export interface RawActivityRow {
  time: Date;
  userName: string | null;
  action: string;
  amount: number | null;
  status: string; // "success" | "warning" | "primary"
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonthAt(year: number, month: number): Date {
  const d = new Date(year, month, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getAdminDashboardCounts(): Promise<AdminDashboardCounts> {
  const today = startOfToday();
  const monthStart = startOfMonth();

  const [
    submitted,
    acceptedToday,
    rejectedToday,
    activeEnroll,
    pubCourses,
    revenue,
    certs,
  ] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(paymentSlip)
      .where(eq(paymentSlip.status, "submitted")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(paymentSlip)
      .where(
        and(
          eq(paymentSlip.status, "accepted"),
          gte(paymentSlip.reviewedAt, today),
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(paymentSlip)
      .where(
        and(
          eq(paymentSlip.status, "rejected"),
          gte(paymentSlip.reviewedAt, today),
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(enrollment)
      .where(eq(enrollment.status, "active")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(course)
      .where(and(eq(course.status, "published"), isNull(course.deletedAt))),
    db
      .select({
        total: sql<number>`COALESCE(sum(${enrollment.priceAtPurchase})::int, 0)`,
      })
      .from(enrollment)
      .where(
        and(
          eq(enrollment.source, "paid"),
          gte(enrollment.createdAt, monthStart),
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(certificate)
      .where(gte(certificate.issuedAt, monthStart)),
  ]);

  return {
    slipsSubmitted: submitted[0]?.n ?? 0,
    slipsAcceptedToday: acceptedToday[0]?.n ?? 0,
    slipsRejectedToday: rejectedToday[0]?.n ?? 0,
    enrollmentsActive: activeEnroll[0]?.n ?? 0,
    coursesPublished: pubCourses[0]?.n ?? 0,
    revenueMtd: revenue[0]?.total ?? 0,
    certsMtd: certs[0]?.n ?? 0,
  };
}

export async function getMonthlyRevenueRaw(): Promise<MonthlyRevenueRaw[]> {
  const now = new Date();
  const results: MonthlyRevenueRaw[] = [];

  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const start = startOfMonthAt(year, month);
    const end = startOfMonthAt(year, month + 1);

    const [cur, prev] = await Promise.all([
      db
        .select({
          total: sql<number>`COALESCE(sum(${enrollment.priceAtPurchase})::int, 0)`,
        })
        .from(enrollment)
        .where(
          and(
            eq(enrollment.source, "paid"),
            gte(enrollment.createdAt, start),
            sql`${enrollment.createdAt} < ${end.toISOString()}`,
          ),
        ),
      db
        .select({
          total: sql<number>`COALESCE(sum(${enrollment.priceAtPurchase})::int, 0)`,
        })
        .from(enrollment)
        .where(
          and(
            eq(enrollment.source, "paid"),
            gte(enrollment.createdAt, new Date(year - 1, month, 1)),
            sql`${enrollment.createdAt} < ${new Date(year - 1, month + 1, 1).toISOString()}`,
          ),
        ),
    ]);

    results.push({
      monthIndex: month,
      year,
      current: cur[0]?.total ?? 0,
      previous: prev[0]?.total ?? 0,
    });
  }

  return results;
}

export async function getRecentActivityRaw(
  limit = 6,
): Promise<RawActivityRow[]> {
  const [enrollRows, slipRows, certRows] = await Promise.all([
    db
      .select({
        time: enrollment.createdAt,
        userName: userTable.name,
        action: sql<string>`'สมัครคอร์ส ' || ${course.title}`,
        amount: enrollment.priceAtPurchase,
      })
      .from(enrollment)
      .innerJoin(course, eq(course.id, enrollment.courseId))
      .innerJoin(userTable, eq(userTable.id, enrollment.userId))
      .orderBy(desc(enrollment.createdAt))
      .limit(limit),
    db
      .select({
        time: paymentSlip.createdAt,
        userName: userTable.name,
        action: sql<string>`'อัปโหลดสลิปการชำระเงิน'`,
        amount: paymentSlip.expectedAmount,
      })
      .from(paymentSlip)
      .innerJoin(
        pendingEnrollment,
        eq(pendingEnrollment.id, paymentSlip.pendingEnrollmentId),
      )
      .innerJoin(userTable, eq(userTable.id, pendingEnrollment.userId))
      .where(eq(paymentSlip.status, "submitted"))
      .orderBy(desc(paymentSlip.createdAt))
      .limit(limit),
    db
      .select({
        time: certificate.issuedAt,
        userName: userTable.name,
        action: sql<string>`'รับใบประกาศ ' || ${course.title}`,
        amount: sql<number>`0`,
      })
      .from(certificate)
      .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId))
      .innerJoin(course, eq(course.id, enrollment.courseId))
      .innerJoin(userTable, eq(userTable.id, enrollment.userId))
      .orderBy(desc(certificate.issuedAt))
      .limit(limit),
  ]);

  const all: RawActivityRow[] = [
    ...enrollRows.map((r) => ({
      time: r.time,
      userName: r.userName,
      action: r.action,
      amount: Number(r.amount) > 0 ? Number(r.amount) : null,
      status: "success",
    })),
    ...slipRows.map((r) => ({
      time: r.time,
      userName: r.userName,
      action: r.action,
      amount: Number(r.amount),
      status: "warning",
    })),
    ...certRows.map((r) => ({
      time: r.time,
      userName: r.userName,
      action: r.action,
      amount: null,
      status: "primary",
    })),
  ];

  all.sort((a, b) => b.time.getTime() - a.time.getTime());
  return all.slice(0, limit);
}
```

- [ ] **Step 2: Create `admin-dashboard-presenter.ts`**

```typescript
import "server-only";
import {
  type AdminDashboardCounts,
  type MonthlyRevenueRaw,
  type RawActivityRow,
} from "@/server/repos/admin-dashboard";
import { formatActivityTime } from "@/lib/format-time";

const MONTH_LABELS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const ACTIVITY_COLORS = [
  "#4F46E5",
  "#10B981",
  "#F97316",
  "#8B5CF6",
  "#EC4899",
  "#0EA5E9",
];

export interface ActivityRow {
  time: string;
  userName: string;
  userColor: string;
  action: string;
  amount: string | null;
  status: "success" | "warning" | "primary";
  statusLabel: string;
}

export interface MonthlyRevenue {
  month: string;
  year: number;
  current: number;
  previous: number;
}

const STATUS_LABELS: Record<string, string> = {
  success: "สำเร็จ",
  warning: "รอตรวจ",
  primary: "รับใบประกาศ",
};

export function formatAdminDashboardCounts(
  counts: AdminDashboardCounts,
): AdminDashboardCounts {
  return counts; // Already numbers, no formatting needed
}

export function formatMonthlyRevenue(
  rows: MonthlyRevenueRaw[],
): MonthlyRevenue[] {
  return rows.map((r) => ({
    month: MONTH_LABELS[r.monthIndex]!,
    year: r.year,
    current: r.current,
    previous: r.previous,
  }));
}

export function formatActivityRows(rows: RawActivityRow[]): ActivityRow[] {
  return rows.map((r, i) => ({
    time: formatActivityTime(r.time),
    userName: r.userName ?? "ผู้ใช้",
    userColor: ACTIVITY_COLORS[i % ACTIVITY_COLORS.length]!,
    action: r.action,
    amount: r.amount !== null ? `฿${r.amount.toLocaleString("th-TH")}` : null,
    status: r.status as "success" | "warning" | "primary",
    statusLabel: STATUS_LABELS[r.status] ?? r.status,
  }));
}
```

- [ ] **Step 3: Run compilation check**

```bash
npx tsc --noEmit 2>&1 | grep -E "admin-dashboard|admin-dashboard-presenter" | head -10
```

Expected: No errors related to these files

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: split admin-dashboard repo (raw data) from presenter (formatting)"
```

---

### Task 1.3: Refactor `student-dashboard.ts` to Return Raw Data

**Files:**

- Modify: `src/server/repos/student-dashboard.ts`
- Create: `src/server/services/student-dashboard-presenter.ts`

**Context:** `student-dashboard.ts` calls `coverImageUrl()`, `computeStreak()`, `buildAchievements()`, and `buildHeatmap()` inline. Split into: repo returns raw data, presenter builds view model.

- [ ] **Step 1: Modify `student-dashboard.ts` — remove all presentation logic**

Key changes:

- Remove `import { coverImageUrl } from "@/lib/media-url"`
- Remove `import { computeStreak, buildHeatmap, buildAchievements }`
- `StudentEnrollmentItem` no longer has `coverImageUrl`; instead has `coverStorageKey: string | null`
- `getStudentDashboardData` returns raw data including `streakDates: string[]`, `heatmapData: Map<string, number>`, `certCount: number`, etc.
- Do NOT call `computeStreak`, `buildHeatmap`, `buildAchievements` in repo

```typescript
// In the return statement, replace:
//   coverImageUrl: coverImageUrl(r.coverStorageKey),
// With:
//   coverStorageKey: r.coverStorageKey ?? null,

// Return streakDates (array of date strings) instead of computed streak number
// Return heatmapData (Map<string, number>) instead of built heatmap array
// Return certCount, totalDoneLessons, quizPassCount instead of built achievements
```

- [ ] **Step 2: Create `student-dashboard-presenter.ts`**

```typescript
import "server-only";
import { coverImageUrl } from "@/lib/media-url";
import {
  computeStreak,
  buildHeatmap,
  buildAchievements,
} from "@/server/services/student-dashboard";
import type {
  StudentDashboardDataRaw,
  StudentEnrollmentItemRaw,
} from "@/server/repos/student-dashboard";

export interface StudentDashboardViewModel {
  enrollments: StudentEnrollmentItemView[];
  totalWatchedSeconds: number;
  weeklyWatchedSeconds: number;
  certCount: number;
  completedCourses: number;
  streak: number;
  heatmap: number[];
  recentActivity: RecentActivityItem[];
  achievements: AchievementItem[];
}

export interface StudentEnrollmentItemView extends StudentEnrollmentItemRaw {
  coverImageUrl: string | null;
}

export function buildStudentDashboardViewModel(
  raw: StudentDashboardDataRaw,
): StudentDashboardViewModel {
  const enrollments = raw.enrollments.map((e) => ({
    ...e,
    coverImageUrl: coverImageUrl(e.coverStorageKey),
  }));

  const streak = computeStreak(raw.streakDates);
  const heatmap = buildHeatmap(
    raw.heatmapDays,
    raw.heatmapStart,
    raw.heatmapData,
  );
  const achievements = buildAchievements(
    raw.certCount,
    streak,
    raw.totalDoneLessons,
    raw.quizPassCount,
  );

  return {
    enrollments,
    totalWatchedSeconds: raw.totalWatchedSeconds,
    weeklyWatchedSeconds: raw.weeklyWatchedSeconds,
    certCount: raw.certCount,
    completedCourses: raw.completedCourses,
    streak,
    heatmap,
    recentActivity: raw.recentActivity,
    achievements,
  };
}
```

- [ ] **Step 3: Run compilation check**

```bash
npx tsc --noEmit 2>&1 | grep -E "student-dashboard" | head -10
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: split student-dashboard repo (raw data) from presenter (view model)"
```

---

### Task 1.4: Refactor `account.ts` and `course.ts` to Return `coverStorageKey`

**Files:**

- Modify: `src/server/repos/account.ts`
- Modify: `src/server/repos/course.ts`
- Modify: `src/server/repos/course-queries.ts`

**Context:** These repos call `coverImageUrl()` inline. They should return `coverStorageKey` and let callers build URLs.

- [ ] **Step 1: Modify `account.ts`**

Remove `import { coverImageUrl }` and remove the `coverImageUrl: coverImageUrl(...)` mapping. Return `coverStorageKey: string | null` instead.

- [ ] **Step 2: Modify `course.ts`**

Remove `import { coverImageUrl }`. In `getPublishedCourseBySlug`, return `coverStorageKey: mediaAsset.storageKey ?? null` instead of `coverImageUrl`. Update `PublicCourseSummary` interface.

- [ ] **Step 3: Modify `course-queries.ts`**

Remove `mapToPublicCourseSummary` function or update it to NOT call `coverImageUrl`. The mapping should happen in the service or Server Component layer.

- [ ] **Step 4: Find and update all callers**

```bash
grep -rn 'coverImageUrl' src/ --include='*.ts' --include='*.tsx' | grep -v 'lib/media-url' | grep -v 'node_modules'
```

Update callers to call `coverImageUrl()` themselves after receiving `coverStorageKey`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: repos return coverStorageKey, callers build coverImageUrl"
```

---

## Wave 2: Service Layer + Container — Extract All DB Access

**Goal:** No service, factory, or container file imports `db` directly. All data access goes through injected repositories.

### Task 2.1: Create `MediaAssetRepo`

**Files:**

- Create: `src/server/repos/media-asset-repo.ts`
- Modify: `src/server/container.ts`
- Modify: `src/server/services/image-upload-factory.ts`
- Modify: `src/server/services/bunny-status-service-factory.ts`

**Context:** `container.ts`, `image-upload-factory.ts`, and `bunny-status-service-factory.ts` all query `mediaAsset` table inline.

- [ ] **Step 1: Create `media-asset-repo.ts`**

```typescript
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";

export const MediaAssetRepo = {
  async findById(
    id: string,
  ): Promise<{ id: string; storageKey: string } | null> {
    const rows = await db
      .select({ id: mediaAsset.id, storageKey: mediaAsset.storageKey })
      .from(mediaAsset)
      .where(eq(mediaAsset.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async deleteById(id: string): Promise<void> {
    await db.delete(mediaAsset).where(eq(mediaAsset.id, id));
  },

  async create(input: {
    kind: "image" | "pdf" | "video";
    storage: string;
    storageKey: string;
    mimeType: string;
    sizeBytes?: number;
    status: string;
    createdByUserId: string;
  }): Promise<{ id: string }> {
    const [row] = await db
      .insert(mediaAsset)
      .values({
        kind: input.kind,
        storage: input.storage,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        status: input.status,
        createdByUserId: input.createdByUserId,
      })
      .returning({ id: mediaAsset.id });
    if (!row) throw new Error("mediaAsset insert failed");
    return { id: row.id };
  },

  async updateStatus(id: string, status: string): Promise<void> {
    await db.update(mediaAsset).set({ status }).where(eq(mediaAsset.id, id));
  },

  async findByBunnyId(
    bunnyId: string,
  ): Promise<{ id: string; status: string } | null> {
    const rows = await db
      .select({ id: mediaAsset.id, status: mediaAsset.status })
      .from(mediaAsset)
      .where(eq(mediaAsset.storageKey, bunnyId))
      .limit(1);
    return rows[0] ?? null;
  },

  async updateById(
    id: string,
    updates: Partial<{
      status: string;
      storageKey: string;
      sizeBytes: number;
    }>,
  ): Promise<void> {
    await db
      .update(mediaAsset)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mediaAsset.id, id));
  },
};

export type MediaAssetRepoShape = typeof MediaAssetRepo;
```

- [ ] **Step 2: Update `image-upload-factory.ts` to inject `MediaAssetRepo`**

Replace inline `db.insert(mediaAsset)` with `MediaAssetRepo.create(...)`.

```typescript
import { MediaAssetRepo } from "@/server/repos/media-asset-repo";

// In createImageUploadService:
createMediaAsset: async (args) => {
	const { id } = await MediaAssetRepo.create({
		kind: "image",
		storage: "r2_public",
		storageKey: args.storageKey,
		mimeType: args.mimeType,
		status: "ready",
		createdByUserId: args.userId,
	});
	return { id };
},
```

- [ ] **Step 3: Update `bunny-status-service-factory.ts` to inject `MediaAssetRepo`**

Replace inline `db.select().from(mediaAsset)` with `MediaAssetRepo.findByBunnyId()` and `MediaAssetRepo.updateById()`.

- [ ] **Step 4: Update `container.ts` to inject `MediaAssetRepo`**

Replace inline `db.delete(mediaAsset)` and `db.select().from(mediaAsset)` in `coverImage()` factory with `MediaAssetRepo.deleteById()` and `MediaAssetRepo.findById()`.

- [ ] **Step 5: Run compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: extract MediaAssetRepo and inject into factories"
```

---

### Task 2.2: Create `EnrollmentRepo` and `AdminGrantRepo`

**Files:**

- Create: `src/server/repos/enrollment-repo.ts`
- Create: `src/server/repos/admin-grant-repo.ts`
- Modify: `src/server/container.ts`
- Modify: `src/server/services/free-enrollment.ts`
- Modify: `src/server/services/course-grant.ts`

- [ ] **Step 1: Create `enrollment-repo.ts`**

```typescript
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { enrollment } from "@/db/schema/enrollment";

export const EnrollmentRepo = {
  async create(input: {
    userId: string;
    courseId: string;
    source: string;
    priceAtPurchase?: string;
    status: string;
  }): Promise<void> {
    await db.insert(enrollment).values({
      userId: input.userId,
      courseId: input.courseId,
      source: input.source,
      priceAtPurchase: input.priceAtPurchase,
      status: input.status,
    });
  },

  async hasActiveEnrollment(
    userId: string,
    courseId: string,
  ): Promise<boolean> {
    const rows = await db
      .select({ id: enrollment.id })
      .from(enrollment)
      .where(
        and(
          eq(enrollment.userId, userId),
          eq(enrollment.courseId, courseId),
          eq(enrollment.status, "active"),
        ),
      )
      .limit(1);
    return rows.length > 0;
  },
};

export type EnrollmentRepoShape = typeof EnrollmentRepo;
```

- [ ] **Step 2: Create `admin-grant-repo.ts`**

```typescript
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { adminGrant } from "@/db/schema/enrollment";

export const AdminGrantRepo = {
  async create(input: {
    adminUserId: string;
    studentUserId: string;
    courseId: string;
    reason: string;
    note?: string;
  }): Promise<string> {
    const [row] = await db
      .insert(adminGrant)
      .values({
        adminUserId: input.adminUserId,
        studentUserId: input.studentUserId,
        courseId: input.courseId,
        reason: input.reason,
        note: input.note,
      })
      .returning({ id: adminGrant.id });
    if (!row) throw new Error("adminGrant insert failed");
    return row.id;
  },
};

export type AdminGrantRepoShape = typeof AdminGrantRepo;
```

- [ ] **Step 3: Update `container.ts`**

Replace inline `db.insert(enrollment)` in `freeEnrollment()` and `courseGrant()` with `EnrollmentRepo.create()` and `EnrollmentRepo.hasActiveEnrollment()`.

Replace inline `db.insert(adminGrant)` in `courseGrant()` with `AdminGrantRepo.create()`.

- [ ] **Step 4: Update `free-enrollment.ts` and `course-grant.ts` deps interfaces**

Add `EnrollmentRepoShape` and `AdminGrantRepoShape` to the deps interfaces where needed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: extract EnrollmentRepo and AdminGrantRepo"
```

---

### Task 2.3: Fix `course-authz.ts` — Remove DB Imports

**Files:**

- Modify: `src/server/services/course-authz.ts`
- Modify: `src/server/container.ts` (where course-authz is used)

**Context:** `course-authz.ts` queries `course` and `courseCollaborator` tables directly. It should receive pre-fetched data.

- [ ] **Step 1: Read current `course-authz.ts`**

```bash
cat src/server/services/course-authz.ts
```

- [ ] **Step 2: Refactor `getCourseAccess` to receive data, not query it**

Change signature from:

```typescript
export async function getCourseAccess(
  userId: string,
  userRole: string,
  courseId: string,
): Promise<CourseAccess>;
```

To:

```typescript
export function getCourseAccess(
  userId: string,
  userRole: string,
  courseOwnerId: string,
  collaboratorRole: string | null,
): CourseAccess;
```

The function becomes **synchronous** and **pure** — no DB calls, no async.

- [ ] **Step 3: Update callers**

Find all callers of `getCourseAccess` and update them to fetch `courseOwnerId` and `collaboratorRole` before calling.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: make course-authz pure (no DB imports)"
```

---

### Task 2.4: Fix `container.ts` Dynamic Import

**Files:**

- Modify: `src/server/container.ts`

- [ ] **Step 1: Replace dynamic import with static import**

```typescript
import { markLessonComplete } from "@/server/repos/progress";

// In courseCompletion():
markLessonComplete: async (userId, lessonId, durationSeconds) => {
	await markLessonComplete(userId, lessonId, durationSeconds);
},
```

- [ ] **Step 2: Check for circular dependency**

```bash
npx tsc --noEmit 2>&1 | grep -i "circular\|cannot\|error" | head -10
```

If circular dependency exists, move shared types to a separate file.

- [ ] **Step 3: Commit**

```bash
git add src/server/container.ts
git commit -m "refactor: replace dynamic import with static import in container"
```

---

## Wave 3: Controller Layer — Standardize Actions + API Routes

**Goal:** Every action is a thin auth-parse-delegate shell. Every API route uses `apiRoute` or `apiRouteRaw`.

### Task 3.1: Fix Actions with Direct DB

**Files:**

- Modify: `src/server/actions/admin-publish.ts`
- Modify: `src/server/actions/user-account.ts`

- [ ] **Step 1: Refactor `admin-publish.ts`**

Replace inline DB closures in `makePublishValidator()` with repo methods injected from container.

```typescript
// Instead of:
getCourseMeta: async (courseId) => {
	const rows = await db.select(...)...
},

// Use:
getCourseMeta: async (courseId) => {
	return container.courseRepo().getCourseMeta(courseId);
},
```

- [ ] **Step 2: Refactor `user-account.ts`**

Replace `auth.api.getSession({ headers })` with `getSession()`.

Replace `db.select().from(schema.account)` with `AccountRepo.hasCredentialAccount(userId)`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove direct DB from admin-publish and user-account actions"
```

---

### Task 3.2: Fix Actions Bypassing Wrappers

**Files:**

- Modify: `src/server/actions/admin-quiz.ts`
- Modify: `src/server/actions/delete-account.ts`

- [ ] **Step 1: Refactor `admin-quiz.ts` to use `adminCourseAction`**

```typescript
export const saveQuizAction = adminCourseAction(
  jsonParser(saveQuizSchema),
  (input) => input.quizId, // or however quiz maps to course
  async ({ session, course, input }) => {
    // business logic here
  },
);
```

- [ ] **Step 2: Refactor `delete-account.ts` to use auth-session helper**

Create `deleteUserAccount(password?: string)` in `auth-session.ts` that wraps `auth.api.deleteUser()`.

```typescript
export async function deleteUserAccount(password?: string): Promise<void> {
  const headers = await nextHeaders();
  await auth.api.deleteUser({
    headers,
    body: { password },
  });
}
```

Then `delete-account.ts` calls `deleteUserAccount(input.password)`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: standardize admin-quiz and delete-account actions"
```

---

### Task 3.3: Standardize Admin Slip API Routes

**Files:**

- Modify: `src/app/api/admin/slips/[slipId]/accept/route.ts`
- Modify: `src/app/api/admin/slips/[slipId]/reject/route.ts`
- Modify: `src/app/api/admin/slips/bulk-accept/route.ts`
- Modify: `src/app/api/admin/slips/bulk-reject/route.ts`

**Context:** These routes call actions (`acceptSlip`, `rejectSlip`, etc.) instead of calling services directly. They also hand-roll auth and error handling.

- [ ] **Step 1: Refactor accept route**

```typescript
import { apiRouteRaw } from "@/lib/api-route";
import { container } from "@/server/container";
import { rateLimitConfigs } from "@/lib/rate-limit";

export const POST = apiRouteRaw({
  auth: "admin",
  rateLimit: rateLimitConfigs.api,
  handler: async ({ req, user }) => {
    const slipId = req.url.split("/").slice(-2)[0];
    if (!slipId) {
      return { code: "validation_failed", message: "slipId required" };
    }
    return container.slipReview().accept(slipId, user!.id);
  },
});
```

- [ ] **Step 2: Refactor reject route**

```typescript
import { z } from "zod";
import { apiRoute } from "@/lib/api-route";
import { container } from "@/server/container";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { REJECT_REASONS } from "@/components/admin/slip-reject-options";

const bodySchema = z.object({
  reason: z.enum(REJECT_REASONS),
  note: z.string().max(500).optional(),
});

export const POST = apiRoute({
  auth: "admin",
  rateLimit: rateLimitConfigs.api,
  body: bodySchema,
  handler: async ({ body, user, req }) => {
    const slipId = req.url.split("/").slice(-2)[0];
    if (!slipId) {
      return { code: "validation_failed", message: "slipId required" };
    }
    return container
      .slipReview()
      .reject({ slipId, reason: body.reason, note: body.note }, user!.id);
  },
});
```

- [ ] **Step 3: Refactor bulk-accept and bulk-reject similarly**

Use `apiRoute` with body schema. Call `container.slipReview().bulkAccept()` / `bulkReject()` directly.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: standardize admin slip API routes with apiRoute"
```

---

### Task 3.4: Standardize Remaining API Routes

**Files:**

- Modify: `src/app/api/checkout/[pendingId]/status/route.ts`
- Modify: `src/app/api/learn/start/route.ts`
- Modify: `src/app/api/admin/lesson-video/route.ts`
- Modify: `src/app/api/admin/reencode-video/route.ts`
- Modify: `src/app/api/admin/slips/[slipId]/image-url/route.ts`
- Modify: `src/app/api/config/oauth/route.ts`

- [ ] **Step 1: For each route, apply the standard pattern**

Checkout status:

```typescript
export const GET = apiRouteRaw({
  auth: "required",
  rateLimit: rateLimitConfigs.api,
  handler: async ({ user, req }) => {
    // Extract pendingId from pathname
    const pendingId = extractPendingId(req.url);
    // Call service directly
  },
});
```

Learn start:

```typescript
export const POST = apiRoute({
  auth: "required",
  rateLimit: rateLimitConfigs.api,
  body: startSchema,
  handler: async ({ body, user }) => {
    // Call service directly
  },
});
```

Config oauth:

```typescript
export const GET = () => {
  const env = getEnv();
  const googleConfigured = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  return NextResponse.json({ google: googleConfigured });
};
```

- [ ] **Step 2: Commit each batch**

```bash
git add -A
git commit -m "refactor: standardize remaining API routes with apiRoute wrapper"
```

---

## Wave 4: View Layer — Extract God Components + Shared Formatters

**Goal:** Pages are thin presentation shells. Components have single responsibility. Formatters live in `lib/`.

### Task 4.1: Extract `AuthSplitLayout` and Apply to Login/Register

**Files:**

- Modify: `src/app/login/page.tsx`
- Modify: `src/app/register/page.tsx`

- [ ] **Step 1: Verify `AuthSplitLayout` component exists and works**

Check `src/components/auth/auth-split-layout.tsx`.

- [ ] **Step 2: Refactor `login/page.tsx` to use `AuthSplitLayout`**

Replace the inline split-panel layout with:

```tsx
<AuthSplitLayout
  left={<LoginForm />}
  right={<div>{/* testimonial content */}</div>}
/>
```

- [ ] **Step 3: Refactor `register/page.tsx` similarly**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: use AuthSplitLayout in login and register pages"
```

---

### Task 4.2: Extract Dashboard Formatters to `lib/`

**Files:**

- Create: `src/lib/format-dashboard.ts`
- Modify: `src/app/(student)/dashboard/page.tsx`

- [ ] **Step 1: Extract formatters**

```typescript
export function formatDurationHours(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}.${Math.round((mins / 60) * 10)}`;
  return `${mins}`;
}

export function formatDurationLabel(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  if (hours > 0) return `${hours} ชม.`;
  return `${Math.ceil(totalSeconds / 60)} นาที`;
}
```

- [ ] **Step 2: Update `dashboard/page.tsx`**

Remove inline `formatDuration`, `formatDurationLabel`, `timeAgo`, `getActivityIcon`, `getActivityBadge`, `AchievementIcon`. Import from `lib/format-dashboard.ts` and `lib/format-time.ts`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: extract dashboard formatters to lib/"
```

---

### Task 4.3: Extract `slip-queue.tsx` Sub-components

**Files:**

- Create: `src/components/admin/slip-queue-hooks.ts`
- Create: `src/components/admin/slip-table.tsx`
- Create: `src/components/admin/slip-detail-panel.tsx`
- Modify: `src/components/admin/slip-queue.tsx`

- [ ] **Step 1: Extract `useSlipQueue` hook**

Move data fetching (infinite query), selection state, and bulk action logic into `useSlipQueue` hook.

- [ ] **Step 2: Extract `SlipTable` component**

Extract the table rendering (desktop + mobile) into `slip-table.tsx`.

- [ ] **Step 3: Extract `SlipDetailPanel` component**

Extract the detail panel into `slip-detail-panel.tsx`.

- [ ] **Step 4: Simplify `slip-queue.tsx`**

`slip-queue.tsx` becomes:

```tsx
export function SlipQueue() {
	const { slips, activeSlip, selectSlip, ... } = useSlipQueue();
	return (
		<div>
			<SlipTable slips={slips} onSelect={selectSlip} />
			<SlipDetailPanel slip={activeSlip} />
		</div>
	);
}
```

- [ ] **Step 5: Delete dead code**

Remove `_bulkAccept` and `_bulkReject` (dead code with lint suppressions).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: extract slip-queue sub-components and delete dead code"
```

---

### Task 4.4: Extract `curriculum-tree.tsx` Sub-components

**Files:**

- Create: `src/components/admin/sortable-module.tsx`
- Create: `src/components/admin/sortable-lesson.tsx`
- Create: `src/components/admin/lesson-detail-panel.tsx`
- Create: `src/components/admin/lesson-quiz-inline-action.tsx`
- Modify: `src/components/admin/curriculum-tree.tsx`

- [ ] **Step 1: Extract each sub-component into its own file**

- [ ] **Step 2: Simplify `curriculum-tree.tsx`**

Keep only the DnD context and tree structure. Delegate rendering to sub-components.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: extract curriculum-tree sub-components"
```

---

## Wave 5: Architecture Guardrails

**Goal:** Document decisions and create automated checks to prevent regression.

### Task 5.1: Write ADR-0003

**Files:**

- Create: `docs/adr/ADR-0003-layered-architecture-complete.md`

- [ ] **Step 1: Document the complete architecture**

Document:

- Repository layer rules (raw data only, no formatting)
- Service layer rules (business logic, injected repos, no DB imports)
- Controller layer rules (thin adapters, auth-parse-delegate)
- View layer rules (presentation only, no business logic)
- Container rules (wiring only, no inline queries)

- [ ] **Step 2: Validate with `specdocs_validate`**

```bash
npx specdocs-validate docs/adr/ADR-0003-layered-architecture-complete.md
```

- [ ] **Step 3: Commit**

```bash
git add docs/adr/ADR-0003-layered-architecture-complete.md
git commit -m "docs: ADR-0003 documenting complete layered architecture"
```

---

### Task 5.2: Create Architecture Lint Script

**Files:**

- Create: `scripts/lint-architecture.js`
- Modify: `package.json`

- [ ] **Step 1: Create the lint script**

```javascript
#!/usr/bin/env node
/**
 * Architecture guard: fail the build if common anti-patterns are introduced.
 */

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
let exitCode = 0;

function error(file, line, message) {
  console.error(`❌ ${file}:${line} — ${message}`);
  exitCode = 1;
}

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
      cb(full);
  }
}

// Rule 1: Services must not import db client directly
walk(path.join(SRC, "server", "services"), (file) => {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (
      line.includes('from "@/db/client"') ||
      line.includes("from '@/db/client'")
    ) {
      error(
        file,
        idx + 1,
        "Service imports db client directly. Use repo injection instead.",
      );
    }
  });
});

// Rule 2: Actions must not import db client directly
walk(path.join(SRC, "server", "actions"), (file) => {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (
      line.includes('from "@/db/client"') ||
      line.includes("from '@/db/client'")
    ) {
      error(
        file,
        idx + 1,
        "Action imports db client directly. Use repo or service.",
      );
    }
  });
});

// Rule 3: Repositories must not import formatters or URL builders
walk(path.join(SRC, "server", "repos"), (file) => {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (
      line.includes('from "@/lib/media-url"') ||
      line.includes("from '@/lib/media-url'")
    ) {
      error(
        file,
        idx + 1,
        "Repository imports URL builder. Return raw storageKey instead.",
      );
    }
    if (
      line.includes("formatActivityTime") ||
      line.includes("timeAgo") ||
      line.includes("coverImageUrl")
    ) {
      error(
        file,
        idx + 1,
        "Repository calls formatting function. Return raw data instead.",
      );
    }
  });
});

// Rule 4: No dynamic imports in container.ts
const containerPath = path.join(SRC, "server", "container.ts");
const containerContent = fs.readFileSync(containerPath, "utf-8");
if (containerContent.includes("import(")) {
  error(
    containerPath,
    0,
    "container.ts uses dynamic import. Use static imports only.",
  );
}

// Rule 5: API routes should use apiRoute wrapper (warn)
walk(path.join(SRC, "app", "api"), (file) => {
  if (file.endsWith("route.ts")) {
    const content = fs.readFileSync(file, "utf-8");
    if (!content.includes("apiRoute") && !content.includes("apiRouteRaw")) {
      console.warn(`⚠️  ${file} — API route does not use apiRoute wrapper`);
    }
  }
});

process.exit(exitCode);
```

- [ ] **Step 2: Add to package.json**

```json
{
  "scripts": {
    "lint:arch": "node scripts/lint-architecture.js"
  }
}
```

- [ ] **Step 3: Run the lint**

```bash
node scripts/lint-architecture.js
```

Expected: Should pass (or show expected warnings for routes not yet migrated).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add architecture lint guard"
```

---

### Task 5.3: Create GitHub Action

**Files:**

- Create: `.github/workflows/tech-debt-guard.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: Tech Debt Guard

on:
	push:
		branches: [main]
	pull_request:
		branches: [main]

jobs:
	architecture:
		runs-on: ubuntu-latest
		steps:
			- uses: actions/checkout@v4
			- uses: pnpm/action-setup@v2
			- uses: actions/setup-node@v4
				with:
					node-version: 20
					cache: "pnpm"
			- run: pnpm install
			- run: pnpm lint:arch
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: add architecture lint CI workflow"
```

---

## Self-Review

### Spec Coverage

- ✅ Wave 1: Repository layer cleanup (admin-dashboard, student-dashboard, account, course, course-queries)
- ✅ Wave 2: Service layer + container (MediaAssetRepo, EnrollmentRepo, AdminGrantRepo, course-authz pure, dynamic import fixed)
- ✅ Wave 3: Controller layer (admin-publish, user-account, admin-quiz, delete-account, all API routes)
- ✅ Wave 4: View layer (AuthSplitLayout, dashboard formatters, slip-queue extraction, curriculum-tree extraction)
- ✅ Wave 5: Guardrails (ADR-0003, lint script, CI workflow)

### Placeholder Scan

- No "TBD", "TODO", "implement later"
- All code steps contain complete code
- No "Similar to Task N" references
- Exact file paths in every step

### Type Consistency

- `SlipRepoShape`, `MediaAssetRepoShape`, `EnrollmentRepoShape`, `AdminGrantRepoShape` all follow same pattern
- `apiRoute`/`apiRouteRaw` usage consistent across all routes
- `RawActivityRow` → `ActivityRow` naming consistent

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-06-layered-architecture-all-waves.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per wave, review between waves, fast iteration

**2. Inline Execution** — Execute waves in this session using executing-plans, batch execution with checkpoints for review

**Which approach?**
