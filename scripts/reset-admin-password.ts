// Resets the password for the admin@finalive.dev seed user, creating it
// if missing. Used by the local Playwright UI tests so they don't depend
// on whatever password the live admin chose.
//
// Usage:  pnpm tsx scripts/reset-admin-password.ts
//
// SAFE TO RUN ONLY IN DEV. Aborts if NODE_ENV === "production".

import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db/client";
import { user as userTable, account as accountTable } from "@/db/schema/auth";

const TEST_EMAIL = "admin@finalive.dev";
const TEST_PASSWORD = "AdminTest1234!";
const TEST_NAME = "Test Admin";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("refuse to reset password in production");
  }

  const hashed = await hashPassword(TEST_PASSWORD);

  const [existing] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, TEST_EMAIL))
    .limit(1);

  let userId: string;
  if (existing) {
    userId = existing.id;
    await db
      .update(userTable)
      .set({ role: "admin", emailVerified: true })
      .where(eq(userTable.id, userId));
  } else {
    userId = randomUUID();
    await db.insert(userTable).values({
      id: userId,
      email: TEST_EMAIL,
      name: TEST_NAME,
      emailVerified: true,
      role: "admin",
    });
  }

  // Better Auth stores the password on the credential account row, not on
  // user. Upsert that row.
  const [acct] = await db
    .select({ id: accountTable.id })
    .from(accountTable)
    .where(
      and(
        eq(accountTable.userId, userId),
        eq(accountTable.providerId, "credential"),
      ),
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

  console.warn(`[reset-admin-password] ready — ${TEST_EMAIL} / ${TEST_PASSWORD}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
