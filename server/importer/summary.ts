import { MAX_SKIP_REASONS_IN_SUMMARY } from "./constants";
import type { FileImportSummary, ImportSummary } from "./types";

export interface ImportJobReport {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  topReasons: Record<string, number>;
  durationMs: number;
  dryRun: boolean;
  files: number;
}

function aggregateSkipReasons(files: FileImportSummary[]): Record<string, number> {
  const counts = new Map<string, number>();

  for (const file of files) {
    for (const [reason, count] of Object.entries(file.skipReasonCounts)) {
      counts.set(reason, (counts.get(reason) ?? 0) + count);
    }
  }

  const sorted = Array.from(counts.entries()).sort(([, a], [, b]) => b - a);
  const limited = sorted.slice(0, MAX_SKIP_REASONS_IN_SUMMARY);
  return Object.fromEntries(limited);
}

export function buildImportJobReport(summary: ImportSummary): ImportJobReport {
  return {
    total: summary.totals.rows,
    inserted: summary.dryRun ? 0 : summary.totals.inserted,
    updated: summary.dryRun ? 0 : summary.totals.updated,
    skipped: summary.totals.skipped,
    topReasons: aggregateSkipReasons(summary.files),
    durationMs: summary.durationMs,
    dryRun: summary.dryRun,
    files: summary.files.length,
  };
}
