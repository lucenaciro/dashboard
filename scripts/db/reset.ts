import { clientes, vendedores, produtos, movimentacoes, estoque } from "../../drizzle/schema";
import { getDb } from "../../server/db";
import { logger } from "../../server/logger";

async function main() {
  logger.info("db:reset:start", {});
  const db = await getDb({ role: "importer" });
  if (!db) {
    logger.warn("db:reset:skipped", { reason: "database unavailable" });
    return;
  }

  try {
    await db.delete(movimentacoes).execute();
    await db.delete(estoque).execute();
    await db.delete(produtos).execute();
    await db.delete(vendedores).execute();
    await db.delete(clientes).execute();
    logger.info("db:reset:completed", { tables: 5 });
  } catch (error) {
    logger.error("db:reset:error", { error });
    process.exitCode = 1;
  }
}

main();
