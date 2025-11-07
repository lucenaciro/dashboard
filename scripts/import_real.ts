import "dotenv/config";
import { promises as fsp } from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { importArquivos } from "../server/importer/importer";
import type { UploadFile } from "../server/importer/types";
import { movimentacoes } from "../drizzle/schema";
import { sql } from "drizzle-orm";

interface CliOptions {
  inputDir: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: Partial<CliOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === "--in" || arg === "-i") && args[i + 1]) {
      options.inputDir = args[++i];
    }
  }

  if (!options.inputDir) {
    throw new Error("Missing --in directory");
  }

  return options as CliOptions;
}

async function collectFiles(dir: string): Promise<UploadFile[]> {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files: UploadFile[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".csv")) continue;
    const filePath = path.join(dir, entry.name);
    const buffer = await fsp.readFile(filePath);
    files.push({ nome: entry.name, base64: buffer.toString("base64") });
  }
  if (files.length === 0) {
    throw new Error(`No CSV files found in ${dir}`);
  }
  return files;
}

async function main() {
  const { inputDir } = parseArgs();
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "sandbox",
    password: process.env.DB_PASSWORD ?? "sandbox",
    database: process.env.DB_NAME ?? "sandbox",
  });

  try {
    const arquivos = await collectFiles(inputDir);
    const db = drizzle(connection);
    const summary = await importArquivos(db as any, arquivos, { dryRun: false });

    const totals = await db
      .select({
        totalVendas: sql<number>`COUNT(*)`,
        valorTotalCentavos: sql<number>`COALESCE(SUM(${movimentacoes.valorTotal}), 0)`
      })
      .from(movimentacoes);

    console.log(
      JSON.stringify(
        {
          summary,
          metrics: totals[0],
        },
        null,
        2
      )
    );
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error("Real import failed", error);
  process.exit(1);
});
