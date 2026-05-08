import { describe, it, expect } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { notDeleted } from "./predicates";
import { course } from "@/db/schema";

describe("notDeleted", () => {
	it("compiles to `<table>.deleted_at IS NULL`", () => {
		const dialect = new PgDialect();
		const { sql } = dialect.sqlToQuery(notDeleted(course));
		expect(sql).toContain('"deleted_at"');
		expect(sql).toContain("is null");
	});
});
