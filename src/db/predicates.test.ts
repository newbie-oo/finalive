import { describe, it, expect } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { notDeleted, coursePublic } from "./predicates";
import { course } from "@/db/schema";

describe("notDeleted", () => {
	it("compiles to `<table>.deleted_at IS NULL`", () => {
		const dialect = new PgDialect();
		const { sql } = dialect.sqlToQuery(notDeleted(course));
		expect(sql).toContain('"deleted_at"');
		expect(sql).toContain("is null");
	});
});

describe("coursePublic", () => {
	it("compiles to `status = 'published' AND deleted_at IS NULL`", () => {
		const dialect = new PgDialect();
		const { sql, params } = dialect.sqlToQuery(coursePublic());
		expect(sql).toContain('"status"');
		expect(sql).toContain('"deleted_at"');
		expect(sql).toContain("is null");
		expect(sql).toContain("and");
		// Status comparison is parameterised — drizzle pushes "published" into params.
		expect(params).toContain("published");
	});
});
