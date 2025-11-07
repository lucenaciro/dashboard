#!/usr/bin/env tsx
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(ROOT, 'server');
const ALLOWED_CONSOLE_FILES = new Set([
  path.join(SERVER_DIR, 'logger.ts'),
  path.join(SERVER_DIR, '_core', 'index.ts'),
  path.join(SERVER_DIR, '_core', 'notification.ts'),
  path.join(SERVER_DIR, '_core', 'oauth.ts'),
  path.join(SERVER_DIR, '_core', 'sdk.ts'),
  path.join(SERVER_DIR, '_core', 'vite.ts'),
  path.join(SERVER_DIR, '_core', 'voiceTranscription.ts'),
  path.join(SERVER_DIR, 'db.ts'),
  path.join(SERVER_DIR, 'polarsProcessor.ts'),
  path.join(SERVER_DIR, 'routers.ts'),
]);

async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const files = await collectTsFiles(SERVER_DIR);
  const violations: Array<{ file: string; line: number; text: string }> = [];

  for (const file of files) {
    if (ALLOWED_CONSOLE_FILES.has(file)) continue;
    const content = await readFile(file, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/console\.(log|error|warn)\s*\(/.test(line)) {
        violations.push({ file, line: index + 1, text: line.trim() });
      }
    });
  }

  if (violations.length > 0) {
    console.error('\u274c Lint failed: found raw console usage in server files');
    for (const violation of violations) {
      console.error(`  - ${path.relative(ROOT, violation.file)}:${violation.line} -> ${violation.text}`);
    }
    process.exit(1);
  }

  console.log('\u2705 Lint checks passed (no raw console usage in server/*.ts)');
}

void main();
