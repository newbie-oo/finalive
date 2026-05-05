import { describe, it, expect } from "vitest";
import {
  offsetSchema,
  offsetToSql,
  buildOffsetResponse,
  cursorSchema,
  encodeCursor,
  decodeCursor,
  buildCursorResponse,
} from "./pagination";

describe("offset pagination", () => {
  it("parses defaults", () => {
    expect(offsetSchema.parse({})).toEqual({ page: 1, per_page: 20 });
  });

  it("rejects per_page > 100", () => {
    expect(() => offsetSchema.parse({ per_page: 200 })).toThrow();
  });

  it("offsetToSql translates page+per_page", () => {
    expect(offsetToSql({ page: 3, per_page: 10 })).toEqual({
      limit: 10,
      offset: 20,
    });
  });

  it("buildOffsetResponse computes total_pages and has_next/prev", () => {
    const r = buildOffsetResponse([1, 2], 25, { page: 2, per_page: 10 });
    expect(r.pagination).toEqual({
      page: 2,
      per_page: 10,
      total_count: 25,
      total_pages: 3,
      has_next: true,
      has_prev: true,
    });
  });

  it("buildOffsetResponse handles empty: total_pages=1, no next/prev", () => {
    const r = buildOffsetResponse<number>([], 0, { page: 1, per_page: 10 });
    expect(r.pagination.total_pages).toBe(1);
    expect(r.pagination.has_next).toBe(false);
    expect(r.pagination.has_prev).toBe(false);
  });
});

describe("cursor pagination", () => {
  it("parses defaults", () => {
    expect(cursorSchema.parse({})).toEqual({ per_page: 50 });
  });

  it("encode/decode round-trip", () => {
    const c = { created_at: "2026-04-28T08:12:35Z", id: "abc-123" };
    const decoded = decodeCursor(encodeCursor(c));
    expect(decoded).toEqual(c);
  });

  it("decodeCursor returns null for malformed input", () => {
    expect(decodeCursor("not-base64!")).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(
      decodeCursor(Buffer.from("not json").toString("base64url")),
    ).toBeNull();
    expect(
      decodeCursor(Buffer.from(JSON.stringify({ x: 1 })).toString("base64url")),
    ).toBeNull();
  });

  it("buildCursorResponse produces next_cursor when full page", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      id: `id-${i}`,
      createdAt: new Date(2026, 0, 1, 0, 0, i),
    }));
    const r = buildCursorResponse(rows, { per_page: 50 });
    expect(r.pagination.has_next).toBe(true);
    expect(r.pagination.next_cursor).not.toBeNull();
    expect(decodeCursor(r.pagination.next_cursor!)?.id).toBe("id-49");
  });

  it("buildCursorResponse: short page -> no next_cursor", () => {
    const rows = [{ id: "a", createdAt: new Date() }];
    const r = buildCursorResponse(rows, { per_page: 50 });
    expect(r.pagination.has_next).toBe(false);
    expect(r.pagination.next_cursor).toBeNull();
  });
});
