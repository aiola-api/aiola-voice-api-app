type LogLevel = "error" | "warn" | "info" | "debug";

const LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const DEFAULT_LEVEL: LogLevel = "info";

let currentLevel: LogLevel = DEFAULT_LEVEL;

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] <= LEVELS[currentLevel];
}

const logger = {
  error(tag: string, ...args: unknown[]): void {
    // Always print errors regardless of log level
    console.error(`[${tag}]`, ...args);
    // Print extra payload from Error subclasses (e.g. AiolaError with reason/details)
    for (const arg of args) {
      if (arg instanceof Error) {
        const { reason, status, code, details } = arg as unknown as Record<string, unknown>;
        if (reason || details) {
          console.error(`[${tag}] Error payload:`, { reason, status, code, details });
        }
      }
    }
  },

  warn(tag: string, ...args: unknown[]): void {
    if (shouldLog("warn")) {
      console.warn(`[${tag}]`, ...args);
    }
  },

  info(tag: string, ...args: unknown[]): void {
    if (shouldLog("info")) {
      console.info(`[${tag}]`, ...args);
    }
  },

  debug(tag: string, ...args: unknown[]): void {
    if (shouldLog("debug")) {
      console.debug(`[${tag}]`, ...args);
    }
  },

  getLevel(): LogLevel {
    return currentLevel;
  },

  setLevel(level: LogLevel): void {
    currentLevel = level;
    console.log(`[Logger] log level set to: ${level}`);
  },
};

/**
 * Extract a simplified, toast-friendly error description from an error object.
 * For AiolaError (or similar), includes reason/status from the server payload.
 * Returns just the message string for plain errors.
 */
function formatError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const extra = error as unknown as Record<string, unknown>;
  const parts: string[] = [];

  if (extra.status) parts.push(`${extra.status}`);
  if (extra.reason) parts.push(String(extra.reason));

  // AiolaError stores the raw response body in `details` when `reason` is empty
  if (!extra.reason && extra.details && typeof extra.details === "object") {
    const d = extra.details as Record<string, unknown>;
    // Pick the most descriptive field from the payload
    const msg = d.error || d.message || d.detail;
    if (msg) parts.push(String(msg));
  }

  if (parts.length > 0) return parts.join(" - ");

  return error.message;
}

export { logger, formatError, type LogLevel };
