// One-shot migration: any course with price=0 && isFree=false is rewritten
// to isFree=true so existing rows match the bidirectional invariant
// introduced in commit 6a49043. Idempotent.

import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";

async function main() {
  const rows = await db
    .select({ id: course.id, slug: course.slug, price: course.price, isFree: course.isFree })
    .from(course)
    .where(sql`${course.isFree} = false AND ${course.price}::numeric = 0`);

  console.warn(`[migrate] found ${rows.length} mis-tagged free courses`);
  for (const r of rows) {
    console.warn(`  - ${r.slug} (price=${r.price}, isFree=${r.isFree})`);
    await db.update(course).set({ isFree: true, price: "0.00" }).where(eq(course.id, r.id));
  }
  console.warn("[migrate] done.");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
