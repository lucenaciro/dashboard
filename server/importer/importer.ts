import type { MySql2Database, MySql2Transaction, MySqlRawQueryResult } from "drizzle-orm/mysql2";
import {
  FileImportSummary,
  ImportOptions,
  ImportSummary,
  RowContext,
  RowError,
  UploadFile,
  ValidRecord,
  ImportFileType,
  NormalizedRow,
} from "./types";
import { createCsvParser } from "./parser";
import { inferFileType, isBlankRow } from "./utils";
import { validateRow } from "./row-validators";
import { logger } from "../logger";
import {
  clientes,
  vendedores,
  produtos,
  movimentacoes,
  estoque,
} from "../../drizzle/schema";
import { MAX_SKIP_REASONS_IN_SUMMARY } from "./constants";

const enum SkipReason {
  BlankRow = "Linha em branco",
  Validation = "Falha de validação",
  MissingType = "Tipo de arquivo não reconhecido",
  MissingHeader = "Cabeçalhos obrigatórios ausentes",
  Persistence = "Erro ao persistir registro",
}

type Database = MySql2Database<any>;
type Transaction = MySql2Transaction<any, any>;

type UpsertResult = {
  inserted: number;
  updated: number;
};

export class ImportJobError extends Error {
  constructor(message: string, public readonly summary: ImportSummary, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ImportJobError";
  }
}

function createInitialSummary(fileName: string, type: ImportFileType | "desconhecido", dryRun: boolean): FileImportSummary {
  const startedAt = new Date();
  return {
    fileName,
    type,
    totalRows: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    dryRun,
    errors: [],
    warnings: [],
    skipReasonCounts: {},
    startedAt: startedAt.toISOString(),
    finishedAt: startedAt.toISOString(),
    durationMs: 0,
  };
}

function registerSkip(summary: FileImportSummary, reason: SkipReason) {
  summary.skipped += 1;
  summary.skipReasonCounts[reason] = (summary.skipReasonCounts[reason] ?? 0) + 1;
}

function finalizeSummary(summary: FileImportSummary, startedAt: Date) {
  const finished = new Date();
  summary.finishedAt = finished.toISOString();
  summary.durationMs = finished.getTime() - startedAt.getTime();
  summary.skipReasonCounts = Object.fromEntries(
    Object.entries(summary.skipReasonCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, MAX_SKIP_REASONS_IN_SUMMARY)
  );
}

function appendErrors(summary: FileImportSummary, errors: RowError[]) {
  summary.errors.push(...errors);
}

function trackError(summary: FileImportSummary, error: Error, ctx: RowContext, column?: string) {
  const rowError: RowError = {
    rowNumber: ctx.rowNumber,
    column,
    reason: error.message,
    value: null,
  };
  summary.errors.push(rowError);
}

function toNullable(value: string | null): string | null {
  return value ?? null;
}

async function upsertCliente(tx: Transaction, record: ValidRecord & { kind: "clientes" }): Promise<UpsertResult> {
  const data = record.data;
  const result = await tx
    .insert(clientes)
    .values({
      codigoCliente: data.codigoCliente,
      nome: data.nome,
      cnpj: toNullable(data.cnpj),
      endereco: toNullable(data.endereco),
      bairro: toNullable(data.bairro),
      municipio: toNullable(data.municipio),
      estado: toNullable(data.estado),
      cep: toNullable(data.cep),
      email: toNullable(data.email),
      telefone: toNullable(data.telefone),
      inscricaoEstadual: toNullable(data.inscricaoEstadual),
      tipoCliente: data.tipoCliente,
    })
    .onDuplicateKeyUpdate({
      set: {
        nome: data.nome,
        cnpj: toNullable(data.cnpj),
        endereco: toNullable(data.endereco),
        bairro: toNullable(data.bairro),
        municipio: toNullable(data.municipio),
        estado: toNullable(data.estado),
        cep: toNullable(data.cep),
        email: toNullable(data.email),
        telefone: toNullable(data.telefone),
        inscricaoEstadual: toNullable(data.inscricaoEstadual),
        tipoCliente: data.tipoCliente,
      },
    });
  return normalizeResult(result);
}

async function upsertVendedor(tx: Transaction, record: ValidRecord & { kind: "vendedores" }): Promise<UpsertResult> {
  const data = record.data;
  const result = await tx
    .insert(vendedores)
    .values({
      codigoVendedor: data.codigoVendedor,
      nome: data.nome,
      ativo: data.ativo,
    })
    .onDuplicateKeyUpdate({
      set: {
        nome: data.nome,
        ativo: data.ativo,
      },
    });
  return normalizeResult(result);
}

