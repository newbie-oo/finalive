import { z } from "zod";

/**
 * Parse and validate FormData with a Zod schema.
 * Returns a structured error string on validation failure.
 */
export function parseFormData<T extends z.ZodTypeAny>(
	formData: FormData,
	schema: T,
): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
	const raw: Record<string, unknown> = {};
	formData.forEach((value, key) => {
		if (value !== null && value !== "") raw[key] = value;
	});
	const parsed = schema.safeParse(raw);
	if (!parsed.success) {
		const issue = parsed.error.issues[0];
		if (!issue) return { ok: false, error: "invalid_input" };
		const field = issue.path.join(".");
		return { ok: false, error: `invalid_input (${field}): ${issue.message}` };
	}
	return { ok: true, data: parsed.data };
}
