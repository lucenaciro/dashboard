import { COOKIE_NAME } from "@shared/const";
import { sql } from "drizzle-orm";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { getDb } from "./db";
import { clientes, vendedores, produtos, movimentacoes, estoque } from "../drizzle/schema";
import { processarUpload } from "./process-upload";
import { logger } from "./logger";
import { criarJobUpload, consultarJobUpload } from "./uploadCamadas";
import type { UploadFile } from "./importer/types";

export const appRouter = router({
  uploadCamadas: router({
    criar: publicProcedure
      .input(z.object({
        arquivos: z.array(z.object({
          name: z.string(),
          content: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        const jobId = await criarJobUpload(input.arquivos);
        return { jobId, mensagem: 'Upload iniciado em camadas' };
      }),
    consultar: publicProcedure
      .input(z.object({ jobId: z.string() }))
      .query(({ input }) => {
        const job = consultarJobUpload(input.jobId);
        if (!job) throw new Error('Job não encontrado');
        return job;
      }),
  }),
  periodo: router({
    obter: publicProcedure.query(async () => {
      const database = await getDb({ role: "metrics" });
      if (!database) return { inicio: null, fim: null, ano: new Date().getFullYear() };

      try {
        const result = await database
          .select({
            minData: sql<string>`MIN(data)`,
            maxData: sql<string>`MAX(data)`,
          })
          .from(movimentacoes)
          .limit(1);

        if (result.length > 0 && result[0].minData && result[0].maxData) {
          return {
            inicio: result[0].minData,
            fim: result[0].maxData,
            ano: new Date(result[0].maxData).getFullYear(),
          };
        }
      } catch (error) {
        console.error('Erro ao buscar período:', error);
      }

      return { inicio: null, fim: null, ano: new Date().getFullYear() };
    }),
  }),
  dados: router({
    importar: publicProcedure
      .input(
        z.object({
          clientes: z.string().optional(),
          vendedores: z.string().optional(),
          produtos: z.string().optional(),
          movimentacoes: z.string().optional(),
          estoque: z.string().optional(),
          dryRun: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const arquivos: UploadFile[] = [];

        const appendIfPresent = (conteudo: string | undefined, nome: string) => {
          if (!conteudo) return;
          const trimmed = conteudo.trim();
          if (trimmed.length === 0) return;
          arquivos.push({
            nome,
            base64: Buffer.from(trimmed, 'utf8').toString('base64'),
          });
        };

        appendIfPresent(input.clientes, 'clientes.csv');
        appendIfPresent(input.vendedores, 'vendedores.csv');
        appendIfPresent(input.produtos, 'produtos.csv');
        appendIfPresent(input.movimentacoes, 'movimentacoes.csv');
        appendIfPresent(input.estoque, 'estoque.csv');

        if (arquivos.length === 0) {
          throw new Error('Nenhum conteúdo CSV fornecido');
        }

        const { summary, details } = await processarUpload(arquivos, { dryRun: input.dryRun });

        return {
          sucesso: true,
          totalProcessado: summary.inserted + summary.updated,
          totalInserido: summary.inserted,
          totalAtualizado: summary.updated,
          totalPulos: summary.skipped,
          resumo: details,
          summary,
        };
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

  pdf: router({
    gerarRelatorio: publicProcedure
      .input(z.object({
        tipo: z.enum(['clientes', 'vendedores', 'executivo', 'produtos']),
        dados: z.any(),
      }))
      .mutation(async ({ input }) => {
        const { gerarPDF } = await import('./pdfGenerator');
        const pdfBuffer = await gerarPDF({
          titulo: `Relatório ${input.tipo}`,
          dados: input.dados,
          tipo: input.tipo,
        });
        
        // Retornar base64 para download no frontend
        return {
          pdf: pdfBuffer.toString('base64'),
          filename: `relatorio-${input.tipo}-${Date.now()}.pdf`,
        };
      }),
  }),

  ciclos: router({
    listar: publicProcedure.query(async () => {
      const database = await getDb({ role: "app" });
      if (!database) throw new Error('Database not available');
      const { ciclos } = await import('../drizzle/schema');
      return await database.select().from(ciclos).orderBy(ciclos.createdAt);
    }),

    criar: publicProcedure
      .input(z.object({
        nome: z.string(),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb({ role: "app" });
        if (!database) throw new Error('Database not available');
        const { ciclos } = await import('../drizzle/schema');
        
        const [ciclo] = await database.insert(ciclos).values({
          nome: input.nome,
          descricao: input.descricao,
          status: 'ativo',
        });
        
        return ciclo;
      }),
  }),

  logs: router({
    obter: publicProcedure
      .input(z.object({
        logId: z.string(),
      }))
      .query(async ({ input }) => {
        return logger.getProcessLog(input.logId);
      }),

    baixarTXT: publicProcedure
      .input(z.object({
        logId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const filepath = await logger.saveToTXT(input.logId);
        const fs = await import('fs/promises');
        const content = await fs.readFile(filepath, 'utf-8');
        return {
          content,
          filename: `log-${input.logId}.txt`,
        };
      }),

    baixarJSON: publicProcedure
      .input(z.object({
        logId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const filepath = await logger.saveToJSON(input.logId);
        const fs = await import('fs/promises');
        const content = await fs.readFile(filepath, 'utf-8');
        return {
          content,
          filename: `log-${input.logId}.json`,
        };
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
