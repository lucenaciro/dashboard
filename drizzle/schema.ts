import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de clientes
 */
export const clientes = mysqlTable("clientes", {
  id: int("id").autoincrement().primaryKey(),
  codigoCliente: varchar("codigoCliente", { length: 50 }).notNull().unique(),
  cnpj: varchar("cnpj", { length: 50 }),
  nome: text("nome").notNull(),
  endereco: text("endereco"),
  bairro: varchar("bairro", { length: 255 }),
  municipio: varchar("municipio", { length: 255 }),
  estado: varchar("estado", { length: 2 }),
  cep: varchar("cep", { length: 20 }),
  email: text("email"),
  telefone: varchar("telefone", { length: 50 }),
  inscricaoEstadual: varchar("inscricaoEstadual", { length: 50 }),
  tipoCliente: mysqlEnum("tipoCliente", ["loja_propria", "revendedor", "consumidor_final"]).default("consumidor_final"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Cliente = typeof clientes.$inferSelect;
export type InsertCliente = typeof clientes.$inferInsert;

/**
 * Tabela de vendedores
 */
export const vendedores = mysqlTable("vendedores", {
  id: int("id").autoincrement().primaryKey(),
  codigoVendedor: varchar("codigoVendedor", { length: 50 }).notNull().unique(),
  nome: text("nome").notNull(),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vendedor = typeof vendedores.$inferSelect;
export type InsertVendedor = typeof vendedores.$inferInsert;

/**
 * Tabela de produtos
 */
export const produtos = mysqlTable("produtos", {
  id: int("id").autoincrement().primaryKey(),
  codigoProduto: varchar("codigoProduto", { length: 50 }).notNull().unique(),
  descricao: text("descricao").notNull(),
  doh: int("doh").default(0), // Days on Hand
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = typeof produtos.$inferInsert;

/**
 * Tabela de movimentações (vendas)
 */
export const movimentacoes = mysqlTable("movimentacoes", {
  id: int("id").autoincrement().primaryKey(),
  distribuidor: text("distribuidor"),
  cnpjDistribuidor: varchar("cnpjDistribuidor", { length: 50 }),
  codigoVendedor: varchar("codigoVendedor", { length: 50 }),
  nomeVendedor: text("nomeVendedor"),
  codigoCliente: varchar("codigoCliente", { length: 50 }).notNull(),
  nomeCliente: text("nomeCliente"),
  codigoProduto: varchar("codigoProduto", { length: 50 }).notNull(),
  nomeProduto: text("nomeProduto"),
  quantidade: int("quantidade").notNull(),
  valorTotal: int("valorTotal").notNull(), // Armazenar em centavos para evitar problemas com decimais
  data: date("data").notNull(),
  numeroNota: varchar("numeroNota", { length: 50 }),
  tipoSaida: varchar("tipoSaida", { length: 50 }),
  descricaoSaida: text("descricaoSaida"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Movimentacao = typeof movimentacoes.$inferSelect;
export type InsertMovimentacao = typeof movimentacoes.$inferInsert;

/**
 * Tabela de estoque
 */
export const estoque = mysqlTable("estoque", {
  id: int("id").autoincrement().primaryKey(),
  distribuidor: text("distribuidor"),
  codigoProduto: varchar("codigoProduto", { length: 50 }).notNull(),
  quantidade: int("quantidade").notNull(),
  dataEstoque: date("dataEstoque").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Estoque = typeof estoque.$inferSelect;
export type InsertEstoque = typeof estoque.$inferInsert;

/**
 * Tabela para rastrear uploads de arquivos e processamento de dados
 */
export const uploads = mysqlTable("uploads", {
  id: int("id").autoincrement().primaryKey(),
  nomeArquivo: varchar("nomeArquivo", { length: 255 }).notNull(),
  tipoArquivo: mysqlEnum("tipoArquivo", ["clientes", "vendedores", "produtos", "movimentacoes", "estoque"]).notNull(),
  tamanhoBytes: int("tamanhoBytes").notNull(),
  status: mysqlEnum("status", ["processando", "concluido", "erro"]).notNull().default("processando"),
  registrosProcessados: int("registrosProcessados").default(0),
  registrosComErro: int("registrosComErro").default(0),
  mensagemErro: text("mensagemErro"),
  dataUpload: timestamp("dataUpload").defaultNow().notNull(),
  dataProcessamento: timestamp("dataProcessamento"),
  usuarioId: int("usuarioId").references(() => users.id),
});

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = typeof uploads.$inferInsert;

/**
 * Tabela de sell-out (vendas dos revendedores)
 */
export const sellOut = mysqlTable("sellOut", {
  id: int("id").autoincrement().primaryKey(),
  cnpjMatriz: varchar("cnpjMatriz", { length: 50 }),
  cnpjEmissorNF: varchar("cnpjEmissorNF", { length: 50 }),
  codigoCliente: varchar("codigoCliente", { length: 50 }),
  razaoSocialCliente: text("razaoSocialCliente"),
  cnpjCliente: varchar("cnpjCliente", { length: 50 }),
  enderecoCliente: text("enderecoCliente"),
  bairroCliente: varchar("bairroCliente", { length: 255 }),
  cidadeCliente: varchar("cidadeCliente", { length: 255 }),
  ufCliente: varchar("ufCliente", { length: 2 }),
  cepCliente: varchar("cepCliente", { length: 20 }),
  tipoCliente: varchar("tipoCliente", { length: 100 }),
  numeroNotaFiscal: varchar("numeroNotaFiscal", { length: 50 }),
  dataVenda: date("dataVenda"),
  codigoSKU: varchar("codigoSKU", { length: 50 }),
  volume: int("volume"),
  valorTotal: int("valorTotal"), // Armazenar em centavos
  codigoVendedorDistribuidor: varchar("codigoVendedorDistribuidor", { length: 50 }),
  nomeVendedor: text("nomeVendedor"),
  tabelaPrecos: varchar("tabelaPrecos", { length: 100 }),
  vendaComQRCode: boolean("vendaComQRCode"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SellOut = typeof sellOut.$inferSelect;
export type InsertSellOut = typeof sellOut.$inferInsert;
