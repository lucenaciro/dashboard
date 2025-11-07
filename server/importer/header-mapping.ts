import { HEADER_ALIAS_MAP, REQUIRED, buildHeaderMap, type CanonicalHeader } from "../../shared/headerAliases";
import type { ImportFileType } from "./types";

type SupportedType = keyof typeof REQUIRED;

type CanonicalFieldMap = Record<SupportedType, Partial<Record<CanonicalHeader, string>>>;

type UnknownHeader = { original: string; canonical: string };

type HeaderIndexMap = Record<number, CanonicalHeader | undefined>;

const TYPE_MAP: Record<ImportFileType, SupportedType> = {
  clientes: "clientes",
  vendedores: "vendedores",
  produtos: "produtos",
  movimentacoes: "vendas",
  estoque: "estoque",
};

const CANONICAL_OVERRIDES: Partial<
  Record<SupportedType, Partial<Record<CanonicalHeader, CanonicalHeader>>>
> = {
  clientes: {
    product_code: "client_id",
    product_name: "client_name",
  },
  vendedores: {
    product_code: "vendor_id",
    product_name: "vendor_name",
  },
  produtos: {
    exit_description: "product_name",
  },
  estoque: {
    date: "inventory_date",
  },
};

const CANONICAL_FIELD_TARGETS: CanonicalFieldMap = {
  clientes: {
    client_id: "codigo_cliente",
    client_name: "nome",
    client_tax_id: "cnpj",
    client_type: "tipo_cliente",
    address: "endereco",
    neighborhood: "bairro",
    city: "municipio",
    state: "estado",
    postal_code: "cep",
    email: "email",
    phone: "telefone",
    state_registration: "inscricao_estadual",
    distributor_name: "distribuidor",
    distributor_tax_id: "cnpj_distribuidor",
    product_code: "codigo_produto",
    active: "ativo",
  },
  vendedores: {
    vendor_id: "codigo_vendedor",
    vendor_name: "nome",
    active: "ativo",
    vendor_status: "status",
  },
  produtos: {
    product_code: "codigo_produto",
    product_name: "descricao",
    quantity: "quantidade",
  },
  vendas: {
    distributor_name: "distribuidor",
    distributor_tax_id: "cnpj_distribuidor",
    vendor_id: "codigo_vendedor",
    vendor_name: "nome_vendedor",
    client_id: "codigo_cliente",
    client_name: "nome_cliente",
    client_tax_id: "cnpj_cliente",
    product_code: "codigo_produto",
    product_name: "nome_produto",
    quantity: "quantidade",
    unit_price: "valor_unitario",
    total_value: "valor_total",
    date: "data",
    invoice_number: "numero_nota",
    exit_type: "tipo_saida",
    exit_description: "descricao_saida",
    price_table: "tabela_precos",
    qr_sale: "venda_com_qr_code",
  },
  estoque: {
    distributor_name: "distribuidor",
    product_code: "codigo_produto",
    quantity: "quantidade",
    inventory_date: "data_estoque",
  },
};

export interface HeaderResolution {
  columns: string[];
  indexToCanonical: HeaderIndexMap;
  missingCanonical: string[];
  missingInternal: string[];
  unknown: UnknownHeader[];
  presentCanonical: string[];
}

function toSupportedType(type: ImportFileType | SupportedType): SupportedType {
  return type in TYPE_MAP ? TYPE_MAP[type as ImportFileType] : (type as SupportedType);
}

function normalizeCanonicalForType(type: SupportedType, canonical: CanonicalHeader): CanonicalHeader {
  const override = CANONICAL_OVERRIDES[type]?.[canonical];
  if (override) {
    return override;
  }
  return canonical;
}

export function canonicalToInternalField(
  type: ImportFileType | SupportedType,
  canonical: CanonicalHeader
): string | undefined {
  const supported = toSupportedType(type);
  return CANONICAL_FIELD_TARGETS[supported]?.[canonical];
}

function resolveMissing(
  type: SupportedType,
  present: Set<CanonicalHeader>
): { canonical: string[]; internal: string[] } {
  const required = new Set(REQUIRED[type] ?? []);
  const canonicalMissing = Array.from(required).filter(field => !present.has(field as CanonicalHeader));
  const internalMissing = canonicalMissing.map(field =>
    canonicalToInternalField(type, field as CanonicalHeader) ?? field
  );
  return { canonical: canonicalMissing, internal: internalMissing };
}

export function resolveHeaders(type: ImportFileType, headers: string[]): HeaderResolution {
  const supportedType = toSupportedType(type);
  const { indexToField, unknown } = buildHeaderMap(headers);
  const columns: string[] = [];
  const indexToCanonical: HeaderIndexMap = {};
  const present = new Set<CanonicalHeader>();

  headers.forEach((header, index) => {
    const detectedCanonical = indexToField[index];
    if (detectedCanonical) {
      const canonical = normalizeCanonicalForType(supportedType, detectedCanonical);
      present.add(canonical);
      indexToCanonical[index] = canonical;
      const internal =
        canonicalToInternalField(supportedType, canonical) ?? canonical;
      columns[index] = internal;
    } else {
      columns[index] = `__unknown_${index}`;
      indexToCanonical[index] = undefined;
    }
  });

  const { canonical: missingCanonical, internal: missingInternal } = resolveMissing(supportedType, present);

  return {
    columns,
    indexToCanonical,
    missingCanonical,
    missingInternal,
    unknown,
    presentCanonical: Array.from(present),
  };
}

export function getRequiredCanonical(type: ImportFileType | SupportedType): string[] {
  const supportedType = toSupportedType(type);
  return [...(REQUIRED[supportedType] ?? [])];
}

export function getRequiredInternal(type: ImportFileType | SupportedType): string[] {
  const supportedType = toSupportedType(type);
  const required = REQUIRED[supportedType] ?? [];
  return required.map(field => canonicalToInternalField(supportedType, field as CanonicalHeader) ?? field);
}

export function describeUnknownHeaders(unknown: UnknownHeader[]): string {
  if (unknown.length === 0) return "";
  return unknown
    .map(entry => {
      const canonicalKnown = entry.canonical && entry.canonical.length > 0 && entry.canonical in HEADER_ALIAS_MAP;
      const status = canonicalKnown ? "duplicate" : "unmapped";
      return `${entry.original} (${status})`;
    })
    .join(", ");
}
