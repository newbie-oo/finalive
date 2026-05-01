import "server-only";
import { logAudit, type AuditInput } from "./audit";
import type { DbWriter } from "./audit";

export interface AuditLogger {
	log(input: AuditInput, tx?: DbWriter): Promise<void>;
}

export class DbAuditLogger implements AuditLogger {
	async log(input: AuditInput, tx?: DbWriter): Promise<void> {
		await logAudit(input, tx);
	}
}
