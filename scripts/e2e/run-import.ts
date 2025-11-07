import { readFile } from "node:fs/promises";
import path from "node:path";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../server/routers";

export type ImportKind = "CLIENTES" | "VENDEDORES" | "PRODUTOS" | "MOVIMENTACOES" | "ESTOQUE";

interface FixtureFile {
  kind: ImportKind;
  file: string;
}

const FIXTURE_DIR = path.resolve(process.cwd(), "fixtures");
const FILES: FixtureFile[] = [
  { kind: "CLIENTES", file: "CLIENTES_utf8.csv" },
  { kind: "VENDEDORES", file: "VENDEDORES_utf8.csv" },
  { kind: "PRODUTOS", file: "PRODUTOS_utf8.csv" },
  { kind: "MOVIMENTACOES", file: "MOVIMENTACOES_utf8.csv" },
  { kind: "ESTOQUE", file: "ESTOQUE_utf8.csv" },
];

async function loadFixtures(): Promise<{ kind: ImportKind; csv: string }[]> {
  const files = await Promise.all(
    FILES.map(async entry => {
      const absolute = path.join(FIXTURE_DIR, entry.file);
      const csv = await readFile(absolute, "utf8");
      return { kind: entry.kind, csv };
    })
  );
  return files;
}

function createClient() {
  const endpoint = process.env.TRPC_URL ?? "http://localhost:3000/api/trpc";
  return createTRPCProxyClient<AppRouter>({
    transformer: superjson,
    links: [
      httpBatchLink({
        url: endpoint,
        transformer: superjson,
        fetch(url, options) {
          if (options?.body) {
            const raw = options.body.toString();
            console.log("import:request-body", raw);
            try {
              const parsed = JSON.parse(raw);
              console.log("import:request-json", JSON.stringify(parsed, null, 2));
            } catch (error) {
              console.error("import:request-json:error", error);
            }
          }
          return fetch(url, options);
        },
      }),
    ],
  });
}

export async function runImport(dryRun: boolean) {
  const client = createClient();
  const files = await loadFixtures();
  const payload = { dryRun, files };
  console.log("import:payload", JSON.stringify({ dryRun, files: files.map(file => ({ kind: file.kind, bytes: file.csv.length })) }));
  const result = await client.dados.importar.mutate(payload);

  return {
    dryRun: result.dryRun,
    totals: result.totals,
    details: {
      totals: result.details.totals,
      files: result.details.files.map(file => ({
        fileName: file.fileName,
        type: file.type,
        totals: {
          rows: file.totalRows,
          inserted: file.inserted,
          updated: file.updated,
          skipped: file.skipped,
        },
        warnings: file.warnings.length,
        errors: file.errors.length,
      })),
    },
    topReasons: result.topReasons,
    durationMs: result.durationMs,
  };
}
