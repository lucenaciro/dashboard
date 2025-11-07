import { Readable } from "node:stream";
import { parse } from "csv-parse";
import { ImportFileType, NormalizedRow } from "./types";
import { getRequiredHeaders } from "./row-validators";
import { mapHeader, normalizeRowValues } from "./utils";

export interface ParserResult {
  stream: AsyncIterable<NormalizedRow>;
  getMissingHeaders: () => string[];
  getPresentHeaders: () => string[];
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
  const required = getRequiredHeaders(type);
  const presentHeaders = new Set<string>();
  let missingHeaders: string[] = [];
  const delimiter = detectDelimiter(buffer);

  const parser = parse({
    bom: true,
    delimiter,
    relaxColumnCount: true,
    skipEmptyLines: false,
    trim: false,
    record_delimiter: ["\r\n", "\n", "\r"],
    columns: header => {
      const mapped = header.map(value => {
        const mappedHeader = mapHeader(type, value);
        presentHeaders.add(mappedHeader);
        return mappedHeader;
      });
      missingHeaders = required.filter(field => !presentHeaders.has(field));
      return mapped;
    },
    on_record(record: Record<string, unknown>, context) {
      const normalized = normalizeRowValues(record);
      normalized.__rowNumber = context.lines;
      return normalized;
    },
  });

  const readable = Readable.from(buffer);
  readable.pipe(parser); // parser is a stream and AsyncIterable

  return {
    stream: parser as AsyncIterable<NormalizedRow>,
    getMissingHeaders: () => missingHeaders,
    getPresentHeaders: () => Array.from(presentHeaders),
  };
}
