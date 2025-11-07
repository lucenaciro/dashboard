import { z } from "zod";
import {
  ClienteRecord,
  EstoqueRecord,
  ImportFileType,
  MovimentacaoRecord,
  NormalizedRow,
  RowContext,
  RowError,
  ValidRecord,
  VendedorRecord,
  ProdutoRecord,
} from "./types";
import {
  computeEstoqueFingerprint,
  computeMovimentacaoFingerprint,
  parseBoolean,
  parseDateFlexible,
  parseDecimalToCents,
  parseInteger,
  parseOptionalDate,
  parseOptionalString,
  parseRequiredString,
} from "./utils";

const clienteSchema = z.object({
  codigoCliente: z.string().min(1, "Código do cliente é obrigatório").max(50),
  nome: z.string().min(1, "Nome do cliente é obrigatório"),
  cnpj: z.string().max(50).nullable(),
  endereco: z.string().nullable(),
  bairro: z.string().nullable(),
  municipio: z.string().nullable(),
  estado: z.string().max(2).nullable(),
  cep: z.string().max(20).nullable(),
  email: z.string().email({ message: "E-mail inválido" }).nullable(),
  telefone: z.string().max(50).nullable(),
  inscricaoEstadual: z.string().max(50).nullable(),
  tipoCliente: z.enum(["loja_propria", "revendedor", "consumidor_final"]),
});

const vendedorSchema = z.object({
  codigoVendedor: z.string().min(1, "Código do vendedor é obrigatório").max(50),
  nome: z.string().min(1, "Nome do vendedor é obrigatório"),
  ativo: z.boolean(),
});

const produtoSchema = z.object({
  codigoProduto: z.string().min(1, "Código do produto é obrigatório").max(50),
  descricao: z.string().min(1, "Descrição do produto é obrigatória"),
});

const movimentacaoSchema = z.object({
  distribuidor: z.string().nullable(),
  cnpjDistribuidor: z.string().max(50).nullable(),
  codigoVendedor: z.string().max(50).nullable(),
  nomeVendedor: z.string().nullable(),
  codigoCliente: z.string().min(1, "Código do cliente é obrigatório").max(50),
  nomeCliente: z.string().nullable(),
  codigoProduto: z.string().min(1, "Código do produto é obrigatório").max(50),
  nomeProduto: z.string().nullable(),
  quantidade: z.number().int().min(0),
  valorTotalCentavos: z.number().int(),
  data: z.date(),
  numeroNota: z.string().max(50).nullable(),
  tipoSaida: z.string().nullable(),
  descricaoSaida: z.string().nullable(),
  tabelaPrecos: z.string().nullable(),
  vendaComQRCode: z.boolean().nullable(),
  fingerprint: z.string().length(64),
});

const estoqueSchema = z.object({
  distribuidor: z.string().nullable(),
  codigoProduto: z.string().min(1, "Código do produto é obrigatório").max(50),
  quantidade: z.number().int(),
  dataEstoque: z.date(),
  fingerprint: z.string().length(64),
});

interface ParseResult<T> {
  success: boolean;
  data?: T;
  errors?: RowError[];
}

function buildRowError(ctx: RowContext, column: string | undefined, reason: string, value?: string | null): RowError {
  return {
    rowNumber: ctx.rowNumber,
    column,
    reason,
    value: value ?? null,
  };
}

function normalizeTipoCliente(valor: unknown): "loja_propria" | "revendedor" | "consumidor_final" {
  const parsed = parseOptionalString(valor);
  if (!parsed) return "consumidor_final";
  const normalized = parsed.toLowerCase();
  if (normalized.includes("loja")) return "loja_propria";
  if (normalized.includes("rev")) return "revendedor";
  if (normalized.includes("cons")) return "consumidor_final";
  return "consumidor_final";
}

function validateClientes(row: NormalizedRow, ctx: RowContext): ParseResult<ClienteRecord> {
  const errors: RowError[] = [];
  let codigoCliente: string | undefined;
  let nome: string | undefined;
  try {
    codigoCliente = parseRequiredString(row.codigo_cliente, "codigo_cliente");
  } catch (error) {
    errors.push(buildRowError(ctx, "codigo_cliente", (error as Error).message, parseOptionalString(row.codigo_cliente)));
  }

  try {
    nome = parseRequiredString(row.nome, "nome");
  } catch (error) {
    errors.push(buildRowError(ctx, "nome", (error as Error).message, parseOptionalString(row.nome)));
  }

  const email = parseOptionalString(row.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(buildRowError(ctx, "email", "E-mail inválido", email));
  }

  const data: ClienteRecord = {
    codigoCliente: codigoCliente ?? "",
    nome: nome ?? "",
    cnpj: parseOptionalString(row.cnpj),
    endereco: parseOptionalString(row.endereco),
    bairro: parseOptionalString(row.bairro),
    municipio: parseOptionalString(row.municipio),
    estado: parseOptionalString(row.estado),
    cep: parseOptionalString(row.cep),
    email: email ?? null,
    telefone: parseOptionalString(row.telefone),
    inscricaoEstadual: parseOptionalString(row.inscricao_estadual),
    tipoCliente: normalizeTipoCliente(row.tipo_cliente),
  };

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const validation = clienteSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.issues.map(issue =>
        buildRowError(ctx, issue.path[0]?.toString(), issue.message, issue.path[0] ? parseOptionalString(row[issue.path[0].toString()]) : null)
      ),
    };
  }

  return { success: true, data: validation.data };
}

