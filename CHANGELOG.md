# Changelog

## 2025-11-07 — CSV importer hardening

### Added
- Centralized CSV ingestion pipeline (`server/importer`) with header alias map, pt-BR number/date parsing, boolean normalization, and Zod-backed validation.
- Dry-run support and structured import summaries exposed through HTTP (`/api/upload`), tRPC (`dados.importar`), and CLI (`scripts/reprocess-import.ts`).
- Deterministic `fingerprint` columns, unique constraints, and optional metadata fields for `movimentacoes`/`estoque` with migration `0005_e2e_csv_import.sql`.
- Regression tests covering utilities, row validators, and transactional importer behaviour.
- Fixtures demonstrating accented headers, decimal commas, and mixed line endings.

### Changed
- `server/process-upload.ts` delegates to the new importer and logs via `logger`.
- `server/routers.ts` mutation `dados.importar` now returns structured summaries and honours dry-run mode.
- `server/upload-route.ts` parses `dryRun` query parameter and logs failures via `logger`.
- `server/uploadCamadas.ts` emits structured logs instead of raw console output.

### Rollback
1. Revert this commit.
2. Drop new columns/indexes: `ALTER TABLE movimentacoes DROP INDEX movimentacoes_fingerprint_unique, DROP COLUMN fingerprint, DROP COLUMN tabelaPrecos, DROP COLUMN vendaComQRCode; ALTER TABLE estoque DROP INDEX estoque_fingerprint_unique, DROP COLUMN fingerprint;`.
3. Restore previous importer files if needed (`git checkout <prev> server/process-upload.ts server/routers.ts server/upload-route.ts`).
4. Clear re-imported data if duplicates were created during testing.
