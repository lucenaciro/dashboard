import { readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalizeHeader, NORMALIZE_HEADER, FileType } from "@/shared/headerAliases";

function detectFileType(input: string): FileType {
  const normalized = input.toLowerCase();
  switch (normalized) {
    case "clientes":
      return "CLIENTES";
    case "vendedores":
      return "VENDEDORES";
    case "produtos":
      return "PRODUTOS";
    case "movimentacoes":
      return "MOVIMENTACOES";
    case "estoque":
      return "ESTOQUE";
    default:
      throw new Error(`Tipo de arquivo desconhecido: ${input}`);
  }
}

function detectDelimiter(line: string): string {
  if (line.includes(";")) return ";";
  if (line.includes(",")) return ",";
  return ";";
}

async function main() {
  const [, , fileArg, kindArg] = process.argv;
  if (!fileArg || !kindArg) {
    console.error("Uso: pnpm probe:csv <caminho_para_csv> <tipo>");
    process.exit(1);
    return;
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  const fileType = detectFileType(kindArg);
  const raw = await readFile(filePath, "utf8");
  const firstLine = raw.split(/\r?\n/).find(line => line.trim().length > 0) ?? "";
  const delimiter = detectDelimiter(firstLine);
  const headers = firstLine.split(delimiter);

  const mapping = headers.map(header => ({
    raw: header,
    normalized: NORMALIZE_HEADER(header),
    canonical: canonicalizeHeader(fileType, header),
  }));

  console.log(JSON.stringify({ fileType, headers: mapping }, null, 2));
}

main().catch(error => {
  console.error("probe:csv:error", error);
  process.exit(1);
});
