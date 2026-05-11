import "server-only";
import type { ReactElement } from "react";
import { render } from "@react-email/components";
import { sendMail } from "@/server/services/mailer";

export interface TemplateEntry {
	name: string;
	subject: string;
	component: (params: Record<string, unknown>) => ReactElement;
}

const registry = new Map<string, TemplateEntry>();

export function registerTemplate(entry: {
	name: string;
	subject: string;
	component: (params: Record<string, unknown>) => ReactElement;
}): void {
	registry.set(entry.name, entry);
}

export async function dispatchEmail(
	templateName: string,
	toEmail: string,
	params: Record<string, unknown>,
): Promise<void> {
	const entry = registry.get(templateName);
	if (!entry) {
		throw new Error(`Unknown email template: ${templateName}`);
	}

	const node = entry.component(params);

	return sendRendered({ to: toEmail, subject: entry.subject, node });
}

export async function sendRendered(args: {
	to: string;
	subject: string;
	node: ReactElement;
}): Promise<void> {
	const [html, text] = await Promise.all([
		render(args.node),
		render(args.node, { plainText: true }),
	]);

	await sendMail({ to: args.to, subject: args.subject, html, text });
}

/* ─── Re-export for consumers who want direct access ─── */
export { registry };
