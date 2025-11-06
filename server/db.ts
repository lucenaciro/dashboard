import { eq, and, gte, lte, sql, desc, asc, inArray, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, clientes, vendedores, produtos, movimentacoes, estoque } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ DASHBOARD QUERIES ============

/**
 * Get KPIs principais do dashboard
 */
export async function getKPIs(filters?: {
  dataInicio?: string;
  dataFim?: string;
  vendedores?: string[];
  clientes?: string[];
  tiposCliente?: string[];
}) {
  const db = await getDb();
  if (!db) return null;

  let query = db.select({
    totalVendas: count(),
    valorTotal: sql<number>`SUM(${movimentacoes.valorTotal})`,
    clientesUnicos: sql<number>`COUNT(DISTINCT ${movimentacoes.codigoCliente})`,
  }).from(movimentacoes);

  const conditions = [];
  if (filters?.dataInicio) {
    conditions.push(sql`${movimentacoes.data} >= ${filters.dataInicio}`);
  }
  if (filters?.dataFim) {
    conditions.push(sql`${movimentacoes.data} <= ${filters.dataFim}`);
  }
  if (filters?.vendedores && filters.vendedores.length > 0) {
    conditions.push(inArray(movimentacoes.codigoVendedor, filters.vendedores));
  }
  if (filters?.clientes && filters.clientes.length > 0) {
    conditions.push(inArray(movimentacoes.codigoCliente, filters.clientes));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const result = await query;
  return result[0];
}

/**
 * Get top clientes por valor
 */
export async function getTopClientes(limit: number = 10, filters?: {
  dataInicio?: string;
  dataFim?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select({
    codigoCliente: movimentacoes.codigoCliente,
    nomeCliente: movimentacoes.nomeCliente,
    totalVendas: count(),
    valorTotal: sql<number>`SUM(${movimentacoes.valorTotal})`,
    ticketMedio: sql<number>`AVG(${movimentacoes.valorTotal})`,
  })
    .from(movimentacoes)
    .groupBy(movimentacoes.codigoCliente, movimentacoes.nomeCliente)
    .orderBy(desc(sql`SUM(${movimentacoes.valorTotal})`))
    .limit(limit);

  const conditions = [];
  if (filters?.dataInicio) {
    conditions.push(sql`${movimentacoes.data} >= ${filters.dataInicio}`);
  }
  if (filters?.dataFim) {
    conditions.push(sql`${movimentacoes.data} <= ${filters.dataFim}`);
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query;
}

/**
 * Get top produtos por quantidade
 */
export async function getTopProdutos(limit: number = 10, filters?: {
  dataInicio?: string;
  dataFim?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select({
    codigoProduto: movimentacoes.codigoProduto,
    nomeProduto: movimentacoes.nomeProduto,
    quantidadeTotal: sql<number>`SUM(${movimentacoes.quantidade})`,
    valorTotal: sql<number>`SUM(${movimentacoes.valorTotal})`,
  })
    .from(movimentacoes)
    .groupBy(movimentacoes.codigoProduto, movimentacoes.nomeProduto)
    .orderBy(desc(sql`SUM(${movimentacoes.quantidade})`))
    .limit(limit);

  const conditions = [];
  if (filters?.dataInicio) {
    conditions.push(sql`${movimentacoes.data} >= ${filters.dataInicio}`);
  }
  if (filters?.dataFim) {
    conditions.push(sql`${movimentacoes.data} <= ${filters.dataFim}`);
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query;
}

/**
 * Get lista de clientes com métricas
 */
export async function getClientesComMetricas(filters?: {
  dataInicio?: string;
  dataFim?: string;
  tiposCliente?: string[];
  busca?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  // Subquery para métricas de vendas
  const vendasSubquery = db.select({
    codigoCliente: movimentacoes.codigoCliente,
    totalVendas: count().as('totalVendas'),
    valorTotal: sql<number>`SUM(${movimentacoes.valorTotal})`.as('valorTotal'),
    ultimaCompra: sql<string>`MAX(${movimentacoes.data})`.as('ultimaCompra'),
  })
    .from(movimentacoes)
    .groupBy(movimentacoes.codigoCliente)
    .as('vendas');

  let query = db.select({
    id: clientes.id,
    codigoCliente: clientes.codigoCliente,
    nome: clientes.nome,
    municipio: clientes.municipio,
    estado: clientes.estado,
    tipoCliente: clientes.tipoCliente,
    totalVendas: sql<number>`COALESCE(${vendasSubquery.totalVendas}, 0)`,
    valorTotal: sql<number>`COALESCE(${vendasSubquery.valorTotal}, 0)`,
    ultimaCompra: vendasSubquery.ultimaCompra,
  })
    .from(clientes)
    .leftJoin(vendasSubquery, eq(clientes.codigoCliente, vendasSubquery.codigoCliente));

  const conditions = [];
  if (filters?.tiposCliente && filters.tiposCliente.length > 0) {
    conditions.push(inArray(clientes.tipoCliente, filters.tiposCliente as any));
  }
  if (filters?.busca) {
    conditions.push(sql`${clientes.nome} LIKE ${`%${filters.busca}%`}`);
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query;
}

/**
 * Get lista de vendedores com métricas
 */
export async function getVendedoresComMetricas(filters?: {
  dataInicio?: string;
  dataFim?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const vendasSubquery = db.select({
    codigoVendedor: movimentacoes.codigoVendedor,
    totalVendas: count().as('totalVendas'),
    valorTotal: sql<number>`SUM(${movimentacoes.valorTotal})`.as('valorTotal'),
    clientesAtivos: sql<number>`COUNT(DISTINCT ${movimentacoes.codigoCliente})`.as('clientesAtivos'),
  })
    .from(movimentacoes)
    .where(sql`${movimentacoes.codigoVendedor} IS NOT NULL`)
    .groupBy(movimentacoes.codigoVendedor)
    .as('vendas');

  const query = db.select({
    id: vendedores.id,
    codigoVendedor: vendedores.codigoVendedor,
    nome: vendedores.nome,
    ativo: vendedores.ativo,
    totalVendas: sql<number>`COALESCE(${vendasSubquery.totalVendas}, 0)`,
    valorTotal: sql<number>`COALESCE(${vendasSubquery.valorTotal}, 0)`,
    clientesAtivos: sql<number>`COALESCE(${vendasSubquery.clientesAtivos}, 0)`,
  })
    .from(vendedores)
    .leftJoin(vendasSubquery, eq(vendedores.codigoVendedor, vendasSubquery.codigoVendedor))
    .orderBy(asc(vendedores.nome));

  return await query;
}

/**
 * Get histórico de compras de um cliente
 */
export async function getHistoricoCliente(codigoCliente: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(movimentacoes)
    .where(eq(movimentacoes.codigoCliente, codigoCliente))
    .orderBy(desc(movimentacoes.data))
    .limit(100);
}

/**
 * Get análise de positivação
 */
export async function getAnalisePositivacao() {
  const db = await getDb();
  if (!db) return null;

  const hoje = new Date();
  const dias30 = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dias60 = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dias90 = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const result = await db.select({
    clientes30: sql<number>`COUNT(DISTINCT CASE WHEN ${movimentacoes.data} >= ${dias30} THEN ${movimentacoes.codigoCliente} END)`,
    clientes60: sql<number>`COUNT(DISTINCT CASE WHEN ${movimentacoes.data} >= ${dias60} AND ${movimentacoes.data} < ${dias30} THEN ${movimentacoes.codigoCliente} END)`,
    clientes90: sql<number>`COUNT(DISTINCT CASE WHEN ${movimentacoes.data} >= ${dias90} AND ${movimentacoes.data} < ${dias60} THEN ${movimentacoes.codigoCliente} END)`,
  }).from(movimentacoes);

  return result[0];
}

/**
 * Get evolução mensal de vendas
 */
export async function getEvolucaoMensal(meses: number = 12) {
  const db = await getDb();
  if (!db) return [];

  // Buscar todas as movimentações e agrupar no JavaScript
  const todasMovimentacoes = await db.select({
    data: movimentacoes.data,
    valorTotal: movimentacoes.valorTotal,
  })
    .from(movimentacoes)
    .orderBy(movimentacoes.data);

  // Agrupar por mês no JavaScript
  const porMes = new Map<string, { totalVendas: number; valorTotal: number; valores: number[] }>();
  
  for (const mov of todasMovimentacoes) {
    const data = new Date(mov.data);
    const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    
    if (!porMes.has(mesAno)) {
      porMes.set(mesAno, { totalVendas: 0, valorTotal: 0, valores: [] });
    }
    
    const grupo = porMes.get(mesAno)!;
    grupo.totalVendas++;
    grupo.valorTotal += mov.valorTotal;
    grupo.valores.push(mov.valorTotal);
  }

  // Converter para array e ordenar
  const resultado = Array.from(porMes.entries())
    .map(([mes, dados]) => ({
      mes,
      totalVendas: dados.totalVendas,
      valorTotal: dados.valorTotal,
      ticketMedio: dados.totalVendas > 0 ? Math.round(dados.valorTotal / dados.totalVendas) : 0,
    }))
    .sort((a, b) => b.mes.localeCompare(a.mes))
    .slice(0, meses);

  return resultado;
}
