import { getDb } from "./db";
import type { ImportOptions, UploadFile, ImportSummary } from "./importer/types";
import { importArquivos } from "./importer/importer";
import { logger } from "./logger";
import { buildImportJobReport, ImportJobReport } from "./importer/summary";
import { recomputeDashboardAggregates } from "./metrics/service";

export interface ProcessUploadResult {
  summary: ImportJobReport;
  details: ImportSummary;
}

export async function processarUpload(arquivos: UploadFile[], options: ImportOptions = {}): Promise<ProcessUploadResult> {
  const db = await getDb({ role: "importer" });
  if (!db) {
    logger.error("Banco de dados indisponível durante o processamento de upload", { quantidadeArquivos: arquivos.length });
    throw new Error("Banco de dados indisponível");
  }

  logger.info("Iniciando processamento de upload", {
    quantidadeArquivos: arquivos.length,
    dryRun: options.dryRun ?? false,
  });

  const details = await importArquivos(db, arquivos, options);
  const summary = buildImportJobReport(details);

  logger.info("import:completed", {
    dryRun: details.dryRun,
    files: details.files.length,
    totals: summary,
  });

  logger.info("csv:summary", summary);

  if (!details.dryRun) {
    try {
      const snapshot = await recomputeDashboardAggregates();
      logger.info("metrics:snapshot", snapshot);
    } catch (error) {
      logger.error("metrics:recompute_failed", { error });
      throw error;
    }
  }

  return { summary, details };
}
