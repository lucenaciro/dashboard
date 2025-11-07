#!/usr/bin/env tsx
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { sql } from "drizzle-orm";
import { getDb, getDatabaseConnectionInfo, logDatabaseConnection } from "../server/db";
import { processarUpload } from "../server/process-upload";
import type { UploadFile } from "../server/importer/types";
import { inferFileType } from "../server/importer/utils";
import { buildImportJobReport } from "../server/importer/summary";
import { ImportJobError } from "../server/importer/importer";
import { recomputeDashboardAggregates } from "../server/metrics/service";
import { clientes, vendedores, produtos, movimentacoes, estoque } from "../drizzle/schema";

interface TableMetrics {
  movimentacoes: { total: number; valor: number };
  clientes: number;
  vendedores: number;
  produtos: number;
  estoque: { total: number; quantidade: number };
}

function maskValue(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 2) return "*".repeat(value.length);
  return `${value[0]}${"*".repeat(Math.max(1, value.length - 2))}${value[value.length - 1]}`;
}

async function loadUploadsFromPath(inputPath: string): Promise<UploadFile[]> {
  const stats = await stat(inputPath);

  if (stats.isDirectory()) {
    const entries = await readdir(inputPath);
    const uploads: UploadFile[] = [];
    for (const entry of entries) {
      const filePath = path.join(inputPath, entry);
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) continue;
      const kind = inferFileType(entry);
      if (!kind) continue;
      const buffer = await readFile(filePath);
      uploads.push({ nome: entry, base64: buffer.toString("base64") });
    }
    return uploads;
  }

  if (!stats.isFile()) {
    throw new Error(`Caminho ${inputPath} não é um arquivo ou diretório válido`);
  }

  const filename = path.basename(inputPath);
  const kind = inferFileType(filename);
  if (!kind) {
    throw new Error(`Não foi possível inferir o tipo do arquivo para ${filename}`);
  }
  const buffer = await readFile(inputPath);
  return [{ nome: filename, base64: buffer.toString("base64") }];
}

function cloneUploads(uploads: UploadFile[]): UploadFile[] {
  return uploads.map(upload => ({ ...upload }));
}

async function fetchTableMetrics(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<TableMetrics> {
  const [mov] = await db
    .select({
      total: sql<number>`COUNT(*)`.as("total"),
      valor: sql<number>`COALESCE(SUM(${movimentacoes.valorTotal}), 0)`.as("valor"),
    })
    .from(movimentacoes);

  const [clientesCount] = await db
    .select({ total: sql<number>`COUNT(*)`.as("total") })
    .from(clientes);

  const [vendedoresCount] = await db
    .select({ total: sql<number>`COUNT(*)`.as("total") })
    .from(vendedores);

  const [produtosCount] = await db
    .select({ total: sql<number>`COUNT(*)`.as("total") })
    .from(produtos);

  const [estoqueCount] = await db
    .select({
      total: sql<number>`COUNT(*)`.as("total"),
      quantidade: sql<number>`COALESCE(SUM(${estoque.quantidade}), 0)`.as("quantidade"),
    })
    .from(estoque);

  return {
    movimentacoes: { total: mov?.total ?? 0, valor: mov?.valor ?? 0 },
    clientes: clientesCount?.total ?? 0,
    vendedores: vendedoresCount?.total ?? 0,
    produtos: produtosCount?.total ?? 0,
    estoque: { total: estoqueCount?.total ?? 0, quantidade: estoqueCount?.quantidade ?? 0 },
  };
}

async function main() {
  try {
    const inputPath = process.argv[2];
    if (!inputPath) {
      throw new Error('Uso: npm run probe:csv "<caminho>"');
    }

    const uploads = await loadUploadsFromPath(path.resolve(process.cwd(), inputPath));
    if (uploads.length === 0) {
      throw new Error("Nenhum CSV reconhecido foi encontrado");
    }

    logDatabaseConnection("probe");
    const descriptor = getDatabaseConnectionInfo();
    console.log("[probe] database", {
      host: descriptor?.host ?? "unknown",
      database: maskValue(descriptor?.database),
      schema: maskValue(descriptor?.schema),
      searchPath: maskValue(descriptor?.searchPath),
    });

    const db = await getDb({ role: "probe" });
    if (!db) {
      throw new Error("Banco de dados indisponível para o probe");
    }

    const before = await fetchTableMetrics(db);
    console.log("[probe] sql:before", before);

    const dryRunResult = await processarUpload(cloneUploads(uploads), { dryRun: true });
    console.log("[probe] dryRun", dryRunResult.summary);

    const realResult = await processarUpload(cloneUploads(uploads), { dryRun: false });
    console.log("[probe] import", realResult.summary);

    const after = await fetchTableMetrics(db);
    console.log("[probe] sql:after", after);

    const snapshot = await recomputeDashboardAggregates();
    console.log("[probe] metrics", snapshot);

    const inserted = realResult.summary.inserted;
    const updated = realResult.summary.updated;
    const deltaMov = after.movimentacoes.total - before.movimentacoes.total;
    const deltaValor = after.movimentacoes.valor - before.movimentacoes.valor;

    const pass = inserted + updated > 0 && (deltaMov > 0 || deltaValor !== 0 || updated > 0);
    const verdict = {
      verdict: pass ? "PASS" : "FAIL",
      inserted,
      updated,
      deltaMov,
      deltaValor,
      message: pass
        ? "Importação gerou alterações nas tabelas de movimentações."
        : "Importação não alterou contagens nem valores detectáveis.",
    };

    console.log("[probe] verdict", verdict);
  } catch (error) {
    if (error instanceof ImportJobError) {
      console.error("[probe] import:error", error.message);
      console.error("[probe] import:summary", buildImportJobReport(error.summary));
    } else {
      console.error("[probe] error", error);
    }
    process.exitCode = 1;
  }
}

void main();
