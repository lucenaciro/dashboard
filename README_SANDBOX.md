# Sandbox Environment (Codespaces & Local Docker)

This repository now includes a disposable sandbox for the CSV → DB → Dashboard flow. It provisions MySQL, the Node application, importer helpers, log streaming via SSE, and reset/probe scripts so you can iterate without touching production data.

> **Never** point the sandbox at production resources. The included `.env.sandbox` values are safe defaults for local development only.

---

## Option A – Codespaces / Dev Containers

1. In GitHub click **Code → Codespaces → Create codespace on master**. The workspace bootstraps from `.devcontainer/devcontainer.json`.
2. Inside the container terminal run:
   ```bash
   cp .env.sandbox .env
   pnpm install
   pnpm run db:reset
   pnpm run dev:sandbox
   ```
3. Open the forwarded port `3000` to reach the dashboard UI.
4. Import / verification cycle:
   ```bash
   pnpm run import:dry
   pnpm run import:real
   pnpm run probe:csv -- --csv ./samples/mov_sample.csv
   pnpm run logs:tail
   ```
   Or open `https://<forwarded-host>/logs/stream` for the SSE log stream.

### Reset Cycle (go/return testing)
Run as often as you like to reset the sandbox:
```bash
pnpm run db:reset && pnpm run import:real && pnpm run probe:csv -- --csv ./samples/mov_sample.csv
```

---

## Option B – Local Docker

1. Copy the sandbox env file:
   ```bash
   cp .env.sandbox .env
   ```
2. Start the stack:
   ```bash
   docker compose up --build
   ```
   - App → http://localhost:3000
   - MySQL → localhost:3306 (`sandbox`/`sandbox`)
3. Run migrations + seed baseline data:
   ```bash
   docker compose exec app pnpm run db:reset
   ```
4. Optional helper commands inside the container:
   ```bash
   pnpm run import:dry
   pnpm run import:real
   pnpm run probe:csv -- --csv ./samples/mov_sample.csv
   pnpm run logs:tail
   ```

---

## Helper Scripts

| Command | Purpose |
| --- | --- |
| `pnpm run db:reset` | Drops & recreates the sandbox schema using the MySQL migrations in `drizzle/`. |
| `pnpm run import:dry` | Reads the CSV samples directory, executes the importer in dry-run mode, and writes `tmp/dry-summary.json`. |
| `pnpm run import:real` | Runs a real import and prints aggregate sales metrics based on `movimentacoes`. |
| `pnpm run probe:csv -- --csv <file>` | One-shot pipeline probe (dry-run + real import + SQL counts + PASS/FAIL verdict). |
| `pnpm run logs:tail` | Terminal tail for the structured log file (rotated daily). |

### File Map
- `.devcontainer/` — Codespaces / Remote Containers definition.
- `docker-compose.yml` — App + MySQL sandbox services.
- `.env.example` / `.env.sandbox` — Safe environment templates (no secrets).
- `scripts/` — Database reset, importer helpers, probe, and log tail utilities.
- `samples/` — Minimal CSVs exercising accented headers, decimal commas, missing rows, and mixed separators.
- `src/shared/logger.ts` — Structured JSON logger with daily rotation.
- `server/_core/index.ts` — Adds the `/logs/stream` SSE endpoint.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `docker compose up` reports ports in use | Stop local MySQL / Node processes or change the published ports in `docker-compose.yml`. |
| `pnpm run db:reset` fails with auth errors | Ensure `DB_ROOT_PASSWORD` matches the MySQL root password (defaults to `sandbox`). |
| Import scripts complain about headers | Compare against the alias map in `server/importer/constants.ts`; the samples folder shows the accepted spellings. |
| `/logs/stream` returns nothing | Trigger activity (e.g., `pnpm run import:real`) and verify `LOG_DIR` is writable. |
| `pnpm run probe:csv` prints `FAIL` | Reset the DB, rerun the importer, and review the SSE or `pnpm run logs:tail` output for validation errors. |

---

## Acceptance Criteria Checklist

- [ ] `docker compose up` → DB healthy and dashboard reachable on :3000.
- [ ] `pnpm run db:reset` completes successfully.
- [ ] `pnpm run import:dry` writes `tmp/dry-summary.json`.
- [ ] `pnpm run import:real` persists rows and prints non-zero metrics.
- [ ] `pnpm run probe:csv -- --csv ./samples/mov_sample.csv` outputs a PASS verdict.
- [ ] `curl http://localhost:3000/logs/stream` streams live JSON log lines.
- [ ] `pnpm run check` reports a clean TypeScript build (list follow-ups if not).

Tick every box before opening the pull request.
