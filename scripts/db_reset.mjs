#!/usr/bin/env node
import "dotenv/config";
import mysql from "mysql2/promise";
import { promises as fsp } from "node:fs";
import path from "node:path";

const host = process.env.DB_HOST ?? "localhost";
const port = Number(process.env.DB_PORT ?? 3306);
const dbName = process.env.DB_NAME ?? "sandbox";
const dbUser = process.env.DB_USER ?? "sandbox";
const dbPassword = process.env.DB_PASSWORD ?? "sandbox";
const rootPassword = process.env.DB_ROOT_PASSWORD ?? dbPassword;

function maskConnectionString() {
  const raw = process.env.DATABASE_URL ?? `mysql://${dbUser}:${dbPassword}@${host}:${port}/${dbName}`;
  try {
    const parsed = new URL(raw);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return "<invalid connection string>";
  }
}

async function resetDatabase() {
  console.log("🔄 Resetting database...");
  console.log(`   host: ${host}:${port}`);
  console.log(`   db: ${dbName}`);
  console.log(`   url: ${maskConnectionString()}`);

  const root = await mysql.createConnection({
    host,
    port,
    user: "root",
    password: rootPassword,
    multipleStatements: true,
  });

  await root.query(
    `DROP DATABASE IF EXISTS \`${dbName}\`;\n` +
      `CREATE DATABASE \`${dbName}\`;\n` +
      `GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}';\n` +
      `FLUSH PRIVILEGES;`
  );
  await root.end();

  const connection = await mysql.createConnection({
    host,
    port,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    multipleStatements: true,
  });

  const migrationsDir = path.resolve(process.cwd(), "drizzle");
  const entries = await fsp.readdir(migrationsDir);
  const sqlFiles = entries.filter(file => file.endsWith(".sql")).sort();

  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = await fsp.readFile(filePath, "utf8");
    if (sql.trim().length === 0) continue;
    console.log(`   applying ${file}`);
    await connection.query(sql);
  }

  await connection.end();
  console.log("✅ Database reset complete.");
}

resetDatabase().catch(error => {
  console.error("❌ Failed to reset database", error);
  process.exit(1);
});