function validateVendedores(row: NormalizedRow, ctx: RowContext): ParseResult<VendedorRecord> {
  const errors: RowError[] = [];
  let codigoVendedor: string | undefined;
  let nome: string | undefined;
  try {
    codigoVendedor = parseRequiredString(row.codigo_vendedor, "codigo_vendedor");
  } catch (error) {
    errors.push(buildRowError(ctx, "codigo_vendedor", (error as Error).message, parseOptionalString(row.codigo_vendedor)));
  }

  try {
    nome = parseRequiredString(row.nome, "nome");
  } catch (error) {
    errors.push(buildRowError(ctx, "nome", (error as Error).message, parseOptionalString(row.nome)));
  }

  const ativoParsed = parseBoolean(row.ativo);
  const data: VendedorRecord = {
    codigoVendedor: codigoVendedor ?? "",
    nome: nome ?? "",
    ativo: ativoParsed ?? true,
  };

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const validation = vendedorSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.issues.map(issue => buildRowError(ctx, issue.path[0]?.toString(), issue.message)),
    };
  }

  return { success: true, data: validation.data };
}

function validateProdutos(row: NormalizedRow, ctx: RowContext): ParseResult<ProdutoRecord> {
  const errors: RowError[] = [];
  let codigoProduto: string | undefined;
  let descricao: string | undefined;

  try {
    codigoProduto = parseRequiredString(row.codigo_produto ?? row.codigo, "codigo_produto");
  } catch (error) {
    errors.push(buildRowError(ctx, "codigo_produto", (error as Error).message, parseOptionalString(row.codigo_produto ?? row.codigo)));
  }

  try {
    descricao = parseRequiredString(row.descricao ?? row.nome_produto, "descricao");
  } catch (error) {
    errors.push(buildRowError(ctx, "descricao", (error as Error).message, parseOptionalString(row.descricao ?? row.nome_produto)));
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const validation = produtoSchema.safeParse({
    codigoProduto: codigoProduto ?? "",
    descricao: descricao ?? "",
  });

  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.issues.map(issue => buildRowError(ctx, issue.path[0]?.toString(), issue.message)),
    };
  }

  return { success: true, data: validation.data };
}

function validateMovimentacoes(row: NormalizedRow, ctx: RowContext): ParseResult<MovimentacaoRecord> {
  const errors: RowError[] = [];

  let codigoCliente: string | undefined;
  let codigoProduto: string | undefined;
  let quantidade: number | undefined;
  let valorTotalCentavos: number | undefined;
  let data: Date | undefined;

  try {
    codigoCliente = parseRequiredString(row.codigo_cliente, "codigo_cliente");
  } catch (error) {
    errors.push(buildRowError(ctx, "codigo_cliente", (error as Error).message, parseOptionalString(row.codigo_cliente)));
  }

  try {
    codigoProduto = parseRequiredString(row.codigo_produto, "codigo_produto");
  } catch (error) {
    errors.push(buildRowError(ctx, "codigo_produto", (error as Error).message, parseOptionalString(row.codigo_produto)));
  }

  try {
    quantidade = parseInteger(row.quantidade ?? row.volume, "quantidade");
  } catch (error) {
    errors.push(buildRowError(ctx, "quantidade", (error as Error).message, parseOptionalString(row.quantidade ?? row.volume)));
  }

  try {
    valorTotalCentavos = parseDecimalToCents(row.valor_total ?? row.valor, "valor_total");
  } catch (error) {
    errors.push(buildRowError(ctx, "valor_total", (error as Error).message, parseOptionalString(row.valor_total ?? row.valor)));
  }

  try {
    data = parseDateFlexible(row.data ?? row.data_pedido, "data");
  } catch (error) {
    errors.push(buildRowError(ctx, "data", (error as Error).message, parseOptionalString(row.data ?? row.data_pedido)));
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const numeroNota = parseOptionalString(row.numero_nota ?? row.nf);
  const fingerprint = computeMovimentacaoFingerprint({
    codigoCliente: codigoCliente!,
    codigoProduto: codigoProduto!,
    data: data!,
    numeroNota,
    quantidade: quantidade!,
    valorTotalCentavos: valorTotalCentavos!,
  });

  const vendaComQRCode = parseBoolean(row.venda_com_qr_code ?? row.qr_code ?? row.qr);

  const dataParsed: MovimentacaoRecord = {
    distribuidor: parseOptionalString(row.distribuidor),
    cnpjDistribuidor: parseOptionalString(row.cnpj_distribuidor),
    codigoVendedor: parseOptionalString(row.codigo_vendedor),
    nomeVendedor: parseOptionalString(row.nome_vendedor),
    codigoCliente: codigoCliente!,
    nomeCliente: parseOptionalString(row.nome_cliente),
    codigoProduto: codigoProduto!,
    nomeProduto: parseOptionalString(row.nome_produto ?? row.descricao),
    quantidade: quantidade!,
    valorTotalCentavos: valorTotalCentavos!,
    data: data!,
    numeroNota,
    tipoSaida: parseOptionalString(row.tipo_saida),
    descricaoSaida: parseOptionalString(row.descricao_saida ?? row.descricao),
    tabelaPrecos: parseOptionalString(row.tabela_precos),
    vendaComQRCode,
    fingerprint,
  };

  const validation = movimentacaoSchema.safeParse(dataParsed);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.issues.map(issue =>
        buildRowError(ctx, issue.path[0]?.toString(), issue.message, issue.path[0] ? parseOptionalString(row[issue.path[0].toString()]) : null)
      ),
    };
  }

  return { success: true, data: validation.data };
}

