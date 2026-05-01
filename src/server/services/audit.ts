import "server-only";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema/audit";

export type DbWriter = Pick<typeof db, "insert">;

export type ActorType = "user" | "system" | "cron" | "webhook";

export interface AuditInput {
	actorType: ActorType;
	actorUserId?: string | null;
	actorAdminImpersonating?: string | null;
	action: string;
	targetType: string;
	targetId: string;
	beforeJson?: unknown;
	afterJson?: unknown;
	requestId?: string | null;
	ip?: string | null;
	userAgent?: string | null;
	metadataJson?: unknown;
}

// Cast helper: jsonb columns accept arbitrary JSON; we narrow at the boundary.
function asJson(v: unknown): unknown {
	return v ?? null;
}

export async function logAudit(
	input: AuditInput,
	tx?: DbWriter,
): Promise<void> {
	const writer = tx ?? db;
	await writer.insert(auditLog).values({
		actorType: input.actorType,
		actorUserId: input.actorUserId ?? null,
		actorAdminImpersonating: input.actorAdminImpersonating ?? null,
		action: input.action,
		targetType: input.targetType,
		targetId: input.targetId,
		beforeJson: asJson(input.beforeJson),
		afterJson: asJson(input.afterJson),
		requestId: input.requestId ?? null,
		ip: input.ip ?? null,
		userAgent: input.userAgent ?? null,
		metadataJson: asJson(input.metadataJson),
	});
}
