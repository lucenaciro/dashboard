import { describe, it, expect } from "vitest";
import { validateRow } from "./row-validators";
import type { NormalizedRow, RowContext } from "./types";

describe("row validation", () => {
  const baseContext: RowContext = { rowNumber: 2, type: "movimentacoes", fileName: "mov.csv" };

  it("returns detailed errors for invalid rows", () => {
    const row: NormalizedRow = {
      codigo_cliente: null,
      codigo_produto: null,
      quantidade: "abc",
      valor_total: "xyz",
      data: "31/02/2024",
    };

    const result = validateRow(row, baseContext);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
    const columns = result.errors!.map(e => e.column);
    expect(columns).toContain("codigo_cliente");
    expect(columns).toContain("valor_total");
  });

  it("normalizes valid movimentacao rows", () => {
    const row: NormalizedRow = {
      codigo_cliente: "123",
      codigo_produto: "SKU-9",
      quantidade: "1.234,00",
      valor_total: "R$ 9.876,54",
      data: "05/11/2024",
      numero_nota: "NF-1",
      nome_cliente: "Cliente",
      nome_produto: "Produto",
    };

    const result = validateRow(row, baseContext);
    expect(result.success).toBe(true);
    const record = result.data!;
    if (record.kind !== "movimentacoes") {
      throw new Error("Expected movimentacao record");
    }
    expect(record.data.quantidade).toBe(1234);
    expect(record.data.valorTotalCentavos).toBe(987654);
    expect(record.data.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });
});
