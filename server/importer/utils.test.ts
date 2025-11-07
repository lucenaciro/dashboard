import { describe, it, expect } from "vitest";
import { canon, buildHeaderMap } from "../../shared/headerAliases";
import { resolveHeaders } from "./header-mapping";
import { parseDecimalToCents, parseDateFlexible, parseInteger, parseBoolean } from "./utils";

describe("Header canonicalization", () => {
  it("normalizes headers removing accents and whitespace", () => {
    expect(canon(" Município ")).toBe("municipio");
    expect(canon("Código do Cliente")).toBe("codigo_do_cliente");
    expect(canon("Valor-Total")).toBe("valor_total");
  });

  it("maps aliases to canonical fields", () => {
    const { indexToField } = buildHeaderMap([
      "Código Produto",
      "Quantidade",
      "Valor Total",
    ]);
    expect(indexToField[0]).toBe("product_code");
    expect(indexToField[1]).toBe("quantity");
    expect(indexToField[2]).toBe("total_value");
  });

  it("identifies missing required headers for vendas", () => {
    const resolution = resolveHeaders("movimentacoes", [
      "Código Produto",
      "Quantidade",
      "Valor Total",
    ]);

    expect(resolution.missingCanonical).toEqual(
      expect.arrayContaining(["date", "vendor_id", "client_id"])
    );
    expect(resolution.missingInternal).toEqual(
      expect.arrayContaining(["data", "codigo_vendedor", "codigo_cliente"])
    );
  });
});

describe("CSV utility helpers", () => {
  it("parses pt-BR currency keeping cents precision", () => {
    expect(parseDecimalToCents("1.234,56", "valor")).toBe(123456);
    expect(parseDecimalToCents("R$ 987,00", "valor")).toBe(98700);
  });

  it("parses integers with thousand separators", () => {
    expect(parseInteger("1.200", "quantidade")).toBe(1200);
    expect(() => parseInteger("abc", "quantidade")).toThrow();
  });

  it("accepts multiple date formats", () => {
    expect(parseDateFlexible("05/11/2024", "data").toISOString()).toBe("2024-11-05T00:00:00.000Z");
    expect(parseDateFlexible("2024-11-05", "data").toISOString()).toBe("2024-11-05T00:00:00.000Z");
    expect(() => parseDateFlexible("31/02/2024", "data")).toThrow();
  });

  it("normalizes boolean strings", () => {
    expect(parseBoolean("Sim")).toBe(true);
    expect(parseBoolean("não")).toBe(false);
    expect(parseBoolean("maybe")).toBeNull();
  });
});
