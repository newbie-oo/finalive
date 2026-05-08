/**
 * Lightweight structured logger.
 * In production this should be replaced with a real aggregator
 * (e.g. Datadog, Sentry, or a syslog drain).
 */

export interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

function log(
  level: "info" | "warn" | "error",
  message: string,
  ctx?: LogContext,
  err?: unknown,
): void {
  const ts = new Date().toISOString();
  const payload: Record<string, unknown> = {
    ts,
    level,
    msg: message,
    ...ctx,
  };
  if (err instanceof Error) {
    payload.err = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  } else if (err !== undefined) {
    payload.err = String(err);
  }

  const line = `${JSON.stringify(payload)}\n`;
  const stream = level === "info" ? process.stdout : process.stderr;
  stream.write(line);
}

export const logger = {
  info: (message: string, ctx?: LogContext) => log("info", message, ctx),
  warn: (message: string, ctx?: LogContext) => log("warn", message, ctx),
  error: (message: string, err?: unknown, ctx?: LogContext) =>
    log("error", message, ctx, err),
  withContext: (base: LogContext) => ({
    info: (message: string, ctx?: LogContext) =>
      log("info", message, { ...base, ...ctx }),
    warn: (message: string, ctx?: LogContext) =>
      log("warn", message, { ...base, ...ctx }),
    error: (message: string, err?: unknown, ctx?: LogContext) =>
      log("error", message, { ...base, ...ctx }, err),
  }),
};