async function upsertProduto(tx: Transaction, record: ValidRecord & { kind: "produtos" }): Promise<UpsertResult> {
  const data = record.data;
  const result = await tx
    .insert(produtos)
    .values({
      codigoProduto: data.codigoProduto,
      descricao: data.descricao,
    })
    .onDuplicateKeyUpdate({
      set: {
        descricao: data.descricao,
      },
    });
  return normalizeResult(result);
}

async function upsertMovimentacao(tx: Transaction, record: ValidRecord & { kind: "movimentacoes" }): Promise<UpsertResult> {
  const data = record.data;
  const result = await tx
    .insert(movimentacoes)
    .values({
      distribuidor: toNullable(data.distribuidor),
      cnpjDistribuidor: toNullable(data.cnpjDistribuidor),
      codigoVendedor: toNullable(data.codigoVendedor),
      nomeVendedor: toNullable(data.nomeVendedor),
      codigoCliente: data.codigoCliente,
      nomeCliente: toNullable(data.nomeCliente),
      codigoProduto: data.codigoProduto,
      nomeProduto: toNullable(data.nomeProduto),
      quantidade: data.quantidade,
      valorTotal: data.valorTotalCentavos,
      data: data.data,
      numeroNota: toNullable(data.numeroNota),
      tipoSaida: toNullable(data.tipoSaida),
      descricaoSaida: toNullable(data.descricaoSaida),
      tabelaPrecos: toNullable(data.tabelaPrecos),
      vendaComQRCode: data.vendaComQRCode,
      fingerprint: data.fingerprint,
    })
    .onDuplicateKeyUpdate({
      set: {
        distribuidor: toNullable(data.distribuidor),
        cnpjDistribuidor: toNullable(data.cnpjDistribuidor),
        codigoVendedor: toNullable(data.codigoVendedor),
        nomeVendedor: toNullable(data.nomeVendedor),
        nomeCliente: toNullable(data.nomeCliente),
        nomeProduto: toNullable(data.nomeProduto),
        quantidade: data.quantidade,
        valorTotal: data.valorTotalCentavos,
        data: data.data,
        tipoSaida: toNullable(data.tipoSaida),
        descricaoSaida: toNullable(data.descricaoSaida),
        tabelaPrecos: toNullable(data.tabelaPrecos),
        vendaComQRCode: data.vendaComQRCode,
      },
    });
  return normalizeResult(result);
}

async function upsertEstoque(tx: Transaction, record: ValidRecord & { kind: "estoque" }): Promise<UpsertResult> {
  const data = record.data;
  const result = await tx
    .insert(estoque)
    .values({
      distribuidor: toNullable(data.distribuidor),
      codigoProduto: data.codigoProduto,
      quantidade: data.quantidade,
      dataEstoque: data.dataEstoque,
      fingerprint: data.fingerprint,
    })
    .onDuplicateKeyUpdate({
      set: {
        distribuidor: toNullable(data.distribuidor),
        quantidade: data.quantidade,
        dataEstoque: data.dataEstoque,
      },
    });
  return normalizeResult(result);
}

async function persistRecord(tx: Transaction, record: ValidRecord): Promise<UpsertResult> {
  switch (record.kind) {
    case "clientes":
      return upsertCliente(tx, record);
    case "vendedores":
      return upsertVendedor(tx, record);
    case "produtos":
      return upsertProduto(tx, record);
    case "movimentacoes":
      return upsertMovimentacao(tx, record);
    case "estoque":
      return upsertEstoque(tx, record);
    default:
      return { inserted: 0, updated: 0 };
  }
}

function normalizeResult(result: MySqlRawQueryResult): UpsertResult {
  const affected = (result as unknown as { affectedRows?: number }).affectedRows ?? 0;
  if (affected === 0) return { inserted: 0, updated: 0 };
  if (affected === 1) return { inserted: 1, updated: 0 };
  return { inserted: 0, updated: 1 };
}

