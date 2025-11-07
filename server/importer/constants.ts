import { ImportFileType } from "./types";

export const IMPORT_FILE_TYPES: ImportFileType[] = [
  "clientes",
  "vendedores",
  "produtos",
  "movimentacoes",
  "estoque",
];

export const BOOLEAN_TRUE_VALUES = new Set(["sim", "s", "yes", "y", "true", "1", "ativo", "ok"]);
export const BOOLEAN_FALSE_VALUES = new Set(["nao", "não", "n", "no", "false", "0", "inativo"]);

export const MAX_SKIP_REASONS_IN_SUMMARY = 5;
