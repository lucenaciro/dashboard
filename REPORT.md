# Import Pipeline Report

## Versions
- Branch: `codex/e2e-import-fix-v3`
- Base commit: `b522210c8fd6e9d921bc327451e99e19435b03ba`
- Touched files:
  - `shared/headerAliases.ts`
  - `server/importer/parser.ts`
  - `server/importer/row-validators.ts`
  - `server/importer/utils.test.ts`
  - `scripts/headers_probe.ts`
  - `tsconfig.json`
  - `vite.config.ts`
  - plus previously staged importer/logging/trpc files on this branch

## Dry-run (pnpm import:dry)
- Mode: `dryRun = true`
- Totals: rows=10, inserted=10, updated=0, skipped=0
- Per-file rows (inserted/updated/skipped):
  - clientes: 2/0/0 (warnings=1)
  - vendedores: 2/0/0 (warnings=1)
  - produtos: 2/0/0 (warnings=1)
  - movimentacoes: 2/0/0 (warnings=1)
  - estoque: 2/0/0 (warnings=1)
- Top reasons: _none_

## Real import (pnpm import:real)
- Database unavailable → importer forced fallback dry-run
- Totals mirror dry-run: rows=10, inserted=10, updated=0, skipped=0
- Top reasons: _none_
- Action item: configure `DATABASE_URL` and rerun to persist data

## Dashboard KPIs
- Not computed (database connection unavailable). Metrics endpoints require a live database.

## Notes
- `pnpm db:reset` skipped because no database connection; rerun once MySQL is provisioned.
- Logs confirm structured start→summary events for both runs (see `/logs` and SSE stream).
