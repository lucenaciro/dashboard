# CSV Import Regression Test Plan

## 1. Automated checks

1. **Type safety** – `pnpm check`
2. **Linting** – `pnpm lint`
3. **Unit & integration coverage** – `pnpm test`
   - `server/importer/utils.test.ts`: header normalization, pt-BR numbers, flexible dates, boolean normalization
   - `server/importer/row-validators.test.ts`: row-level validation errors & fingerprint generation
   - `server/importer/importer.integration.test.ts`: transactional importer against in-memory Drizzle double (insert, update, dry-run paths)

## 2. Manual fixture runs

The fixtures below live in `server/importer/__fixtures__` and exercise accents, decimal commas, BOMs, and line-ending variations.

| Fixture | Fields | Highlights |
| --- | --- | --- |
| `clientes_accented.csv` | Município, Código, Nome, Tipo Cliente, Telefone | UTF-8 BOM, accented headers, optional fields |
| `movimentacoes_decimal.csv` | Código Cliente, Código Produto, Quantidade, Valor Total, Data, Número Nota, Venda com QR Code | pt-BR numbers (`1.234,56`), boolean aliases, `dd/MM/yyyy` dates |
| `estoque_mixed.csv` | Código Produto, Quantidade, Data | Mixed CRLF endings, comma-separated rows |

### Steps

1. Start backend (`pnpm dev`) with a test database.
2. Call `POST /api/upload?dryRun=true` with the fixtures. Response must include `summary.total|inserted|updated|skipped|topReasons|durationMs` and `details.totals`; logs should emit one `import:file-summary` per file plus a `csv:summary` flagged `dryRun: true`.
3. Re-run without `dryRun`. Verify `summary.inserted`/`summary.updated` match row expectations, `details.totals` mirrors DB rows, a `metrics:snapshot` log is emitted, and dashboards (KPIs/top charts) reflect non-zero totals immediately.
4. Re-import the same payload and confirm only `summary.updated` increments while table counts remain stable (idempotent fingerprints).
5. Observe logs for `db:connection` entries covering `app`, `metrics`, and `importer` roles to confirm parity logging.

## 3. Observability

1. Monitor structured logs – expect `import:file-summary` and `csv:summary` events with structured payloads.
2. Confirm dry-run attempts include the warning `Dry-run: nenhuma escrita realizada; totais representam operações previstas.`
3. After a real import, ensure `metrics:snapshot` appears and there is no `metrics:recompute_failed`.
4. Confirm WebSocket and layered uploads now log via the shared `logger` (no raw `console.log`).

## 4. Safety checks

1. Attempt to import a CSV missing required headers (remove `Código Produto`) – importer should return a warning on file 1 and skip rows, no DB writes.
2. Inject malformed dates (`31/02/2024`) – expect `Falha de validação` with row/column detail in summary, and transaction rollback (no partial writes).
3. Try re-uploading with extra whitespace/`R$` prefixes – confirm numbers parse correctly, matching cent values in DB.
4. Execute `npm run probe:csv <csv-or-directory>` and validate the emitted dry-run/import summaries, SQL before/after counts, metrics snapshot, and PASS/FAIL verdict.
