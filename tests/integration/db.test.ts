import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { user, session, account, verification } from "@/db/schema/auth";

describe("db connection + Better Auth tables", () => {
  it("connects and runs SELECT 1", async () => {
    const result = await db.execute(sql`select 1 as ok`);
    expect(result[0]).toEqual({ ok: 1 });
  });

  it.each([
    { name: "user", t: user },
    { name: "session", t: session },
    { name: "account", t: account },
    { name: "verification", t: verification },
  ])("table $name is empty after reset", async ({ t }) => {
    const rows = await db.select().from(t);
    expect(rows.length).toBe(0);
  });
});
