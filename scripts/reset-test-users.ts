// Resets passwords + email verification for the 3 seed users
// (admin + student-a + student-b). Idempotent — safe to re-run.
// Usage: pnpm tsx scripts/reset-test-users.ts

import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db/client";
import { user as userTable, account as accountTable } from "@/db/schema/auth";

interface TestUser {
  email: string;
  name: string;
  role: "admin" | "user";
  password: string;
}

const TEST_USERS: TestUser[] = [
  { email: "admin@finalive.dev", name: "Test Admin", role: "admin", password: "AdminTest1234!" },
  { email: "student-a@finalive.dev", name: "Student A", role: "user", password: "StudentTest1234!" },
  { email: "student-b@finalive.dev", name: "Student B", role: "user", password: "StudentTest1234!" },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("refuse to reset password in production");
  }

  for (const u of TEST_USERS) {
    const hashed = await hashPassword(u.password);

    const [existing] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, u.email))
      .limit(1);

    let userId: string;
    if (existing) {
      userId = existing.id;
      await db
        .update(userTable)
        .set({ role: u.role, emailVerified: true, name: u.name })
        .where(eq(userTable.id, userId));
    } else {
      userId = randomUUID();
      await db.insert(userTable).values({
        id: userId,
        email: u.email,
        name: u.name,
        emailVerified: true,
        role: u.role,
      });
    }

    const [acct] = await db
      .select({ id: accountTable.id })
      .from(accountTable)
      .where(
        and(eq(accountTable.userId, userId), eq(accountTable.providerId, "credential")),
      )
      .limit(1);

    if (acct) {
      await db
        .update(accountTable)
        .set({ password: hashed })
        .where(eq(accountTable.id, acct.id));
    } else {
      await db.insert(accountTable).values({
        id: randomUUID(),
        userId,
        providerId: "credential",
        accountId: userId,
        password: hashed,
      });
    }

    console.warn(`[reset-test-users] ready — ${u.email} / ${u.password} (${u.role})`);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
