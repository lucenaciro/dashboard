import { eq, and, gte, lte, sql, desc, asc, inArray, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  clientes,
  vendedores,
  produtos,
  movimentacoes,
  estoque,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { logger } from "./logger";
import { getCachedMetric, metricsCacheKey, setCachedMetric } from "./metrics/cache";

type ConnectionRole = "app" | "metrics" | "importer" | "probe" | string;

interface DatabaseConnectionDescriptor {
  host: string;
  database: string | null;
  schema: string | null;
  searchPath: string | null;
}

interface GetDbOptions {
  role?: ConnectionRole;
  log?: boolean;
}

const loggedRoles = new Set<ConnectionRole>();
let cachedDescriptor: DatabaseConnectionDescriptor | null = null;
const failedRoles = new Set<ConnectionRole>();

function normalizeCachePayload(payload: Record<string, unknown> | undefined) {
  if (!payload) return {} as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      normalized[key] = [...value].sort();
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}

function maskValue(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 2) return "*".repeat(value.length);
  const visible = Math.min(3, Math.floor(value.length / 2));
  const prefix = value.slice(0, visible);
  const suffix = value.slice(-Math.max(1, visible - 1));
  return `${prefix}${"*".repeat(Math.max(1, value.length - (prefix.length + suffix.length)))}${suffix}`;
}

function parseDatabaseUrl(url: string): DatabaseConnectionDescriptor {
  try {
    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\/+/, "") || null;
    const schema = parsed.searchParams.get("schema") ?? parsed.searchParams.get("schemaName");
    const searchPath = parsed.searchParams.get("search_path");
    const portSegment = parsed.port ? `:${parsed.port}` : "";
    return {
      host: `${parsed.hostname}${portSegment}`,
      database,
      schema: schema ?? database,
      searchPath,
    };
  } catch (error) {
    logger.warn("[Database] Unable to parse DATABASE_URL", { error });
    return {
      host: "unknown",
      database: null,
      schema: null,
      searchPath: null,
    };
  }
}

export function getDatabaseConnectionInfo(): DatabaseConnectionDescriptor | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  if (!cachedDescriptor) {
    cachedDescriptor = parseDatabaseUrl(process.env.DATABASE_URL);
  }
  return cachedDescriptor;
}

export function logDatabaseConnection(role: ConnectionRole = "app"): void {
  if (loggedRoles.has(role)) {
    return;
  }

  const descriptor = getDatabaseConnectionInfo();
  if (!descriptor) {
    if (!failedRoles.has(role)) {
      logger.error("db:connection", {
        role,
        reason: "DATABASE_URL not configured",
      });
      failedRoles.add(role);
    }
    return;
  }

  logger.info("db:connection", {
    role,
    host: descriptor.host,
    database: maskValue(descriptor.database),
    schema: maskValue(descriptor.schema),
    searchPath: maskValue(descriptor.searchPath),
  });
  loggedRoles.add(role);
}

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb(options: GetDbOptions = {}) {
  const { role = "app", log = true } = options;

  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      logger.error("[Database] Failed to connect", { error });
      _db = null;
    }
  }

  if (log) {
    if (_db) {
      logDatabaseConnection(role);
    } else if (!failedRoles.has(role)) {
      logger.error("db:connection", {
        role,
        reason: "Database unavailable",
      });
      failedRoles.add(role);
    }
  }

  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb({ role: "app" });
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
  const db = await getDb({ role: "app" });
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ DASHBOARD QUERIES ============

type KPIResult = {
  totalVendas: number;
  valorTotal: number;
  clientesUnicos: number;
};

type TopClienteMetric = {
  codigoCliente: string;
  nomeCliente: string | null;
  totalVendas: number;
  valorTotal: number;
  ticketMedio: number;
};

type TopProdutoMetric = {
  codigoProduto: string;
  nomeProduto: string | null;
  quantidadeTotal: number;
  valorTotal: number;
};

type ClienteMetric = {
  id: number;
  codigoCliente: string;
  nome: string;
  municipio: string | null;
  estado: string | null;
  tipoCliente: string | null;
  totalVendas: number;
  valorTotal: number;
  ultimaCompra: string | null;
};

type VendedorMetric = {
  id: number;
  codigoVendedor: string;
  nome: string;
  ativo: boolean | null;
  totalVendas: number;
  valorTotal: number;
  clientesAtivos: number;
};

type AnalisePositivacaoMetric = {
  clientes30: number;
  clientes60: number;
  clientes90: number;
};