export async function importArquivos(db: Database, arquivos: UploadFile[], options: ImportOptions = {}): Promise<ImportSummary> {
  const startedAt = new Date();
  const dryRun = options.dryRun ?? false;
  const summaries: FileImportSummary[] = [];

  const finalizeJob = (finishedAt: Date) => finalizeImportJob(summaries, startedAt, finishedAt, dryRun);

  for (const arquivo of arquivos) {
    const type = inferFileType(arquivo.nome);
    const summary = createInitialSummary(arquivo.nome, type ?? "desconhecido", dryRun);
    const fileStartedAt = new Date();
    let finalized = false;
    let fileStatus: "success" | "failed" = "success";
    let scannedRows = 0;
    let validatedRows = 0;
    let failedValidations = 0;

    const finalizeCurrentFile = (status: "success" | "failed" = "success") => {
      if (finalized) return;
      fileStatus = status;
      if (dryRun) {
        summary.warnings.push({
          rowNumber: 0,
          reason: "Dry-run: nenhuma escrita realizada; totais representam operações previstas.",
        });
      }
      finalizeSummary(summary, fileStartedAt);
      summaries.push(summary);
      finalized = true;
      logger.info("import:file-summary", {
        fileName: summary.fileName,
        type: summary.type,
        status: fileStatus,
        totals: {
          rows: summary.totalRows,
          inserted: summary.inserted,
          updated: summary.updated,
          skipped: summary.skipped,
        },
        warnings: summary.warnings.length,
        errors: summary.errors.length,
        skipReasons: summary.skipReasonCounts,
        dryRun: summary.dryRun,
        durationMs: summary.durationMs,
        scannedRows,
        validatedRows,
        failedValidations,
      });
    };

    if (!type) {
      registerSkip(summary, SkipReason.MissingType);
      summary.errors.push({
        rowNumber: 0,
        column: undefined,
        reason: `Não foi possível inferir o tipo do arquivo a partir do nome "${arquivo.nome}"`,
        value: null,
      });
      finalizeCurrentFile();
      continue;
    }

    try {
      const buffer = Buffer.from(arquivo.base64, "base64");
      logger.info("import:file-start", {
        fileName: arquivo.nome,
        detectedType: type,
        dryRun,
        sizeBytes: buffer.length,
      });
      const parser = createCsvParser(buffer, type);
      logger.info("import:parser-created", {
        fileName: arquivo.nome,
        type,
      });

      const processRow = async (row: NormalizedRow, tx?: Transaction) => {
        scannedRows += 1;
        const rowNumber = row.__rowNumber ?? summary.totalRows + 2;
        const context: RowContext = { rowNumber, type, fileName: arquivo.nome };

        if (isBlankRow(row)) {
          registerSkip(summary, SkipReason.BlankRow);
          summary.warnings.push({ rowNumber, reason: "Linha em branco ignorada" });
          return;
        }

        summary.totalRows += 1;

        const validation = validateRow(row, context);
        if (!validation.success || !validation.data) {
          registerSkip(summary, SkipReason.Validation);
          appendErrors(summary, validation.errors ?? []);
          failedValidations += 1;
          return;
        }

        const record = validation.data;
        validatedRows += 1;

        if (dryRun || !tx) {
          summary.inserted += 1;
          return;
        }

        try {
          const result = await persistRecord(tx, record);
          summary.inserted += result.inserted;
          summary.updated += result.updated;
        } catch (error) {
          registerSkip(summary, SkipReason.Persistence);
          trackError(summary, error as Error, context);
          throw error;
        }
      };

      if (dryRun) {
        for await (const row of parser.stream) {
          await processRow(row);
        }
      } else {
        await db.transaction(async tx => {
          for await (const row of parser.stream) {
            await processRow(row, tx);
          }
        });
      }

      const missingHeaders = parser.getMissingHeaders();
      const presentHeaders = parser.getPresentHeaders();
      logger.info("import:file-rows", {
        fileName: arquivo.nome,
        type,
        dryRun,
        scannedRows,
        validatedRows,
        failedValidations,
        presentHeaders,
        missingHeaders,
      });
      if (missingHeaders.length > 0) {
        registerSkip(summary, SkipReason.MissingHeader);
        summary.warnings.push({
          rowNumber: 1,
          reason: `Cabeçalhos ausentes: ${missingHeaders.join(", ")}`,
        });
        logger.warn("import:missing-headers", {
          fileName: arquivo.nome,
          type,
          missingHeaders,
        });
      }
    } catch (error) {
      if (summary.errors.length === 0) {
        registerSkip(summary, SkipReason.Persistence);
        summary.errors.push({
          rowNumber: 0,
          column: undefined,
          reason: (error as Error).message,
          value: null,
        });
      }

      finalizeCurrentFile("failed");
      const aggregated = finalizeJob(new Date());
      logger.error(`Falha ao processar arquivo ${arquivo.nome}`, {
        error,
        fileName: arquivo.nome,
        type,
        totals: {
          rows: summary.totalRows,
          inserted: summary.inserted,
          updated: summary.updated,
          skipped: summary.skipped,
        },
      });
      throw new ImportJobError(`Falha ao processar o arquivo ${arquivo.nome}`, aggregated, { cause: error });
    } finally {
      finalizeCurrentFile(fileStatus);
    }
  }

  return finalizeJob(new Date());
}

function finalizeImportJob(
  summaries: FileImportSummary[],
  startedAt: Date,
  finishedAt: Date,
  dryRun: boolean
): ImportSummary {
  const totals = summaries.reduce(
    (acc, item) => {
      acc.rows += item.totalRows;
      acc.inserted += item.inserted;
      acc.updated += item.updated;
      acc.skipped += item.skipped;
      return acc;
    },
    { rows: 0, inserted: 0, updated: 0, skipped: 0 }
  );

  return {
    dryRun,
    files: summaries,
    totals,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
  };
}
