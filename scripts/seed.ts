import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db/client";
import { user as userTable, account as accountTable } from "@/db/schema/auth";

interface SeedUser {
  email: string;
  name: string;
  password: string;
  role: "admin" | "user";
}

const SEED_USERS: SeedUser[] = [
  { email: "admin@finalive.dev", name: "Admin", password: "change-me", role: "admin" },
  { email: "student-a@finalive.dev", name: "Student A", password: "change-me", role: "user" },
  { email: "student-b@finalive.dev", name: "Student B", password: "change-me", role: "user" },
];

async function seed(): Promise<void> {
  console.warn("[seed] resetting auth tables");
  await db.execute(sql`TRUNCATE TABLE "account", "session", "verification", "user" CASCADE`);

  for (const u of SEED_USERS) {
    const id = randomUUID();
    const hashed = await hashPassword(u.password);
    await db.insert(userTable).values({
      id,
      email: u.email,
      name: u.name,
      emailVerified: true,
      role: u.role,
    });
    await db.insert(accountTable).values({
      id: randomUUID(),
      userId: id,
      providerId: "credential",
      accountId: id,
      password: hashed,
    });
    console.warn(`[seed] inserted ${u.role.padEnd(5)} ${u.email}`);
  }

  console.warn("[seed] done. Sign in with the seeded credentials (password = 'change-me').");
  process.exit(0);
}

seed().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[seed] failed:", msg);
  process.exit(1);
});
