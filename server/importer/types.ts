export type ImportFileType = "clientes" | "vendedores" | "produtos" | "movimentacoes" | "estoque";

export interface UploadFile {
  nome: string;
  base64: string;
}

export interface ImportOptions {
  dryRun?: boolean;
  cicloId?: number | null;
  usuarioId?: number | null;
}

export interface RowError {
  rowNumber: number;
  column?: string;
  reason: string;
  value?: string | null;
}

export interface RowWarning {
  rowNumber: number;
  reason: string;
}

export interface FileImportSummary {
  fileName: string;
  type: ImportFileType | "desconhecido";
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
  errors: RowError[];
  warnings: RowWarning[];
  skipReasonCounts: Record<string, number>;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface ImportSummary {
  dryRun: boolean;
  files: FileImportSummary[];
  totals: {
    rows: number;
    inserted: number;
    updated: number;
    skipped: number;
  };
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface RowContext {
  rowNumber: number;
  type: ImportFileType;
  fileName: string;
}

export interface ClienteRecord {
  codigoCliente: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  bairro: string | null;
  municipio: string | null;
  estado: string | null;
  cep: string | null;
  email: string | null;
  telefone: string | null;
  inscricaoEstadual: string | null;
  tipoCliente: "loja_propria" | "revendedor" | "consumidor_final";
}

export interface VendedorRecord {
  codigoVendedor: string;
  nome: string;
  ativo: boolean;
}

export interface ProdutoRecord {
  codigoProduto: string;
  descricao: string;
}

export interface MovimentacaoRecord {
  distribuidor: string | null;
  cnpjDistribuidor: string | null;
  codigoVendedor: string | null;
  nomeVendedor: string | null;
  codigoCliente: string;
  nomeCliente: string | null;
  codigoProduto: string;
  nomeProduto: string | null;
  quantidade: number;
  valorTotalCentavos: number;
  data: Date;
  numeroNota: string | null;
  tipoSaida: string | null;
  descricaoSaida: string | null;
  tabelaPrecos: string | null;
  vendaComQRCode: boolean | null;
  fingerprint: string;
}

export interface EstoqueRecord {
  distribuidor: string | null;
  codigoProduto: string;
  quantidade: number;
  dataEstoque: Date;
  fingerprint: string;
}

export type ValidRecord =
  | { kind: "clientes"; data: ClienteRecord }
  | { kind: "vendedores"; data: VendedorRecord }
  | { kind: "produtos"; data: ProdutoRecord }
  | { kind: "movimentacoes"; data: MovimentacaoRecord }
  | { kind: "estoque"; data: EstoqueRecord };

export type NormalizedRow = Record<string, string | null> & { __rowNumber?: number };
