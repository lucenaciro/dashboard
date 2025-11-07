import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { parse } from "csv-parse/sync";
import { canon, HEADER_ALIAS_MAP, type CanonicalHeader } from "../shared/headerAliases";
import { canonicalToInternalField, resolveHeaders } from "../server/importer/header-mapping";
import { inferFileType } from "../server/importer/utils";
import type { ImportFileType } from "../server/importer/types";

type TableRow = {
  file: string;
  original: string;
  canonical: string;
  mappedField: string;
  note: string;
};

type CliOptions = {
  directory?: string;
  files: string[];
};

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = { files: [] };
  for (const arg of args) {
    if (arg.startsWith("--dir=")) {
      options.directory = path.resolve(arg.slice("--dir=".length));
    } else {
      options.files.push(path.resolve(arg));
    }
  }
  return options;
}

async function collectCsvFiles(options: CliOptions): Promise<string[]> {
  if (options.files.length > 0) {
    return options.files;
  }

  const directory = options.directory ?? path.resolve(process.cwd(), "server/importer/__fixtures__");
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".csv"))
    .map(entry => path.resolve(directory, entry.name));
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

function formatCell(value: string): string {
  if (value.length === 0) return "-";
  return value.replace(/\|/g, "\\|");
}

function computeUnknownNote(original: string, canonical: string): string {
  if (!canonical) return "unknown header";
  if (canonical in HEADER_ALIAS_MAP) {
    return "duplicate header";
  }
  return "unknown header";
}

async function buildReportRows(filePath: string): Promise<TableRow[]> {
  const buffer = await fs.readFile(filePath);
  const delimiter = detectDelimiter(buffer);
  const records = parse(buffer, {
    bom: true,
    delimiter,
    relaxColumnCount: true,
    to_line: 1,
  }) as string[][];

  if (!records.length || records[0].length === 0) {
    return [];
  }

  const headers = records[0];
  const fileName = path.basename(filePath);
  const type = inferFileType(fileName) as ImportFileType | null;
  const rows: TableRow[] = [];

  const resolution = type ? resolveHeaders(type, headers) : null;
  const remainingUnknown = [...(resolution?.unknown ?? [])];

  headers.forEach((header, index) => {
    const canonical = resolution?.indexToCanonical[index] ?? canon(header);
    let note = "";
    if (!resolution?.indexToCanonical[index]) {
      const matchIndex = remainingUnknown.findIndex(entry => entry.original === header);
      if (matchIndex >= 0) {
        const entry = remainingUnknown.splice(matchIndex, 1)[0];
        note = computeUnknownNote(entry.original, entry.canonical);
      } else {
        note = computeUnknownNote(header, canonical);
      }
    }

    const mappedField = resolution?.indexToCanonical[index]
      ? resolution.columns[index]
      : "";

    rows.push({
      file: fileName,
      original: header,
      canonical,
      mappedField,
      note,
    });
  });

  if (resolution && type) {
    resolution.missingCanonical.forEach(canonical => {
      rows.push({
        file: fileName,
        original: "—",
        canonical,
        mappedField: canonicalToInternalField(type, canonical as CanonicalHeader) ?? canonical,
        note: "missing required",
      });
    });
  }

  return rows;
}

async function main() {
  const options = parseArgs();
  const files = await collectCsvFiles(options);
  const allRows: TableRow[] = [];

  for (const filePath of files) {
    const rows = await buildReportRows(filePath);
    allRows.push(...rows);
  }

  allRows.sort((a, b) => {
    if (a.file === b.file) {
      return a.original.localeCompare(b.original);
    }
    return a.file.localeCompare(b.file);
  });

  const lines = [
    "# CSV Header Probe Report",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "| file | original header | canonical | mappedField | note |",
    "| --- | --- | --- | --- | --- |",
    ...allRows.map(row =>
      `| ${formatCell(row.file)} | ${formatCell(row.original)} | ${formatCell(row.canonical)} | ${formatCell(row.mappedField)} | ${formatCell(row.note)} |`
    ),
  ];

  await fs.writeFile(path.resolve(process.cwd(), "HEADERS_REPORT.md"), lines.join("\n"));
  // eslint-disable-next-line no-console
  console.log(`HEADERS_REPORT.md generated with ${allRows.length} rows.`);
}

main().catch(error => {
  console.error("Failed to generate headers report", error);
  process.exitCode = 1;
});
