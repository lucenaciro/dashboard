#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { processarUpload } from "../server/process-upload";
import type { UploadFile } from "../server/importer/types";
import { ImportJobError } from "../server/importer/importer";
import { buildImportJobReport } from "../server/importer/summary";

interface CliOptions {
  dryRun: boolean;
  files: Record<string, string>;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: false, files: {} };
  for (const arg of argv) {
    if (arg === "--dry-run" || arg === "-d") {
      options.dryRun = true;
      continue;
    }
    const [kind, filePath] = arg.split("=");
    if (!kind || !filePath) {
      throw new Error(`Invalid argument "${arg}". Expected formato tipo=arquivo.csv`);
    }
    options.files[kind] = filePath;
  }
  if (Object.keys(options.files).length === 0) {
    throw new Error("Informe ao menos um arquivo no formato tipo=arquivo.csv");
  }
  return options;
}

async function loadFiles(files: Record<string, string>): Promise<UploadFile[]> {
  const uploads: UploadFile[] = [];
  for (const [kind, path] of Object.entries(files)) {
    const absolute = resolve(path);
    const buffer = await readFile(absolute);
    uploads.push({ nome: `${kind}-${basename(absolute)}`, base64: buffer.toString("base64") });
  }
  return uploads;
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const uploads = await loadFiles(args.files);
    const result = await processarUpload(uploads, { dryRun: args.dryRun });
    console.log(JSON.stringify({ summary: result.summary, totals: result.details.totals }, null, 2));
    if (args.dryRun) {
      console.log("✅ Dry-run concluído. Nenhum dado foi gravado.");
    } else {
      console.log("✅ Importação concluída com sucesso.");
    }
  } catch (error) {
    if (error instanceof ImportJobError) {
      console.error("❌ Falha ao reprocessar CSVs:", error.message);
      console.error(JSON.stringify({ summary: buildImportJobReport(error.summary) }, null, 2));
    } else {
      console.error("❌ Falha ao reprocessar CSVs:", error);
    }
    process.exitCode = 1;
  }
}

void main();