function validateEstoque(row: NormalizedRow, ctx: RowContext): ParseResult<EstoqueRecord> {
  const errors: RowError[] = [];
  let codigoProduto: string | undefined;
  let quantidade: number | undefined;
  let dataEstoque: Date | undefined;

  try {
    codigoProduto = parseRequiredString(row.codigo_produto, "codigo_produto");
  } catch (error) {
    errors.push(buildRowError(ctx, "codigo_produto", (error as Error).message, parseOptionalString(row.codigo_produto)));
  }

  try {
    quantidade = parseInteger(row.quantidade, "quantidade");
  } catch (error) {
    errors.push(buildRowError(ctx, "quantidade", (error as Error).message, parseOptionalString(row.quantidade)));
  }

  try {
    const parsedDate = parseOptionalDate(row.data_estoque ?? row.data);
    if (!parsedDate) {
      throw new Error("Campo \"data_estoque\" é obrigatório");
    }
    dataEstoque = parsedDate;
  } catch (error) {
    errors.push(buildRowError(ctx, "data_estoque", (error as Error).message, parseOptionalString(row.data_estoque ?? row.data)));
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const fingerprint = computeEstoqueFingerprint({
    codigoProduto: codigoProduto!,
    dataEstoque: dataEstoque!,
    quantidade: quantidade!,
    distribuidor: parseOptionalString(row.distribuidor),
  });

  const dataParsed: EstoqueRecord = {
    distribuidor: parseOptionalString(row.distribuidor),
    codigoProduto: codigoProduto!,
    quantidade: quantidade!,
    dataEstoque: dataEstoque!,
    fingerprint,
  };

  const validation = estoqueSchema.safeParse(dataParsed);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.issues.map(issue =>
        buildRowError(ctx, issue.path[0]?.toString(), issue.message, issue.path[0] ? parseOptionalString(row[issue.path[0].toString()]) : null)
      ),
    };
  }

  return { success: true, data: validation.data };
}

export function validateRow(row: NormalizedRow, ctx: RowContext): ParseResult<ValidRecord> {
  switch (ctx.type) {
    case "clientes": {
      const result = validateClientes(row, ctx);
      if (!result.success || !result.data) {
        return { success: false, errors: result.errors ?? [] };
      }
      return { success: true, data: { kind: "clientes", data: result.data } };
    }
    case "vendedores": {
      const result = validateVendedores(row, ctx);
      if (!result.success || !result.data) {
        return { success: false, errors: result.errors ?? [] };
      }
      return { success: true, data: { kind: "vendedores", data: result.data } };
    }
    case "produtos": {
      const result = validateProdutos(row, ctx);
      if (!result.success || !result.data) {
        return { success: false, errors: result.errors ?? [] };
      }
      return { success: true, data: { kind: "produtos", data: result.data } };
    }
    case "movimentacoes": {
      const result = validateMovimentacoes(row, ctx);
      if (!result.success || !result.data) {
        return { success: false, errors: result.errors ?? [] };
      }
      return { success: true, data: { kind: "movimentacoes", data: result.data } };
    }
    case "estoque": {
      const result = validateEstoque(row, ctx);
      if (!result.success || !result.data) {
        return { success: false, errors: result.errors ?? [] };
      }
      return { success: true, data: { kind: "estoque", data: result.data } };
    }
    default:
      return {
        success: false,
        errors: [buildRowError(ctx, undefined, `Tipo de arquivo não suportado: ${ctx.type}`)],
      };
  }
}

