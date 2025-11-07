import { getDb } from "./db";
import type { ImportOptions, UploadFile } from "./importer/types";
import { importArquivos } from "./importer/importer";
import { logger } from "./logger";

export async function processarUpload(arquivos: UploadFile[], options: ImportOptions = {}) {
  const db = await getDb();
  if (!db) {
    logger.error("Banco de dados indisponível durante o processamento de upload", { quantidadeArquivos: arquivos.length });
    throw new Error("Banco de dados indisponível");
  }

  logger.info("Iniciando processamento de upload", {
    quantidadeArquivos: arquivos.length,
    dryRun: options.dryRun ?? false,
  });

  const resultado = await importArquivos(db, arquivos, options);

  logger.info("Processamento concluído", resultado.totals);

  return resultado;
}
