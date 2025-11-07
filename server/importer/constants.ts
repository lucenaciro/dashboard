import { ImportFileType } from "./types";

export const IMPORT_FILE_TYPES: ImportFileType[] = [
  "clientes",
  "vendedores",
  "produtos",
  "movimentacoes",
  "estoque",
];

export const HEADER_ALIAS_MAP: Record<ImportFileType, Record<string, string[]>> = {
  clientes: {
    codigo_cliente: ["codigo", "codigo_cliente", "codigo do cliente", "cod_cliente", "idcliente", "codigocliente"],
    nome: ["nome", "nome do cliente", "razao_social", "cliente"],
    cnpj: ["cnpj", "cnpj_cliente", "cnpj do cliente"],
    endereco: ["endereco", "endereço", "logradouro", "rua"],
    bairro: ["bairro"],
    municipio: ["municipio", "município", "cidade", "municipio_cliente"],
    estado: ["estado", "uf"],
    cep: ["cep"],
    email: ["email", "e-mail"],
    telefone: ["telefone", "fone", "celular"],
    inscricao_estadual: ["inscricao estadual", "inscricao_estadual", "ie"],
    tipo_cliente: ["tipo", "tipo_cliente", "segmento"],
  },
  vendedores: {
    codigo_vendedor: ["codigo", "codigo_vendedor", "cod_vendedor", "idvendedor", "codigo do vendedor"],
    nome: ["nome", "nome_vendedor", "vendedor"],
    ativo: ["ativo", "status", "habilitado"],
  },
  produtos: {
    codigo_produto: ["codigo", "codigo_produto", "cod_produto", "sku", "idproduto", "produto_codigo"],
    descricao: ["descricao", "descrição", "nome", "produto", "produto_nome"],
  },
  movimentacoes: {
    distribuidor: ["distribuidor", "nome_distribuidor", "revenda"],
    cnpj_distribuidor: ["cnpj_distribuidor", "cnpj distribuidor", "cnpj revenda"],
    codigo_vendedor: ["codigo_vendedor", "cod_vendedor", "vendedor", "codigo vendedor", "idvendedor"],
    nome_vendedor: ["nome_vendedor", "vendedor_nome", "nome do vendedor"],
    codigo_cliente: ["codigo_cliente", "cod_cliente", "cliente", "codigo do cliente", "idcliente"],
    nome_cliente: ["nome_cliente", "cliente_nome", "nome do cliente"],
    codigo_produto: ["codigo_produto", "cod_produto", "produto", "sku", "idproduto"],
    nome_produto: ["nome_produto", "descricao_produto", "produto_nome"],
    quantidade: ["quantidade", "qtd", "qtde", "quant", "volume"],
    valor_total: ["valor_total", "valor", "valor total", "valor venda", "valor_liquido", "valor liquido"],
    data: ["data", "data_pedido", "data_venda", "data_emissao", "emissao"],
    numero_nota: ["numero_nota", "nota", "nf", "numero_nf", "nota_fiscal"],
    tipo_saida: ["tipo_saida", "tipo", "natureza", "tipo_saida_produto"],
    descricao_saida: ["descricao_saida", "descricao", "descricao_saida_produto"],
    tabela_precos: ["tabela_precos", "tabela", "tabela_preco"],
    venda_com_qr_code: ["venda_com_qr_code", "qr_code", "venda_qr_code", "qr"],
  },
  estoque: {
    distribuidor: ["distribuidor", "revenda", "nome_distribuidor"],
    codigo_produto: ["codigo_produto", "cod_produto", "produto", "sku", "idproduto"],
    quantidade: ["quantidade", "qtd", "qtde", "quant", "volume"],
    data_estoque: ["data_estoque", "data", "data inventario", "data_inventario"],
  },
};

export const BOOLEAN_TRUE_VALUES = new Set(["sim", "s", "yes", "y", "true", "1", "ativo", "ok"]);
export const BOOLEAN_FALSE_VALUES = new Set(["nao", "não", "n", "no", "false", "0", "inativo"]);

export const MAX_SKIP_REASONS_IN_SUMMARY = 5;