type EvolucaoMensalMetric = {
  mes: string;
  totalVendas: number;
  valorTotal: number;
  ticketMedio: number;
};

/**
 * Get KPIs principais do dashboard
 */
export async function getKPIs(filters?: {
  dataInicio?: string;
  dataFim?: string;
  vendedores?: string[];
  clientes?: string[];
  tiposCliente?: string[];
}): Promise<KPIResult | null> {
  const cacheKey = metricsCacheKey("kpis", normalizeCachePayload(filters as Record<string, unknown> | undefined));
  const cached = getCachedMetric<KPIResult | null>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = await getDb({ role: "metrics" });
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
  const value = result[0] ?? null;
  if (value) {
    setCachedMetric(cacheKey, value);
  }
  return value;
}

/**
 * Get top clientes por valor
 */
export async function getTopClientes(limit: number = 10, filters?: {
  dataInicio?: string;
  dataFim?: string;
}): Promise<TopClienteMetric[]> {
  const payload = normalizeCachePayload({ ...filters, limit } as Record<string, unknown>);
  const cacheKey = metricsCacheKey("topClientes", payload);
  const cached = getCachedMetric<TopClienteMetric[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = await getDb({ role: "metrics" });
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

  const result = await query;
  setCachedMetric(cacheKey, result);
  return result as TopClienteMetric[];
}

/**
 * Get top produtos por quantidade
 */
export async function getTopProdutos(limit: number = 10, filters?: {
  dataInicio?: string;
  dataFim?: string;
}): Promise<TopProdutoMetric[]> {
  const payload = normalizeCachePayload({ ...filters, limit } as Record<string, unknown>);
  const cacheKey = metricsCacheKey("topProdutos", payload);
  const cached = getCachedMetric<TopProdutoMetric[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = await getDb({ role: "metrics" });
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

  const result = await query;
  setCachedMetric(cacheKey, result);
  return result as TopProdutoMetric[];
}

/**
 * Get lista de clientes com métricas
 */
export async function getClientesComMetricas(filters?: {
  dataInicio?: string;
  dataFim?: string;
  tiposCliente?: string[];
  busca?: string;
}): Promise<ClienteMetric[]> {
  const payload = normalizeCachePayload(filters as Record<string, unknown> | undefined);
  const cacheKey = metricsCacheKey("clientesMetricas", payload);
  const cached = getCachedMetric<ClienteMetric[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = await getDb({ role: "metrics" });
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

  const result = await query;
  setCachedMetric(cacheKey, result);
  return result as ClienteMetric[];
}

/**
 * Get lista de vendedores com métricas
 */
export async function getVendedoresComMetricas(filters?: {
  dataInicio?: string;
  dataFim?: string;
}): Promise<VendedorMetric[]> {
  const payload = normalizeCachePayload(filters as Record<string, unknown> | undefined);
  const cacheKey = metricsCacheKey("vendedoresMetricas", payload);
  const cached = getCachedMetric<VendedorMetric[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = await getDb({ role: "metrics" });
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

  const result = await query;
  setCachedMetric(cacheKey, result);
  return result as VendedorMetric[];
}

/**
 * Get histórico de compras de um cliente
 */
export async function getHistoricoCliente(codigoCliente: string) {
  const db = await getDb({ role: "metrics" });
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
export async function getAnalisePositivacao(): Promise<AnalisePositivacaoMetric | null> {
  const cacheKey = metricsCacheKey("analisePositivacao");
  const cached = getCachedMetric<AnalisePositivacaoMetric | null>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = await getDb({ role: "metrics" });
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

  const value = result[0] ?? null;
  if (value) {
    setCachedMetric(cacheKey, value);
  }
  return value;
}

/**
 * Get evolução mensal de vendas
 */
export async function getEvolucaoMensal(meses: number = 12): Promise<EvolucaoMensalMetric[]> {
  const cacheKey = metricsCacheKey("evolucaoMensal", { meses });
  const cached = getCachedMetric<EvolucaoMensalMetric[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = await getDb({ role: "metrics" });
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
  const resultado: EvolucaoMensalMetric[] = Array.from(porMes.entries())
    .map(([mes, dados]) => ({
      mes,
      totalVendas: dados.totalVendas,
      valorTotal: dados.valorTotal,
      ticketMedio: dados.totalVendas > 0 ? Math.round(dados.valorTotal / dados.totalVendas) : 0,
    }))
    .sort((a, b) => b.mes.localeCompare(a.mes))
    .slice(0, meses);

  setCachedMetric(cacheKey, resultado);
  return resultado;
}
