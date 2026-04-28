// Integration test setup — runs against db-test (Postgres on :5433).
// Sprint 1.4+ will add a resetDb() helper here that truncates all tables in TX.
import { beforeAll } from "vitest";

beforeAll(() => {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL_TEST ??
      "postgres://finalive:test@localhost:5433/finalive_test";
  }
});
