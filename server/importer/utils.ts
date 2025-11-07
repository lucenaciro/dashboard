import { createHash } from "node:crypto";
import { HEADER_ALIAS_MAP, BOOLEAN_TRUE_VALUES, BOOLEAN_FALSE_VALUES } from "./constants";
import { ImportFileType, NormalizedRow } from "./types";

const NON_WORD_PATTERN = /[^a-z0-9]+/g;

export const DATE_PATTERNS = [
  /^(\d{2})\/(\d{2})\/(\d{4})$/,
  /^(\d{2})-(\d{2})-(\d{4})$/,
];

export function normalizeHeader(rawHeader: string): string {
  const noBom = rawHeader.replace(/^\uFEFF/, "");
  const normalized = noBom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(NON_WORD_PATTERN, "_")
    .replace(/^_+|_+$/g, "");
  return normalized;
}

export function mapHeader(type: ImportFileType, rawHeader: string): string {
  const normalized = normalizeHeader(rawHeader);
  const aliasMap = HEADER_ALIAS_MAP[type];

  for (const [target, aliases] of Object.entries(aliasMap)) {
    if (target === normalized || aliases.includes(normalized)) {
      return target;
    }
  }

  return normalized;
}

export function normalizeRowValues(row: Record<string, unknown>): NormalizedRow {
  const normalized: NormalizedRow = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "__rowNumber") {
      normalized.__rowNumber = typeof value === "number" ? value : undefined;
      continue;
    }

    if (value === null || value === undefined) {
      normalized[key] = null;
      continue;
    }

    if (typeof value === "string") {
      const cleaned = value
        .replace(/^\uFEFF/, "")
        .replace(/\r/g, "")
        .trim();
      normalized[key] = cleaned.length === 0 ? null : cleaned;
      continue;
    }

    normalized[key] = String(value);
  }
  return normalized;
}

export function parseOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).replace(/\r/g, "").trim();
  return str.length === 0 ? null : str;
}

export function parseRequiredString(value: unknown, field: string): string {
  const parsed = parseOptionalString(value);
  if (parsed === null) {
    throw new Error(`Campo "${field}" é obrigatório`);
  }
  return parsed;
}

export function parseBoolean(value: unknown): boolean | null {
  const parsed = parseOptionalString(value);
  if (parsed === null) return null;
  const normalized = parsed.toLowerCase();
  if (BOOLEAN_TRUE_VALUES.has(normalized)) return true;
  if (BOOLEAN_FALSE_VALUES.has(normalized)) return false;
  return null;
}

export function parseInteger(value: unknown, field: string): number {
  const parsed = parseOptionalString(value);
  if (parsed === null) {
    throw new Error(`Campo "${field}" é obrigatório`);
  }
  const normalized = parsed.replace(/\./g, "").replace(/,/g, ".");
  const number = Number(normalized);
  if (!Number.isFinite(number)) {
    throw new Error(`Valor numérico inválido em "${field}": ${parsed}`);
  }
  return Math.round(number);
}

export function parseDecimalToCents(value: unknown, field: string): number {
  const parsed = parseOptionalString(value);
  if (parsed === null) {
    throw new Error(`Campo "${field}" é obrigatório`);
  }
  const sanitized = parsed
    .replace(/R\$/gi, "")
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  if (!/^[-+]?\d*(?:\.\d+)?$/.test(sanitized)) {
    throw new Error(`Valor monetário inválido em "${field}": ${parsed}`);
  }
  const [integerPart, decimalPart = ""] = sanitized.split(".");
  const cents = integerPart + decimalPart.padEnd(2, "0").slice(0, 2);
  return Number.parseInt(cents, 10);
}

export function parseOptionalDecimalToCents(value: unknown): number | null {
  const parsed = parseOptionalString(value);
  if (parsed === null) return null;
  const sanitized = parsed
    .replace(/R\$/gi, "")
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  if (!/^[-+]?\d*(?:\.\d+)?$/.test(sanitized)) {
    return null;
  }
  const [integerPart, decimalPart = ""] = sanitized.split(".");
  const cents = integerPart + decimalPart.padEnd(2, "0").slice(0, 2);
  return Number.parseInt(cents, 10);
}

export function parseDateFlexible(value: unknown, field: string): Date {
  const parsed = parseOptionalString(value);
  if (parsed === null) {
    throw new Error(`Campo "${field}" é obrigatório`);
  }

  for (const pattern of DATE_PATTERNS) {
    const match = pattern.exec(parsed);
    if (match) {
      const [, rawDay, rawMonth, rawYear] = match;
      const day = Number.parseInt(rawDay, 10);
      const month = Number.parseInt(rawMonth, 10);
      const year = Number.parseInt(rawYear, 10);
      const candidate = new Date(Date.UTC(year, month - 1, day));
      if (candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day) {
        return candidate;
      }
      throw new Error(`Data inválida em "${field}": ${parsed}`);
    }
  }

  const isoCandidate = new Date(parsed);
  if (!Number.isNaN(isoCandidate.getTime())) {
    return isoCandidate;
  }

  throw new Error(`Formato de data inválido em "${field}": ${parsed}`);
}

export function parseOptionalDate(value: unknown): Date | null {
  const parsed = parseOptionalString(value);
  if (parsed === null) return null;
  for (const pattern of DATE_PATTERNS) {
    const match = pattern.exec(parsed);
    if (match) {
      const [, rawDay, rawMonth, rawYear] = match;
      const day = Number.parseInt(rawDay, 10);
      const month = Number.parseInt(rawMonth, 10);
      const year = Number.parseInt(rawYear, 10);
      const candidate = new Date(Date.UTC(year, month - 1, day));
      if (candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day) {
        return candidate;
      }
      return null;
    }
  }

  const isoCandidate = new Date(parsed);
  return Number.isNaN(isoCandidate.getTime()) ? null : isoCandidate;
}

export function computeMovimentacaoFingerprint(input: {
  codigoCliente: string;
  codigoProduto: string;
  data: Date;
  numeroNota: string | null;
  quantidade: number;
  valorTotalCentavos: number;
}): string {
  const payload = [
    input.codigoCliente,
    input.codigoProduto,
    input.data.toISOString(),
    input.numeroNota ?? "",
    input.quantidade.toString(),
    input.valorTotalCentavos.toString(),
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
}

export function computeEstoqueFingerprint(input: {
  codigoProduto: string;
  dataEstoque: Date;
  quantidade: number;
  distribuidor: string | null;
}): string {
  const payload = [
    input.codigoProduto,
    input.dataEstoque.toISOString(),
    input.quantidade.toString(),
    input.distribuidor ?? "",
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
}

export function inferFileType(nomeArquivo: string): ImportFileType | null {
  const normalized = nomeArquivo.toLowerCase();
  if (normalized.includes("cliente")) return "clientes";
  if (normalized.includes("vendedor")) return "vendedores";
  if (normalized.includes("produto")) return "produtos";
  if (normalized.includes("mov")) return "movimentacoes";
  if (normalized.includes("venda")) return "movimentacoes";
  if (normalized.includes("distribuidor")) return "movimentacoes";
  if (normalized.includes("estoque")) return "estoque";
  return null;
}

export function isBlankRow(row: NormalizedRow): boolean {
  return Object.entries(row)
    .filter(([key]) => key !== "__rowNumber")
    .every(([, value]) => value === null || value === "");
}
