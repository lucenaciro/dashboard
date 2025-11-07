# End-to-End CSV Import Guide

## Prerequisites

- MySQL database reachable via `DATABASE_URL`
- Backend dependencies installed (`pnpm install`)
- Optional: fixtures inside `server/importer/__fixtures__`

## 1. Running the importer via HTTP

```bash
pnpm dev # starts the API on localhost (see server/_core/index.ts)
```

Upload using the multipart endpoint:

```bash
curl -X POST \
  -F "files=@server/importer/__fixtures__/clientes_accented.csv" \
  -F "files=@server/importer/__fixtures__/movimentacoes_decimal.csv" \
  -F "files=@server/importer/__fixtures__/estoque_mixed.csv" \
  "http://localhost:PORT/api/upload?dryRun=true"
```

- `dryRun=true` validates and reports without writing.
- Remove the query parameter to persist; the JSON response includes a `summary` object
  (`total`, `inserted`, `updated`, `skipped`, `topReasons`, `durationMs`) and a detailed
  `details` payload with per-file errors/warnings.

## 2. Reprocess from the CLI

Use the helper script for local iteration (`pnpm tsx scripts/reprocess-import.ts`).

```bash
# Dry-run with explicit CSV selection
pnpm tsx scripts/reprocess-import.ts --dry-run \
  clientes=server/importer/__fixtures__/clientes_accented.csv \
  movimentacoes=server/importer/__fixtures__/movimentacoes_decimal.csv \
  estoque=server/importer/__fixtures__/estoque_mixed.csv

# Persisting run (omit --dry-run)
pnpm tsx scripts/reprocess-import.ts \
  clientes=./data/CADASTRO_CLIENTES.csv \
  produtos=./data/RELACAO_PRODUTOS.csv \
  movimentacoes=./data/MOVIMENTO_DISTRIBUIDOR.csv
```

The script prints both the aggregated `summary` and raw `details` so you can diff totals vs per-file telemetry.

### One-shot probe

For end-to-end verification, run the pipeline probe:

```bash
npm run probe:csv "./path/to/file-or-directory"
```

The probe logs masked DB information, runs a dry-run and real import, shows SQL counts before/after,
recomputes dashboard metrics, and ends with a PASS/FAIL verdict.

## 3. Observability & logs

- Expect `db:connection` on startup (`app`, `metrics`, `importer` roles), one `import:file-summary` per CSV, a final
  `csv:summary`, and (for real imports) `metrics:snapshot` with refreshed aggregates.
- Dry-runs add the warning `Dry-run: nenhuma escrita realizada; totais representam operações previstas.`
- Background uploads and WebSocket transfers now go through the shared logger—no raw `console.log` output remains.

## 4. Roll-forward / rollback checklist

- **Roll forward:** run migrations (`pnpm db:push`), re-import CSVs, verify dashboards show expected totals, archive the JSON summaries.
- **Rollback:** revert to previous commit, restore backup of `movimentacoes`/`estoque` tables (pre-fingerprint schema), rerun `pnpm db:push` to drop new columns/indexes, and invalidate dashboard caches.

## 5. Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Summary shows `Falha de validação` with row details | Missing headers or malformed data | Fix CSV headers/values and re-import (dry-run first). |
| Inserts reported as 0 on re-import | Fingerprint upsert converted rows into updates | Expected behaviour; verify `updated` counter instead. |
| API response returns 500 | Check logger output for stack trace; ensure `DATABASE_URL` is set and reachable. |
| Dry-run mutated data | Ensure `?dryRun=true` (HTTP) or `--dry-run` flag (CLI) is present; warnings will confirm mode. |
