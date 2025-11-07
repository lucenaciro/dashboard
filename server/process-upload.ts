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
    const fallbackOptions = { ...options, dryRun: true };
    logger.warn("import:db-unavailable", {
      quantidadeArquivos: arquivos.length,
      originalDryRun: options.dryRun ?? false,
      fallbackDryRun: true,
    });
    const fakeDb = {
      transaction: async () => {
        throw new Error("Transação indisponível sem banco de dados");
      },
    } as unknown as Awaited<ReturnType<typeof getDb>>;

    const details = await importArquivos(fakeDb as any, arquivos, fallbackOptions);
    const summary = buildImportJobReport(details);
    return { summary, details };
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
