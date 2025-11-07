import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { logger } from "../logger";
import { invalidateMetricsCache } from "./cache";
import {
  clientes,
  vendedores,
  produtos,
  movimentacoes,
  estoque,
  ciclos,
} from "../../drizzle/schema";

export interface DashboardMetricsSnapshot {
  totalClientes: number;
  totalVendedores: number;
  totalProdutos: number;
  totalMovimentacoes: number;
  valorTotalCentavos: number;
  totalEstoqueRegistros: number;
  estoqueQuantidade: number;
}

export async function recomputeDashboardAggregates(): Promise<DashboardMetricsSnapshot> {
  const db = await getDb({ role: "metrics" });
  if (!db) {
    throw new Error("Database not available");
  }

  const [movAgg] = await db
    .select({
      total: sql<number>`COUNT(*)`.as("total"),
      valor: sql<number>`COALESCE(SUM(${movimentacoes.valorTotal}), 0)`.as("valor"),
    })
    .from(movimentacoes);

  const [clientesAgg] = await db
    .select({ total: sql<number>`COUNT(*)`.as("total") })
    .from(clientes);

  const [vendedoresAgg] = await db
    .select({ total: sql<number>`COUNT(*)`.as("total") })
    .from(vendedores);

  const [produtosAgg] = await db
    .select({ total: sql<number>`COUNT(*)`.as("total") })
    .from(produtos);

  const [estoqueAgg] = await db
    .select({
      total: sql<number>`COUNT(*)`.as("total"),
      quantidade: sql<number>`COALESCE(SUM(${estoque.quantidade}), 0)`.as("quantidade"),
    })
    .from(estoque);

  const snapshot: DashboardMetricsSnapshot = {
    totalClientes: clientesAgg?.total ?? 0,
    totalVendedores: vendedoresAgg?.total ?? 0,
    totalProdutos: produtosAgg?.total ?? 0,
    totalMovimentacoes: movAgg?.total ?? 0,
    valorTotalCentavos: movAgg?.valor ?? 0,
    totalEstoqueRegistros: estoqueAgg?.total ?? 0,
    estoqueQuantidade: estoqueAgg?.quantidade ?? 0,
  };

  const [activeCycle] = await db
    .select({ id: ciclos.id })
    .from(ciclos)
    .where(eq(ciclos.status, "ativo"))
    .orderBy(desc(ciclos.createdAt))
    .limit(1);

  if (activeCycle) {
    await db
      .update(ciclos)
      .set({
        totalClientes: snapshot.totalClientes,
        totalVendedores: snapshot.totalVendedores,
        totalProdutos: snapshot.totalProdutos,
        totalMovimentacoes: snapshot.totalMovimentacoes,
        totalEstoque: snapshot.totalEstoqueRegistros,
        updatedAt: new Date(),
      })
      .where(eq(ciclos.id, activeCycle.id));
  }

  invalidateMetricsCache();
  logger.info("metrics:recomputed", snapshot);

  return snapshot;
}
