import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { processarArquivo } from "./upload-processor";

export const appRouter = router({
  upload: router({
    processar: publicProcedure
      .input(z.object({
        tipoArquivo: z.enum(['clientes', 'vendedores', 'produtos', 'movimentacoes', 'estoque']),
        fileBase64: z.string(),
        nomeArquivo: z.string(),
      }))
      .mutation(async ({ input }) => {
        const fileBuffer = Buffer.from(input.fileBase64, 'base64');
        return await processarArquivo(input.tipoArquivo, fileBuffer, input.nomeArquivo);
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
