import { Readable } from "node:stream";
import { parse } from "csv-parse";
import type { Options as CsvParseOptions, CastingContext } from "csv-parse";
import { ImportFileType, NormalizedRow } from "./types";
import { FileType, canonicalizeHeader, REQUIRED_FIELDS, NORMALIZE_HEADER } from "@/shared/headerAliases";

export interface ParserResult {
  stream: AsyncIterable<NormalizedRow>;
  getMissingHeaders: () => string[];
  getPresentHeaders: () => string[];
}

const RE_DECIMAL_PT = /^-?\d{1,3}(\.\d{3})*,\d{2}$/;

export const parseMoneyPtBR = (s?: string | null): number | null => {
  if (!s) return null;
  const t = s
    .toString()
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export const parseDatePtBR = (s?: string | null): Date | null => {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isFinite(d.getTime()) ? d : null;
};

function toFileType(type: ImportFileType): FileType {
  return type.toUpperCase() as FileType;
}

function detectDelimiter(buffer: Buffer): "," | ";" {
  const preview = buffer.toString("utf8", 0, Math.min(buffer.length, 4096));
  const lines = preview.split(/\r?\n/).slice(0, 5);
  let semicolons = 0;
  let commas = 0;
  let hasDecimalComma = false;

  for (const line of lines) {
    if (!line) continue;
    semicolons += (line.match(/;/g) ?? []).length;
    commas += (line.match(/,/g) ?? []).length;
    if (!hasDecimalComma && RE_DECIMAL_PT.test(line)) {
      hasDecimalComma = true;
    }
  }

  if (hasDecimalComma && semicolons > 0) {
    return ";";
  }

  if (semicolons === 0 && commas === 0) {
    return ";";
  }

  if (semicolons >= commas) {
    return ";";
  }

  return ",";
}

export function buildHeaderMap(file: FileType, headers: string[]): Record<number, string> {
  const map: Record<number, string> = {};
  headers.forEach((header, index) => {
    const normalized = NORMALIZE_HEADER(header);
    if (!normalized) {
      return;
    }
    const canonical = canonicalizeHeader(file, header);
    if (canonical) {
      map[index] = canonical;
    }
  });
  return map;
}

export function createCsvParser(buffer: Buffer, type: ImportFileType): ParserResult {
  const fileType = toFileType(type);
  const requiredHeaders = new Set(REQUIRED_FIELDS[fileType] ?? []);
  const presentHeaders = new Set<string>();
  let missingHeaders: string[] = [];
  let headerMap: Record<number, string> = {};
  const delimiter = detectDelimiter(buffer);

  const options = {
    bom: true,
    delimiter,
    relaxColumnCount: true,
    skipEmptyLines: false,
    trim: false,
    record_delimiter: ["\r\n", "\n", "\r"],
    columns: false,
    on_record(record: string[], context: CastingContext) {
      if (Object.keys(headerMap).length === 0) {
        const headerRow = record.map(value => (value ?? "").toString());
        headerMap = buildHeaderMap(fileType, headerRow);
        for (const value of Object.values(headerMap)) {
          presentHeaders.add(value);
        }
        missingHeaders = Array.from(requiredHeaders).filter(field => !presentHeaders.has(field));
        return null;
      }

      const normalized: NormalizedRow = {};

      record.forEach((value, index) => {
        const key = headerMap[index];
        if (!key) return;
        if (value === null || value === undefined) {
          normalized[key] = null;
          return;
        }
        const cleaned = value
          .toString()
          .replace(/^\uFEFF/, "")
          .replace(/\r/g, "")
          .trim();
        normalized[key] = cleaned.length === 0 ? null : cleaned;
      });

      normalized.__rowNumber = context.lines;
      return normalized;
    },
  } as unknown as CsvParseOptions;

  const parser = parse(options);

  const readable = Readable.from(buffer);
  readable.pipe(parser);

  return {
    stream: parser as AsyncIterable<NormalizedRow>,
    getMissingHeaders: () => missingHeaders,
    getPresentHeaders: () => Array.from(presentHeaders),
  };
}
