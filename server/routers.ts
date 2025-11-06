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
import { validarDados, validarIntegridadeAvancada, criarCadastrosFaltantes, schemas } from "./validators";
import { logger } from "./logger";
import { processarArquivoInteligente } from "./polarsProcessor";

export const appRouter = router({
  periodo: router({
    obter: publicProcedure.query(async () => {
      const database = await getDb();
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
        let totalErros = 0;
        const logId = logger.startProcessing(1, 'importacao_completa');

        // Processar clientes
        if (input.clientes) {
          // Verificar se deve usar Polars
          const processamento = await processarArquivoInteligente(input.clientes, 'clientes');
          if (processamento.metodo === 'polars') {
            logger.info('Arquivo processado com Polars', processamento.resultado);
          }
          const linhas = input.clientes.split('\n').filter(l => l.trim());
          const headers = linhas[0].split(';');
          
          // Parsear dados
          const dadosClientes = linhas.slice(1).map(linha => {
            const valores = linha.split(';');
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
              row[h.trim()] = valores[idx]?.trim() || '';
            });
            return row;
          });

          // VALIDAR DADOS
          const validacao = validarDados(dadosClientes, 'clientes');
          logger.info(`Validação clientes: ${validacao.linhasValidas} válidas, ${validacao.linhasInvalidas} inválidas`);
          
          validacao.erros.forEach(erro => {
            logger.logInvalidField(logId, erro.linha, erro.campo, erro.valor, erro.erro);
          });

          // Inserir apenas dados válidos
          for (let i = 0; i < dadosClientes.length; i++) {
            const row = dadosClientes[i];
            
            // Pular linhas inválidas
            if (validacao.erros.some(e => e.linha === i + 1)) {
              totalErros++;
              continue;
            }

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
              logger.error('Erro ao inserir cliente', { linha: i + 1, erro: e });
              totalErros++;
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
          // VALIDAÇÃO DE INTEGRIDADE REFERENCIAL
          const dadosParsed = {
            clientes: input.clientes ? input.clientes.split('\n').slice(1).map(l => {
              const vals = l.split(';');
              return { CODIGO: vals[0] };
            }) : [],
            vendedores: input.vendedores ? input.vendedores.split('\n').slice(1).map(l => {
              const vals = l.split(';');
              return { CODIGO: vals[0] };
            }) : [],
            produtos: input.produtos ? input.produtos.split('\n').slice(1).map(l => {
              const vals = l.split(';');
              return { CODIGO: vals[0] };
            }) : [],
            movimentacoes: input.movimentacoes.split('\n').slice(1).map(l => {
              const vals = l.split(';');
              return {
                CODIGO_CLIENTE: vals[0],
                CODIGO_VENDEDOR: vals[1],
                CODIGO_PRODUTO: vals[2],
              };
            }),
          };

          const integridadeResult = validarIntegridadeAvancada(dadosParsed);
          logger.info(`Validação de integridade: ${integridadeResult.estatisticas.movimentacoesValidas} válidas, ${integridadeResult.estatisticas.movimentacoesInvalidas} inválidas`);
          
          if (!integridadeResult.valido) {
            logger.warn(`Encontrados ${integridadeResult.erros.length} erros de integridade. Sugestão: ${integridadeResult.sugestaoCorrecao}`);
            
            // Se sugestão for criar cadastros, criar automaticamente
            if (integridadeResult.sugestaoCorrecao === 'criar_cadastro') {
              const cadastrosFaltantes = criarCadastrosFaltantes(dadosParsed);
              logger.info(`Criando ${cadastrosFaltantes.novosClientes.length} clientes, ${cadastrosFaltantes.novosVendedores.length} vendedores, ${cadastrosFaltantes.novosProdutos.length} produtos faltantes`);
              
              // Inserir cadastros faltantes
              const database = await getDb();
              if (database) {
                for (const c of cadastrosFaltantes.novosClientes) {
                  await database.insert(clientes).values({
                    codigoCliente: c.CODIGO,
                    nome: c.NOME,
                    tipoCliente: c.TIPO || 'consumidor_final',
                  }).onDuplicateKeyUpdate({ set: { codigoCliente: c.CODIGO } });
                }
                
                for (const v of cadastrosFaltantes.novosVendedores) {
                  await database.insert(vendedores).values({
                    codigoVendedor: v.CODIGO,
                    nome: v.NOME,
                  }).onDuplicateKeyUpdate({ set: { codigoVendedor: v.CODIGO } });
                }
                
                for (const p of cadastrosFaltantes.novosProdutos) {
                  await database.insert(produtos).values({
                    codigoProduto: p.CODIGO,
                    descricao: p.DESCRICAO,
                  }).onDuplicateKeyUpdate({ set: { codigoProduto: p.CODIGO } });
                }
              }
            }
          }
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

        // Finalizar logging
        logger.endProcessing(logId, true);
        const processLog = logger.getProcessLog(logId);

        return { 
          totalProcessado, 
          totalErros,
          totalInserido: totalProcessado,
          sucesso: true,
          log: processLog
        };
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
      const database = await getDb();
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
        const database = await getDb();
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
