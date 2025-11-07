import { promises as fsp } from "node:fs";
import path from "node:path";

const LOG_LEVEL = (process.env.LOG_LEVEL ?? "info").toLowerCase();
const LOG_DIR = path.resolve(process.cwd(), process.env.LOG_DIR ?? "./logs");

const LEVEL_ORDER: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

async function ensureLogDir() {
  await fsp.mkdir(LOG_DIR, { recursive: true });
}

function shouldLog(level: string) {
  const current = LEVEL_ORDER[LOG_LEVEL] ?? LEVEL_ORDER.info;
  const incoming = LEVEL_ORDER[level] ?? LEVEL_ORDER.info;
  return incoming <= current;
}

function resolveCaller(): string | undefined {
  const stack = new Error().stack?.split("\n");
  if (!stack || stack.length < 4) return undefined;
  const frame = stack[3];
  const match = /\((.*):(\d+):(\d+)\)/.exec(frame) ?? /at (.*):(\d+):(\d+)/.exec(frame);
  if (!match) return undefined;
  const [, file, line] = match;
  return `${path.relative(process.cwd(), file)}:${line}`;
}

function currentLogFileName(date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return path.join(LOG_DIR, `app-${day}.log`);
}

async function writeLog(entry: Record<string, unknown>) {
  await ensureLogDir();
  const line = JSON.stringify(entry);
  await fsp.appendFile(currentLogFileName(), line + "\n", "utf8");
}

async function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
  };
  const caller = resolveCaller();
  if (caller) payload.at = caller;
  if (meta && Object.keys(meta).length > 0) {
    payload.meta = meta;
  }
  await writeLog(payload);
  const consoleMethod = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  consoleMethod(`[${payload.ts}] [${level.toUpperCase()}] ${message}`, meta ?? "");
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    return log("info", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    return log("warn", message, meta);
  },
  error(message: string, meta?: Record<string, unknown>) {
    return log("error", message, meta);
  },
};

export function getCurrentLogFile(): string {
  return currentLogFileName();
}

export async function readLogTail(since: number): Promise<string[]> {
  try {
    const file = currentLogFileName();
    const content = await fsp.readFile(file, "utf8");
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-since);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
