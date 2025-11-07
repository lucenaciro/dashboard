import { appendFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: unknown;
}

function safeSerialize(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: "cause" in value && value.cause ? safeSerialize(value.cause as unknown, seen) : undefined,
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(item => safeSerialize(item, seen));
  }

  if (value && typeof value === "object") {
    if (seen.has(value as object)) {
      return "[Circular]";
    }
    seen.add(value as object);
    const serialized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      serialized[key] = safeSerialize(entry, seen);
    }
    seen.delete(value as object);
    return serialized;
  }

  if (value === null) {
    return null;
  }

  return value;
}

const LOG_DIR = process.env.LOG_DIR ?? path.resolve(process.cwd(), "logs");
const LOG_PREFIX = "dashboard";
const RETENTION_DAYS = 10;

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function ensureDirectory(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function cleanupOldLogs(dir: string) {
  const entries = await readdir(dir).catch(() => []);
  const logFiles = entries.filter(name => name.startsWith(LOG_PREFIX) && name.endsWith(".log"));
  if (logFiles.length <= RETENTION_DAYS) return;
  const sorted = logFiles.sort();
  const excess = sorted.length - RETENTION_DAYS;
  const toRemove = sorted.slice(0, excess);
  await Promise.all(
    toRemove.map(async file => {
      try {
        await rm(path.join(dir, file));
      } catch (error) {
        process.stderr.write(`Failed to remove old log ${file}: ${String(error)}\n`);
      }
    })
  );
}

class Logger {
  private currentDate: string;
  private queue: Promise<void> = Promise.resolve();
  private listeners = new Set<(entry: LogEntry) => void>();

  constructor() {
    this.currentDate = formatDate(new Date());
    void ensureDirectory(LOG_DIR).then(() => cleanupOldLogs(LOG_DIR));
  }

  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  info(message: string, details?: unknown) {
    this.log("info", message, details);
  }

  warn(message: string, details?: unknown) {
    this.log("warn", message, details);
  }

  error(message: string, details?: unknown) {
    this.log("error", message, details);
  }

  private log(level: LogLevel, message: string, details?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details: details === undefined ? undefined : safeSerialize(details),
    };

    this.notify(entry);
    this.queue = this.queue
      .then(() => this.persist(entry))
      .catch(error => {
        process.stderr.write(`Logger persistence failed: ${String(error)}\n`);
      });
  }

  private notify(entry: LogEntry) {
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        process.stderr.write(`Logger listener failed: ${String(error)}\n`);
      }
    });
  }

  private async persist(entry: LogEntry) {
    const entryDate = entry.timestamp.slice(0, 10);
    if (entryDate !== this.currentDate) {
      this.currentDate = entryDate;
      await cleanupOldLogs(LOG_DIR);
    }

    const fileName = `${LOG_PREFIX}-${this.currentDate}.log`;
    const filePath = path.join(LOG_DIR, fileName);
    await appendFile(filePath, JSON.stringify(entry) + "\n");

    const human = `[${entry.level.toUpperCase()}] ${entry.timestamp} ${entry.message}`;
    process.stdout.write(`${human}${entry.details ? ` ${JSON.stringify(entry.details)}` : ""}\n`);
  }

  async getProcessLog(_logId: string) {
    return null;
  }

  async saveToTXT(_logId: string): Promise<string> {
    throw new Error("Legacy log export is no longer supported. Use /logs/stream for real-time logs.");
  }

  async saveToJSON(_logId: string): Promise<string> {
    throw new Error("Legacy log export is no longer supported. Use /logs/stream for real-time logs.");
  }
}

export const logger = new Logger();
