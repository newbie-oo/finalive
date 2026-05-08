import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ db: { insert: vi.fn() } }));

const { logAudit, makeDbAuditLogger } = await import("./audit");

function fakeWriter() {
	const values = vi.fn().mockResolvedValue(undefined);
	const insert = vi.fn().mockReturnValue({ values });
	return { insert, values };
}

describe("logAudit", () => {
	it("inserts a single row with normalised optional fields", async () => {
		const w = fakeWriter();

		await logAudit(
			{
				actorType: "user",
				actorUserId: "u1",
				action: "course.published",
				targetType: "course",
				targetId: "c1",
			},
			w,
		);

		expect(w.insert).toHaveBeenCalledTimes(1);
		expect(w.values).toHaveBeenCalledTimes(1);
		const row = w.values.mock.calls[0]?.[0];
		expect(row).toMatchObject({
			actorType: "user",
			actorUserId: "u1",
			action: "course.published",
			targetType: "course",
			targetId: "c1",
		});
		// Unset optional fields are explicitly nulled (jsonb defaults to null).
		expect(row.beforeJson).toBeNull();
		expect(row.afterJson).toBeNull();
		expect(row.metadataJson).toBeNull();
		expect(row.actorAdminImpersonating).toBeNull();
		expect(row.requestId).toBeNull();
		expect(row.ip).toBeNull();
		expect(row.userAgent).toBeNull();
	});

	it("preserves jsonb payloads when provided", async () => {
		const w = fakeWriter();

		await logAudit(
			{
				actorType: "system",
				action: "x",
				targetType: "y",
				targetId: "z",
				beforeJson: { a: 1 },
				afterJson: { a: 2 },
				metadataJson: { reason: "test" },
			},
			w,
		);

		const row = w.values.mock.calls[0]?.[0];
		expect(row.beforeJson).toEqual({ a: 1 });
		expect(row.afterJson).toEqual({ a: 2 });
		expect(row.metadataJson).toEqual({ reason: "test" });
	});
});

describe("makeDbAuditLogger", () => {
	it("returns an object exposing the log function", () => {
		const logger = makeDbAuditLogger();
		expect(typeof logger.log).toBe("function");
	});
});
