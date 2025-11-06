import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { getDb } from "./db";
import { clientes, vendedores, produtos, movimentacoes, estoque } from "../drizzle/schema";
import { processarUpload } from "./process-upload";

export const appRouter = router({
  dados: router({
    importar: publicProcedure
      .input(
        z.object({
          clientes: z.string(),
          vendedores: z.string(),
          produtos: z.string(),
          movimentacoes: z.string(),
          estoque: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        let totalProcessado = 0;

        // Processar clientes
        if (input.clientes) {
          const linhas = input.clientes.split('\n').filter(l => l.trim());
          const headers = linhas[0].split(';');
          
          for (let i = 1; i < linhas.length; i++) {
            const valores = linhas[i].split(';');
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
              row[h.trim()] = valores[idx]?.trim() || '';
            });

            try {
              await db.insert(clientes).values({
                codigoCliente: row['CODIGO'] || '',
                nome: row['NOME'] || '',
                cnpj: row['CNPJ'] || null,
                municipio: row['CIDADE'] || null,
                estado: row['ESTADO'] || null,
                tipoCliente: (row['TIPO'] || 'revendedor') as 'loja_propria' | 'revendedor' | 'consumidor_final',
              }).onDuplicateKeyUpdate({ set: { codigoCliente: row['CODIGO'] } });
              totalProcessado++;
            } catch (e) {
              console.error('Erro ao inserir cliente:', e);
            }
          }
        }

        // Processar vendedores
        if (input.vendedores) {
          const linhas = input.vendedores.split('\n').filter(l => l.trim());
          const headers = linhas[0].split(';');
          
          for (let i = 1; i < linhas.length; i++) {
            const valores = linhas[i].split(';');
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
              row[h.trim()] = valores[idx]?.trim() || '';
            });

            try {
              await db.insert(vendedores).values({
                codigoVendedor: row['CODIGO'] || '',
                nome: row['NOME'] || '',
              }).onDuplicateKeyUpdate({ set: { codigoVendedor: row['CODIGO'] } });
              totalProcessado++;
            } catch (e) {
              console.error('Erro ao inserir vendedor:', e);
            }
          }
        }

        // Processar produtos
        if (input.produtos) {
          const linhas = input.produtos.split('\n').filter(l => l.trim());
          const headers = linhas[0].split(';');
          
          for (let i = 1; i < linhas.length; i++) {
            const valores = linhas[i].split(';');
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
              row[h.trim()] = valores[idx]?.trim() || '';
            });

            try {
              await db.insert(produtos).values({
                codigoProduto: row['CODIGO'] || '',
                descricao: row['DESCRICAO'] || '',
              }).onDuplicateKeyUpdate({ set: { codigoProduto: row['CODIGO'] } });
              totalProcessado++;
            } catch (e) {
              console.error('Erro ao inserir produto:', e);
            }
          }
        }

        // Processar movimentações
        if (input.movimentacoes) {
          const linhas = input.movimentacoes.split('\n').filter(l => l.trim());
          const headers = linhas[0].split(';');
          
          for (let i = 1; i < linhas.length; i++) {
            const valores = linhas[i].split(';');
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
              row[h.trim()] = valores[idx]?.trim() || '';
            });

            try {
              const parseData = (dataStr: string): Date | null => {
                if (!dataStr) return null;
                const partes = dataStr.split('/');
                if (partes.length === 3) {
                  return new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
                }
                return new Date(dataStr);
              };

              const parseValor = (valorStr: string): number => {
                const valor = parseFloat(valorStr.replace(',', '.'));
                return Math.round(valor * 100); // Converter para centavos
              };

              await db.insert(movimentacoes).values({
                codigoCliente: row['CODIGO_CLIENTE'] || '',
                codigoVendedor: row['CODIGO_VENDEDOR'] || '',
                codigoProduto: row['CODIGO_PRODUTO'] || '',
                data: parseData(row['DATA_PEDIDO']) || new Date(),
                quantidade: parseInt(row['QUANTIDADE'] || '0'),
                valorTotal: parseValor(row['VALOR_TOTAL'] || '0'),
              });
              totalProcessado++;
            } catch (e) {
              console.error('Erro ao inserir movimentação:', e);
            }
          }
        }

        // Processar estoque
        if (input.estoque) {
          const linhas = input.estoque.split('\n').filter(l => l.trim());
          const headers = linhas[0].split(';');
          
          for (let i = 1; i < linhas.length; i++) {
            const valores = linhas[i].split(';');
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
              row[h.trim()] = valores[idx]?.trim() || '';
            });

            try {
              const parseData = (dataStr: string): Date | null => {
                if (!dataStr) return new Date();
                const partes = dataStr.split('/');
                if (partes.length === 3) {
                  return new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
                }
                return new Date(dataStr);
              };

              await db.insert(estoque).values({
                codigoProduto: row['CODIGO_PRODUTO'] || '',
                quantidade: parseInt(row['QUANTIDADE'] || '0'),
                dataEstoque: parseData(row['DATA_ESTOQUE']) || new Date(),
                distribuidor: row['DISTRIBUIDOR'] || null,
              });
              totalProcessado++;
            } catch (e) {
              console.error('Erro ao inserir estoque:', e);
            }
          }
        }

        return { totalProcessado, sucesso: true };
      }),
  }),
  upload: router({
    processar: publicProcedure
      .input(z.object({
        arquivos: z.array(z.object({ nome: z.string(), base64: z.string() })),
      }))
      .mutation(async ({ input }) => {
        return await processarUpload(input.arquivos);
      }),
  }),
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  dashboard: router({
    // Get KPIs principais
    kpis: publicProcedure
      .input(z.object({
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        vendedores: z.array(z.string()).optional(),
        clientes: z.array(z.string()).optional(),
        tiposCliente: z.array(z.string()).optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getKPIs(input);
      }),

    // Get top clientes
    topClientes: publicProcedure
      .input(z.object({
        limit: z.number().default(10),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getTopClientes(input.limit, {
          dataInicio: input.dataInicio,
          dataFim: input.dataFim,
        });
      }),

    // Get top produtos
    topProdutos: publicProcedure
      .input(z.object({
        limit: z.number().default(10),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getTopProdutos(input.limit, {
          dataInicio: input.dataInicio,
          dataFim: input.dataFim,
        });
      }),

    // Get evolução mensal
    evolucaoMensal: publicProcedure
      .input(z.object({
        meses: z.number().default(12),
      }))
      .query(async ({ input }) => {
        return await db.getEvolucaoMensal(input.meses);
      }),

    // Get análise de positivação
    positivacao: publicProcedure
      .query(async () => {
        return await db.getAnalisePositivacao();
      }),
  }),

  clientes: router({
    // Lista de clientes com métricas
    list: publicProcedure
      .input(z.object({
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        tiposCliente: z.array(z.string()).optional(),
        busca: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getClientesComMetricas(input);
      }),

    // Histórico de um cliente
    historico: publicProcedure
      .input(z.object({
        codigoCliente: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getHistoricoCliente(input.codigoCliente);
      }),
  }),

  vendedores: router({
    // Lista de vendedores com métricas
    list: publicProcedure
      .input(z.object({
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getVendedoresComMetricas(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
