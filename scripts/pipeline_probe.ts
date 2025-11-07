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
  csv: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: Partial<CliOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--csv" && args[i + 1]) {
      options.csv = args[++i];
    }
  }

  if (!options.csv) {
    throw new Error("Missing --csv path");
  }

  return options as CliOptions;
}

function maskConnection() {
  const host = process.env.DB_HOST ?? "localhost";
  const port = process.env.DB_PORT ?? "3306";
  const user = process.env.DB_USER ?? "sandbox";
  return `${user}@${host}:${port}`;
}

async function loadCsv(filePath: string): Promise<UploadFile> {
  const buffer = await fsp.readFile(filePath);
  return {
    nome: path.basename(filePath),
    base64: buffer.toString("base64"),
  };
}

async function main() {
  const { csv } = parseArgs();
  console.log(`[probe] using database ${maskConnection()}`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "sandbox",
    password: process.env.DB_PASSWORD ?? "sandbox",
    database: process.env.DB_NAME ?? "sandbox",
  });

  try {
    const file = await loadCsv(csv);
    const db = drizzle(connection);

    console.log("[probe] dry-run");
    const dryRun = await importArquivos(db as any, [file], { dryRun: true });
    console.log(JSON.stringify(dryRun, null, 2));

    console.log("[probe] real import");
    const real = await importArquivos(db as any, [file], { dryRun: false });
    console.log(JSON.stringify(real, null, 2));

    const totals = await db
      .select({
        totalVendas: sql<number>`COUNT(*)`,
        valorTotalCentavos: sql<number>`COALESCE(SUM(${movimentacoes.valorTotal}), 0)`
      })
      .from(movimentacoes);

    const metrics = totals[0];
    const pass = (metrics?.totalVendas ?? 0) > 0;

    console.log(
      JSON.stringify(
        {
          counts: metrics,
          verdict: pass ? "PASS" : "FAIL",
        },
        null,
        2
      )
    );

    if (!pass) {
      process.exitCode = 1;
    }
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error("Pipeline probe failed", error);
  process.exit(1);
});
