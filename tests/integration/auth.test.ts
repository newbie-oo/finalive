import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { user } from "@/db/schema/auth";

// Smoke test: Better Auth signUp inserts a row into `user`.
describe("auth signUp", () => {
  beforeAll(() => {
    process.env.BETTER_AUTH_SECRET ??= "test-secret-min-16-chars-long-xx";
    process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  });

  it("creates a user row + emits verification email (stub)", async () => {
    const { auth } = await import("@/server/auth");
    const email = `sprint1-${Date.now()}@example.com`;

    await auth.api.signUpEmail({
      body: { email, password: "abc12345", name: "Sprint One" },
    });

    const rows = await db.select().from(user).where(eq(user.email, email));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.emailVerified).toBe(false);
  });
});
