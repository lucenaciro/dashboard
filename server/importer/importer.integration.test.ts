import { describe, it, expect, beforeEach } from "vitest";
import { importArquivos } from "./importer";
import type { UploadFile } from "./types";
import { clientes, produtos, movimentacoes, estoque } from "../../drizzle/schema";

interface FakeStore {
  clientes: Map<string, any>;
  produtos: Map<string, any>;
  movimentacoes: Map<string, any>;
  estoque: Map<string, any>;
}

class FakeTransaction {
  constructor(private store: FakeStore) {}

  insert(table: any) {
    return {
      values: (value: any) => ({
        onDuplicateKeyUpdate: ({ set }: { set: Record<string, unknown> }) => {
          return this.upsert(table, value, set);
        },
      }),
    };
  }

  private upsert(table: any, value: any, set: Record<string, unknown>) {
    const collection = this.resolveCollection(table);
    const key = this.resolveKey(table, value);
    const existing = collection.get(key);

    if (!existing) {
      collection.set(key, { ...value });
      return { affectedRows: 1 };
    }

    collection.set(key, { ...existing, ...set });
    return { affectedRows: 2 };
  }

  private resolveCollection(table: any) {
    if (table === clientes) return this.store.clientes;
    if (table === produtos) return this.store.produtos;
    if (table === movimentacoes) return this.store.movimentacoes;
    if (table === estoque) return this.store.estoque;
    throw new Error("Tabela desconhecida no fake DB");
  }

  private resolveKey(table: any, value: any) {
    if (table === clientes) return value.codigoCliente;
    if (table === produtos) return value.codigoProduto;
    if (table === movimentacoes) return value.fingerprint;
    if (table === estoque) return value.fingerprint;
    throw new Error("Tabela desconhecida no fake DB");
  }
}

class FakeDatabase {
  readonly store: FakeStore = {
    clientes: new Map(),
    produtos: new Map(),
    movimentacoes: new Map(),
    estoque: new Map(),
  };

  async transaction<T>(callback: (tx: FakeTransaction) => Promise<T>): Promise<T> {
    const tx = new FakeTransaction(this.store);
    return callback(tx);
  }
}

describe("CSV importer integration", () => {
  let db: FakeDatabase;
  let arquivos: UploadFile[];

  beforeEach(() => {
    db = new FakeDatabase();

    const clientesCsv = "\ufeffMunicípio;Código;Nome;Tipo Cliente\nSão Paulo;C001;Loja Árvore;Revendedor\n";
    const produtosCsv = "Código;Descrição\nP001;Bateria 60Ah\n";
    const movimentacoesCsv = [
      "Município;Código Cliente;Código Produto;Quantidade;Valor Total;Data;Número Nota;Venda com QR Code",
      "São Paulo;C001;P001;1.234,00;1.234,56;05/11/2024;NF123;Sim",
      ";;;;;;",
    ].join("\n");
    const estoqueCsv = "Código Produto;Quantidade;Data\nP001;10;05-11-2024\n";

    const toFile = (nome: string, conteudo: string): UploadFile => ({
      nome,
      base64: Buffer.from(conteudo, "utf8").toString("base64"),
    });

    arquivos = [
      toFile("clientes-acentos.csv", clientesCsv),
      toFile("produtos.csv", produtosCsv),
      toFile("movimentacoes.csv", movimentacoesCsv),
      toFile("estoque.csv", estoqueCsv),
    ];
  });

  it("persists normalized data and reports summary", async () => {
    const resumo = await importArquivos(db as any, arquivos, { dryRun: false });

    expect(resumo.totals.rows).toBe(4);
    expect(resumo.totals.inserted).toBe(4);
    expect(resumo.totals.skipped).toBeGreaterThanOrEqual(1);

    const cliente = db.store.clientes.get("C001");
    expect(cliente).toBeDefined();
    expect(cliente.nome).toBe("Loja Árvore");

    const produto = db.store.produtos.get("P001");
    expect(produto).toBeDefined();

    const venda = Array.from(db.store.movimentacoes.values())[0];
    expect(venda.quantidade).toBe(1234);
    expect(venda.valorTotal).toBe(123456);

    const estoqueRegistro = Array.from(db.store.estoque.values())[0];
    expect(estoqueRegistro.quantidade).toBe(10);

    const movimentacaoResumo = resumo.files.find(file => file.type === "movimentacoes");
    expect(movimentacaoResumo?.warnings.some(w => w.reason.includes("Linha em branco"))).toBe(true);
  });

  it("is idempotent on re-import", async () => {
    await importArquivos(db as any, arquivos, { dryRun: false });
    const segundaPassagem = await importArquivos(db as any, arquivos, { dryRun: false });

    const movimentacaoResumo = segundaPassagem.files.find(file => file.type === "movimentacoes");
    expect(movimentacaoResumo?.updated).toBeGreaterThan(0);
    expect(db.store.movimentacoes.size).toBe(1);
  });

  it("supports dry-run without mutating state", async () => {
    const antes = Array.from(db.store.clientes.values()).length;
    const resultado = await importArquivos(db as any, arquivos, { dryRun: true });
    expect(resultado.dryRun).toBe(true);
    expect(Array.from(db.store.clientes.values()).length).toBe(antes);
    expect(resultado.files.every(file => file.dryRun)).toBe(true);
  });
});
