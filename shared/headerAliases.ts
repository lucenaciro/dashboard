export function canon(h: string): string {
  return (h ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/__+/g, "_");
}

export const HEADER_ALIAS_MAP = {
  // product
  product_code: [
    "codigo_produto",
    "codigo",
    "cod_produto",
    "cod_prod",
    "sku",
    "codproduto",
    "codigo_item",
    "cod_item",
    "cod_do_produto",
    "produto_codigo",
  ],
  product_name: [
    "produto",
    "nome_produto",
    "descricao",
    "descricao_produto",
    "item",
    "nome",
    "produto_nome",
    "nome_do_produto",
    "descricao_do_produto",
  ],
  // quantities & values
  quantity: [
    "quantidade",
    "qtd",
    "qtde",
    "quant",
    "quant_total",
    "qtd_total",
    "volume",
  ],
  unit_price: [
    "valor_unitario",
    "preco_unitario",
    "vl_unit",
    "vl_unitario",
    "preco",
    "valor_unit",
    "preco_unit",
  ],
  total_value: [
    "valor_total",
    "vl_total",
    "preco_total",
    "total",
    "valor",
    "valor_liquido",
    "valor_liq",
  ],
  // dates
  date: ["data", "data_venda", "emissao", "data_emissao", "dt", "dt_venda", "data_pedido"],
  inventory_date: ["data_estoque", "data_inventario", "data_inventário", "data_inventario"],
  // parties
  vendor_id: [
    "vendedor",
    "cod_vendedor",
    "id_vendedor",
    "vendedor_id",
    "vend",
    "codigo_vendedor",
    "idvendedor",
  ],
  vendor_name: ["nome_vendedor", "vendedor_nome", "nome do vendedor", "responsavel"],
  vendor_status: ["status_vendedor", "situacao_vendedor", "situacao"],
  client_id: [
    "cliente",
    "cod_cliente",
    "id_cliente",
    "cliente_id",
    "cnpj",
    "cpf",
    "doc_cliente",
    "codigo_cliente",
    "idcliente",
  ],
  client_name: [
    "nome_cliente",
    "cliente_nome",
    "nome",
    "razao_social",
    "cliente",
    "fantasia",
  ],
  client_tax_id: ["cnpj", "cpf", "documento", "doc_cliente", "cnpj_cliente"],
  client_type: ["tipo_cliente", "segmento", "tipo", "categoria_cliente"],
  // geo
  city: ["cidade", "municipio", "municipio_nome", "município"],
  state: ["uf", "estado", "sigla_estado"],
  neighborhood: ["bairro", "distrito"],
  address: ["endereco", "endereço", "logradouro", "rua"],
  postal_code: ["cep", "codigo_postal", "cep_cliente"],
  // contacts
  email: ["email", "e_mail", "e-mail"],
  phone: ["telefone", "fone", "celular", "telefone_cliente"],
  state_registration: ["inscricao_estadual", "ie", "inscricao estadual"],
  // sales specifics
  distributor_name: ["distribuidor", "revenda", "nome_distribuidor"],
  distributor_tax_id: ["cnpj_distribuidor", "cnpj revenda", "cnpj_distribuidora"],
  invoice_number: ["numero_nota", "nota", "nf", "numero_nf", "nota_fiscal"],
  exit_type: ["tipo_saida", "tipo", "natureza", "tipo_saida_produto"],
  exit_description: ["descricao_saida", "descricao", "descricao_saida_produto"],
  price_table: ["tabela_precos", "tabela", "tabela_preco"],
  qr_sale: ["venda_com_qr_code", "qr_code", "venda_qr_code", "qr", "qr_venda"],
  active: ["ativo", "status", "habilitado"],
} as const;

type HeaderAliasMap = typeof HEADER_ALIAS_MAP;
export type CanonicalHeader = keyof HeaderAliasMap;

const aliasLookup = new Map<string, CanonicalHeader>();
for (const [canonical, aliases] of Object.entries(HEADER_ALIAS_MAP) as Array<[
  CanonicalHeader,
  readonly string[],
]>) {
  aliasLookup.set(canon(canonical), canonical);
  for (const alias of aliases) {
    aliasLookup.set(canon(alias), canonical);
  }
}

export function buildHeaderMap(headers: string[]): {
  indexToField: Record<number, CanonicalHeader>;
  unknown: Array<{ original: string; canonical: string }>;
} {
  const indexToField: Record<number, CanonicalHeader> = {};
  const unknown: Array<{ original: string; canonical: string }> = [];
  const assigned = new Set<CanonicalHeader>();

  headers.forEach((header, index) => {
    const canonicalHeader = canon(header);
    const matched = aliasLookup.get(canonicalHeader);

    if (matched && !assigned.has(matched)) {
      indexToField[index] = matched;
      assigned.add(matched);
      return;
    }

    unknown.push({ original: header, canonical: canonicalHeader });
  });

  return { indexToField, unknown };
}

export const REQUIRED = {
  estoque: ["product_code", "quantity", "inventory_date"],
  vendas: ["product_code", "quantity", "total_value", "date", "vendor_id", "client_id"],
  clientes: ["client_id", "client_name", "city", "state"],
  vendedores: ["vendor_id", "vendor_name"],
  produtos: ["product_code", "product_name"],
} as const;

export type RequiredFieldConfig = typeof REQUIRED;
