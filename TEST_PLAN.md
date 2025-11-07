# CSV Import Regression Test Plan

## 1. Automated checks

1. **Type safety** – `pnpm check`
2. **Unit & integration coverage** – `pnpm test`
   - `server/importer/utils.test.ts`: canonical header mapping, alias resolution, pt-BR numbers, flexible dates, boolean normalization
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

1. Start backend (`pnpm dev` or relevant supervisor) with a test database.
2. Run `pnpm tsx scripts/headers_probe.ts` to regenerate `HEADERS_REPORT.md` and verify required headers per file type.
3. Hit `POST /api/upload?dryRun=true` with the three fixtures to confirm validation passes without persisting.
   - Expect response summary to report `dryRun: true`, populated `skipReasonCounts`, and zero inserts.
4. Repeat without `dryRun` and ensure summary counters match the row totals (one insert per file, blank lines skipped with reason) and DB tables reflect normalized values (quantities, cents, parsed dates, booleans).
5. Re-import the same payload and confirm `updated` counters increment while row counts remain stable (idempotent fingerprint upsert).
6. Confirm dashboard queries (KPIs/top charts) reflect the imported totals instead of zeros.

## 3. Observability

1. Tail structured logs during import – expect one `logger.info` “Resumo do arquivo …” entry per file with totals, skips, and warnings.
2. Verify dry-run attempts log the warning `Dry-run: nenhuma escrita realizada; totais representam operações previstas.`
3. Inspect upload job logs (`server/uploadCamadas.ts`) to ensure console output has been replaced by structured logging.

## 4. Safety checks

1. Attempt to import a CSV missing required headers (remove `Código Produto`) – importer should return a warning on file 1 and skip rows, no DB writes.
2. Inject malformed dates (`31/02/2024`) – expect `Falha de validação` with row/column detail in summary, and transaction rollback (no partial writes).
3. Try re-uploading with extra whitespace/`R$` prefixes – confirm numbers parse correctly, matching cent values in DB.
