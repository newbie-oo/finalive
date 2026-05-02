import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { enrollment, adminGrant } from "@/db/schema/enrollment";

describe("enrollment + admin_grant schema", () => {
  it.each([
    { name: "enrollment", t: enrollment },
    { name: "admin_grant", t: adminGrant },
  ])("table $name selectable + empty after reset", async ({ t }) => {
    const rows = await db.select().from(t);
    expect(rows.length).toBe(0);
  });

  it("one_active_enrollment partial unique exists with correct predicate", async () => {
    const result = await db.execute(sql`
      SELECT pg_get_indexdef(indexrelid) AS def
      FROM pg_index i
      JOIN pg_class c ON c.oid = i.indexrelid
      WHERE c.relname = 'one_active_enrollment'
    `);
    expect(result.length).toBe(1);
    const def = (result[0] as { def: string }).def;
    expect(def).toMatch(/UNIQUE/);
    expect(def).toMatch(/user_id/);
    expect(def).toMatch(/course_id/);
    expect(def).toMatch(/WHERE.*status.*=.*'active'/);
  });

  it("enroll_source_id_chk rejects 'paid' without source_pending_id", async () => {
    await expect(
      db.execute(sql`
        INSERT INTO enrollment (user_id, course_id, source, price_at_purchase)
        VALUES ('u1', gen_random_uuid(), 'paid', 0)
      `),
    ).rejects.toThrow(/enroll_source_id_chk/);
  });
});
