import { Readable } from "node:stream";
import { parse } from "csv-parse";
import { ImportFileType, NormalizedRow } from "./types";
import { normalizeRowValues } from "./utils";
import { logger } from "../logger";
import { describeUnknownHeaders, resolveHeaders } from "./header-mapping";

export interface ParserResult {
  stream: AsyncIterable<NormalizedRow>;
  getMissingHeaders: () => string[];
  getPresentHeaders: () => string[];
  getUnknownHeaders: () => Array<{ original: string; canonical: string }>;
  waitForHeaders: () => Promise<void>;
}

function detectDelimiter(buffer: Buffer): "," | ";" {
  const preview = buffer.toString("utf8", 0, Math.min(buffer.length, 2048));
  const firstLine = preview.split(/\r?\n/)[0] ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  if (semicolons === 0 && commas === 0) {
    return ";";
  }
  if (semicolons >= commas) {
    return ";";
  }
  return ",";
}

export function createCsvParser(buffer: Buffer, type: ImportFileType): ParserResult {
  const presentHeaders = new Set<string>();
  let missingHeaders: string[] = [];
  let unknownHeaders: Array<{ original: string; canonical: string }> = [];
  const delimiter = detectDelimiter(buffer);
  let headersReadyResolve: (() => void) | null = null;
  let headersReadyReject: ((error: Error) => void) | null = null;

  const headersReady = new Promise<void>((resolve, reject) => {
    headersReadyResolve = resolve;
    headersReadyReject = reject;
  });

  const parser = parse({
    bom: true,
    delimiter,
    relaxColumnCount: true,
    skipEmptyLines: false,
    trim: false,
    record_delimiter: ["\r\n", "\n", "\r"],
    columns: header => {
      presentHeaders.clear();
      const resolution = resolveHeaders(type, header);
      missingHeaders = resolution.missingInternal;
      unknownHeaders = resolution.unknown;

      resolution.columns.forEach((column, index) => {
        if (resolution.indexToCanonical[index]) {
          presentHeaders.add(column);
        }
      });

      if (unknownHeaders.length > 0) {
        logger.warn("Cabeçalhos desconhecidos detectados", {
          type,
          headers: describeUnknownHeaders(unknownHeaders),
        });
      }

      if (missingHeaders.length > 0) {
        logger.error("Cabeçalhos obrigatórios ausentes", {
          type,
          missingCanonical: resolution.missingCanonical,
          missingInternal: missingHeaders,
        });
      }

      if (headersReadyResolve) {
        headersReadyResolve();
        headersReadyResolve = null;
        headersReadyReject = null;
      }

      return resolution.columns;
    },
    on_record(record: Record<string, unknown>, context) {
      const normalized = normalizeRowValues(record);
      normalized.__rowNumber = context.lines;
      return normalized;
    },
  });

  parser.once("error", error => {
    if (headersReadyReject) {
      headersReadyReject(error);
      headersReadyReject = null;
      headersReadyResolve = null;
    }
  });

  parser.once("end", () => {
    if (headersReadyResolve) {
      headersReadyResolve();
      headersReadyResolve = null;
      headersReadyReject = null;
    }
  });

  const readable = Readable.from(buffer);
  readable.pipe(parser); // parser is a stream and AsyncIterable

  return {
    stream: parser as AsyncIterable<NormalizedRow>,
    getMissingHeaders: () => missingHeaders,
    getPresentHeaders: () => Array.from(presentHeaders),
    getUnknownHeaders: () => unknownHeaders,
    waitForHeaders: () => headersReady,
  };
}
