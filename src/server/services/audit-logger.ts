import "server-only";
import { logAudit, type AuditInput, type DbWriter } from "./audit";

export interface AuditLogger {
  log(input: AuditInput, tx?: DbWriter): Promise<void>;
}

export function makeDbAuditLogger(): AuditLogger {
  return { log: logAudit };
}
