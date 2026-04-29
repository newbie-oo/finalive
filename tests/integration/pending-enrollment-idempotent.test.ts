import { describe, it, expect, beforeAll } from "vitest";
import { sql, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { user } from "@/db/schema/auth";
import { pendingEnrollment } from "@/db/schema/payment";
import { createPendingEnrollment } from "@/server/actions/enrollment";

const USER_ID = randomUUID();
const ADMIN_ID = randomUUID();
const COURSE_ID = randomUUID();
const COURSE_SLUG = "idempotent-test";

// Stub requireSession by mocking the module — we need a session that returns
// USER_ID. Vitest auto-mocking is overkill; we just patch the module before
// importing the action. Instead, the action reads the session via
// requireSession; we set a global override.
import * as authSession from "@/server/auth-session";
import { vi } from "vitest";

beforeAll(async () => {
  await db.execute(sql`TRUNCATE TABLE "pending_enrollment", "course", "user" CASCADE`);
  await db
    .insert(user)
    .values([
      { id: ADMIN_ID, email: "pe-admin@y.test", name: "A", role: "admin" },
      { id: USER_ID, email: "pe-user@y.test", name: "U", role: "user" },
    ]);
  await db.insert(course).values({
    id: COURSE_ID,
    slug: COURSE_SLUG,
    title: "T",
    summary: "x",
    ownerUserId: ADMIN_ID,
    price: "1990.00",
    isFree: false,
    status: "published",
    publishedAt: new Date(),
    createdByUserId: ADMIN_ID,
  });

  vi.spyOn(authSession, "requireSession").mockResolvedValue({
    user: { id: USER_ID, role: "user", email: "pe-user@y.test", name: "U" },
    session: {
      id: "test-session",
      userId: USER_ID,
      expiresAt: new Date(Date.now() + 1_000_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      token: "t",
      ipAddress: null,
      userAgent: null,
    },
  } as unknown as Awaited<ReturnType<typeof authSession.requireSession>>);
});

describe("createPendingEnrollment idempotency", () => {
  it("two sequential calls return the same pending id", async () => {
    const first = await createPendingEnrollment(COURSE_SLUG);
    const second = await createPendingEnrollment(COURSE_SLUG);
    expect(second.id).toBe(first.id);
    expect(second.refCode).toBe(first.refCode);
  });

  it("the database has exactly one pending row for the (user, course) pair", async () => {
    const rows = await db
      .select({ id: pendingEnrollment.id })
      .from(pendingEnrollment)
      .where(eq(pendingEnrollment.userId, USER_ID));
    const activeCourseRows = rows; // single course in fixture
    expect(activeCourseRows.length).toBe(1);
  });

  it("concurrent calls also collapse to the same pending id (partial unique index enforces it)", async () => {
    // Reset to test from clean state
    await db.execute(sql`DELETE FROM "pending_enrollment"`);
    const results = await Promise.allSettled([
      createPendingEnrollment(COURSE_SLUG),
      createPendingEnrollment(COURSE_SLUG),
      createPendingEnrollment(COURSE_SLUG),
    ]);
    const ids = new Set<string>();
    for (const r of results) {
      if (r.status === "fulfilled") ids.add(r.value.id);
    }
    // At most ONE pending should exist — extra concurrent inserts must fail
    // gracefully (caught by isUniqueViolation or the early reuse-check).
    expect(ids.size).toBeLessThanOrEqual(1);

    const rows = await db.select().from(pendingEnrollment);
    expect(rows.length).toBe(1);
  });
});
