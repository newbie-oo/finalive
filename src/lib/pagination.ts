import { z } from "zod";

// --- Offset pagination -----------------------------------------------------

export const offsetSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export type OffsetParams = z.infer<typeof offsetSchema>;

export interface OffsetResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export function offsetToSql(params: OffsetParams): { limit: number; offset: number } {
  return {
    limit: params.per_page,
    offset: (params.page - 1) * params.per_page,
  };
}

export function buildOffsetResponse<T>(
  rows: T[],
  total: number,
  params: OffsetParams,
): OffsetResponse<T> {
  const total_pages = Math.max(1, Math.ceil(total / params.per_page));
  return {
    data: rows,
    pagination: {
      page: params.page,
      per_page: params.per_page,
      total_count: total,
      total_pages,
      has_next: params.page < total_pages,
      has_prev: params.page > 1,
    },
  };
}

// --- Cursor pagination -----------------------------------------------------

export const cursorSchema = z.object({
  cursor: z.string().optional(),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
});

export type CursorParams = z.infer<typeof cursorSchema>;

export interface Cursor {
  created_at: string;
  id: string;
}

export interface CursorResponse<T> {
  data: T[];
  pagination: {
    next_cursor: string | null;
    per_page: number;
    has_next: boolean;
  };
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}

export function decodeCursor(c: string | undefined): Cursor | null {
  if (!c) return null;
  try {
    const json = Buffer.from(c, "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("created_at" in parsed) ||
      !("id" in parsed)
    ) {
      return null;
    }
    const obj = parsed as { created_at: unknown; id: unknown };
    if (typeof obj.created_at !== "string" || typeof obj.id !== "string") return null;
    return { created_at: obj.created_at, id: obj.id };
  } catch {
    return null;
  }
}

export function buildCursorResponse<T extends { id: string; createdAt: Date }>(
  rows: T[],
  params: CursorParams,
): CursorResponse<T> {
  const has_next = rows.length >= params.per_page;
  const last = rows.at(-1);
  const next_cursor =
    has_next && last
      ? encodeCursor({ created_at: last.createdAt.toISOString(), id: last.id })
      : null;
  return {
    data: rows,
    pagination: {
      next_cursor,
      per_page: params.per_page,
      has_next,
    },
  };
}
