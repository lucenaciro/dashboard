import { describe, it, expect } from "vitest";
import { NORMALIZE_HEADER } from "@/shared/headerAliases";
import { parseDecimalToCents, parseDateFlexible, parseInteger, parseBoolean } from "./utils";

describe("CSV utility helpers", () => {
  it("normalizes headers removing accents and whitespace", () => {
    expect(NORMALIZE_HEADER(" Município ")).toBe("municipio");
    expect(NORMALIZE_HEADER("Código do Cliente")).toBe("codigo_do_cliente");
    expect(NORMALIZE_HEADER("Valor-Total")).toBe("valor_total");
  });

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
