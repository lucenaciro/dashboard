import { Buffer } from "node:buffer";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../_core/trpc";
import { processarUpload } from "../process-upload";
import type { UploadFile, ImportFileType } from "./types";
import { logger } from "../logger";

const FileKindEnum = z.enum(["CLIENTES", "VENDEDORES", "PRODUTOS", "MOVIMENTACOES", "ESTOQUE"]);

export const importInputSchema = z.object({
  dryRun: z.boolean().optional().default(true),
  files: z
    .array(
      z.object({
        kind: FileKindEnum,
        csv: z.string().min(1),
      })
    )
    .min(1),
});

const legacyInputSchema = z.object({
  dryRun: z.boolean().optional().default(true),
  clientes: z.string().optional(),
  vendedores: z.string().optional(),
  produtos: z.string().optional(),
  movimentacoes: z.string().optional(),
  estoque: z.string().optional(),
});

type NormalizedInput = z.infer<typeof importInputSchema>;

function toImportFileType(kind: z.infer<typeof FileKindEnum>): ImportFileType {
  return kind.toLowerCase() as ImportFileType;
}

function normalizeInput(payload: unknown): NormalizedInput {
  logger.info("import.trpc:normalize-input", {
    type: payload && typeof payload === "object" ? Object.keys(payload as Record<string, unknown>) : typeof payload,
  });
  const parsedModern = importInputSchema.safeParse(payload);
  if (parsedModern.success) {
    return parsedModern.data;
  }

  const parsedLegacy = legacyInputSchema.safeParse(payload);
  if (!parsedLegacy.success) {
    logger.warn("import.trpc:invalid-payload", {
      issues: parsedModern.error.issues,
    });
    throw new TRPCError({ code: "BAD_REQUEST", message: "Payload de importação inválido", cause: parsedModern.error });
  }

  const { dryRun: legacyDryRun, ...rest } = parsedLegacy.data;
  const files = Object.entries(rest).flatMap(([key, value]) => {
    if (typeof value !== "string") return [];
    const trimmed = value.trim();
    if (!trimmed) return [];
    return [
      {
        kind: key.toUpperCase() as z.infer<typeof FileKindEnum>,
        csv: trimmed,
      },
    ];
  });

  if (files.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum conteúdo CSV fornecido" });
  }

  return {
    dryRun: legacyDryRun ?? true,
    files,
  };
}

function toUploadFiles(files: NormalizedInput["files"]): UploadFile[] {
  return files.map(file => ({
    nome: `${toImportFileType(file.kind)}.csv`,
    base64: Buffer.from(file.csv, "utf8").toString("base64"),
  }));
}

export const dadosRouter = router({
  importar: publicProcedure.input(z.unknown()).mutation(async ({ input }) => {
    const normalized = normalizeInput(input);
    const startedAt = Date.now();

    logger.info("import.trpc:start", {
      dryRun: normalized.dryRun,
      files: normalized.files.length,
      kinds: normalized.files.map(file => file.kind),
    });

    const uploadFiles = toUploadFiles(normalized.files);

    const { summary: report, details } = await processarUpload(uploadFiles, {
      dryRun: normalized.dryRun,
    });

    const totals = details.totals;

    logger.info("import.trpc:completed", {
      dryRun: normalized.dryRun,
      files: normalized.files.length,
      durationMs: Date.now() - startedAt,
      totals,
      topReasons: report.topReasons,
    });

    return {
      sucesso: true,
      dryRun: details.dryRun,
      totals,
      details,
      resumo: details,
      report,
      topReasons: report.topReasons,
      durationMs: report.durationMs,
      totalProcessado: totals.inserted + totals.updated,
      totalInserido: totals.inserted,
      totalAtualizado: totals.updated,
      totalPulos: totals.skipped,
    };
  }),
});
