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
import { criarJobUpload, consultarJobUpload } from "./uploadCamadas";

const cleanCsvValue = (value?: string): string => {
  if (value === undefined || value === null) return "";
  return value.replace(/\uFEFF/g, "").replace(/"/g, "").replace(/\r/g, "").trim();
};

const parseDataCsv = (dataStr: string | null | undefined): Date | null => {
  const limpo = cleanCsvValue(dataStr ?? "");
  if (!limpo) return null;

  const partes = limpo.split("/");
  if (partes.length === 3) {
    const [dia, mes, ano] = partes;
    const parsed = new Date(Number(ano), Number(mes) - 1, Number(dia));
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const data = new Date(limpo);
  return isNaN(data.getTime()) ? null : data;
};

const parseDecimal = (valorStr: string | null | undefined): number => {
  const limpo = cleanCsvValue(valorStr ?? "");
  if (!limpo) return 0;

  const semSeparadorMilhar = limpo.replace(/\./g, "");
  const normalizado = semSeparadorMilhar.replace(/,/g, ".");
  const valor = parseFloat(normalizado);
  return isNaN(valor) ? 0 : valor;
};

const parseQuantidade = (valorStr: string | null | undefined): number => {
  const valor = parseDecimal(valorStr);
  return Math.round(valor);
};

const parseValor = (valorStr: string | null | undefined): number => {
  const valor = parseDecimal(valorStr);
  return Math.round(valor * 100);
};

const validarCamposObrigatorios = (obj: Record<string, any>, campos: string[]): boolean => {
  return campos.every(campo => {
    const valor = obj[campo];
    return valor !== undefined && valor !== null && valor !== "";
  });
};

const assignRowValue = (row: Record<string, string>, header: string, value?: string) => {
  const normalizedHeader = cleanCsvValue(header);
  const cleanedValue = cleanCsvValue(value ?? "");
  row[normalizedHeader] = cleanedValue;
  row[normalizedHeader.toUpperCase()] = cleanedValue;
  row[normalizedHeader.replace(/\s+/g, '_').toUpperCase()] = cleanedValue;
};

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
        console.log("[BACKEND] Iniciando mutation de importacao");
        const db = await getDb();
        console.log("[BACKEND] Banco conectado");
        if (!db) throw new Error('Database not available');
        
        console.log("[BACKEND] Dados recebidos:", Object.keys(input));

        try {
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
              assignRowValue(row, h, valores[idx]);
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

            const clienteData = {
              codigoCliente: row['Código do Cliente'] || row['Código Cliente'] || row['CODIGO_CLIENTE'] || row['CODIGO'] || '',
              nome: row['Nome'] || row['NOME'] || '',
              cnpj: row['CNPJ'] || row['Cnpj'] || null,
              endereco: row['Endereço'] || row['Endereco'] || row['ENDERECO'] || null,
              bairro: row['Bairro'] || row['BAIRRO'] || null,
              municipio: row['Município'] || row['Municipio'] || row['CIDADE'] || null,
              estado: row['Estado'] || row['ESTADO'] || null,
              cep: row['CEP'] || row['Cep'] || null,
              email: row['E-mail'] || row['Email'] || row['EMAIL'] || null,
              telefone: row['Telefone'] || row['TELEFONE'] || null,
              inscricaoEstadual: row['Inscrição Estadual'] || row['Inscricao Estadual'] || row['INSCRICAO_ESTADUAL'] || null,
              tipoCliente: (row['Tipo Cliente'] || row['TIPO'] || 'revendedor') as 'loja_propria' | 'revendedor' | 'consumidor_final',
            };

            if (!validarCamposObrigatorios(clienteData, ['codigoCliente', 'nome'])) {
              totalErros++;
              logger.warn('Linha de cliente ignorada por campos obrigatórios ausentes', { linha: i + 1, row });
              continue;
            }

            try {
              await db
                .insert(clientes)
                .values(clienteData)
                .onDuplicateKeyUpdate({
                  set: {
                    nome: clienteData.nome,
                    cnpj: clienteData.cnpj,
                    municipio: clienteData.municipio,
                    estado: clienteData.estado,
                    endereco: clienteData.endereco,
                    bairro: clienteData.bairro,
                    cep: clienteData.cep,
                    email: clienteData.email,
                    telefone: clienteData.telefone,
                    inscricaoEstadual: clienteData.inscricaoEstadual,
                    tipoCliente: clienteData.tipoCliente,
                  },
                });
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
              assignRowValue(row, h, valores[idx]);
            });

            const vendedorData = {
              codigoVendedor:
                row['Código Vendedor'] ||
                row['Codigo Vendedor'] ||
                row['Código do Vendedor'] ||
                row['CODIGO_VENDEDOR'] ||
                row['CODIGO'] ||
                '',
              nome: row['Nome'] || row['NOME'] || '',
              ativo: true,
            };

            if (!validarCamposObrigatorios(vendedorData, ['codigoVendedor', 'nome'])) {
              totalErros++;
              logger.warn('Linha de vendedor ignorada por campos obrigatórios ausentes', { linha: i + 1, row });
              continue;
            }

            try {
              await db
                .insert(vendedores)
                .values(vendedorData)
                .onDuplicateKeyUpdate({
                  set: {
                    nome: vendedorData.nome,
                    ativo: vendedorData.ativo,
                  },
                });
              totalProcessado++;
            } catch (e) {
              logger.error('Erro ao inserir vendedor', { linha: i + 1, erro: e });
              totalErros++;
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
              assignRowValue(row, h, valores[idx]);
            });

            const produtoData = {
              codigoProduto:
                row['Código Produto'] ||
                row['Codigo Produto'] ||
                row['CODIGO_PRODUTO'] ||
                row['CODIGO'] ||
                '',
              descricao: row['Descrição'] || row['Descricao'] || row['DESCRICAO'] || '',
            };

            if (!validarCamposObrigatorios(produtoData, ['codigoProduto', 'descricao'])) {
              totalErros++;
              logger.warn('Linha de produto ignorada por campos obrigatórios ausentes', { linha: i + 1, row });
              continue;
            }

            try {
              await db
                .insert(produtos)
                .values(produtoData)
                .onDuplicateKeyUpdate({
                  set: {
                    descricao: produtoData.descricao,
                  },
                });
              totalProcessado++;
            } catch (e) {
              logger.error('Erro ao inserir produto', { linha: i + 1, erro: e });
              totalErros++;
            }
          }
        }

        // Processar movimentações
        if (input.movimentacoes) {
          // VALIDAÇÃO DE INTEGRIDADE REFERENCIAL
          const dadosParsed = {
            clientes: input.clientes
              ? input.clientes
                  .split('\n')
                  .slice(1)
                  .filter(l => l.trim())
                  .map(l => {
                    const vals = l.split(';');
                    return {
                      CODIGO: cleanCsvValue(vals[0]),
                      NOME: cleanCsvValue(vals[2] ?? vals[1]),
                      TIPO: 'consumidor_final',
                    };
                  })
                  .filter(c => c.CODIGO)
              : [],
            vendedores: input.vendedores
              ? input.vendedores
                  .split('\n')
                  .slice(1)
                  .filter(l => l.trim())
                  .map(l => {
                    const vals = l.split(';');
                    return {
                      CODIGO: cleanCsvValue(vals[0]),
                      NOME: cleanCsvValue(vals[1]),
                    };
                  })
                  .filter(v => v.CODIGO)
              : [],
            produtos: input.produtos
              ? input.produtos
                  .split('\n')
                  .slice(1)
                  .filter(l => l.trim())
                  .map(l => {
                    const vals = l.split(';');
                    return {
                      CODIGO: cleanCsvValue(vals[0]),
                      DESCRICAO: cleanCsvValue(vals[1]),
                    };
                  })
                  .filter(p => p.CODIGO)
              : [],
            movimentacoes: input.movimentacoes.split('\n').slice(1).map(l => {
              const vals = l.split(';');
              return {
                CODIGO_CLIENTE: cleanCsvValue(vals[4] ?? vals[0]),
                CODIGO_VENDEDOR: cleanCsvValue(vals[2] ?? vals[1]),
                CODIGO_PRODUTO: cleanCsvValue(vals[6] ?? vals[2]),
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
                  // Verificar se tem valores antes de inserir
                  if (p.CODIGO && p.DESCRICAO) {
                    try {
                      await database.insert(produtos).values({
                        codigoProduto: p.CODIGO,
                        descricao: p.DESCRICAO,
                      }).onDuplicateKeyUpdate({ set: { codigoProduto: p.CODIGO } });
                      logger.info(`Produto criado: ${p.CODIGO}`);
                    } catch (error) {
                      logger.error(`Erro ao inserir produto ${p.CODIGO}:`, error);
                    }
                  } else {
                    logger.warn(`Produto inválido (sem código ou descrição):`, p);
                  }
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
              assignRowValue(row, h, valores[idx]);
            });

            const movimentoData = {
              distribuidor: row['Distribuidor'] || row['DISTRIBUIDOR'] || null,
              cnpjDistribuidor: row['CNPJ'] || row['CNPJ DISTRIBUIDOR'] || row['CNPJ_DISTRIBUIDOR'] || null,
              codigoVendedor:
                row['Código Vendedor'] ||
                row['Codigo Vendedor'] ||
                row['CODIGO_VENDEDOR'] ||
                row['CODIGO VENDEDOR'] ||
                null,
              nomeVendedor: row['Nome Vendedor'] || row['NOME VENDEDOR'] || row['NOME_VENDEDOR'] || null,
              codigoCliente:
                row['Código Cliente'] ||
                row['Código do Cliente'] ||
                row['Codigo Cliente'] ||
                row['CODIGO_CLIENTE'] ||
                '',
              nomeCliente: row['Nome Cliente'] || row['NOME CLIENTE'] || row['NOME_CLIENTE'] || null,
              codigoProduto:
                row['Código Produto'] ||
                row['Codigo Produto'] ||
                row['CODIGO_PRODUTO'] ||
                '',
              nomeProduto: row['Nome Produto'] || row['NOME PRODUTO'] || row['NOME_PRODUTO'] || null,
              quantidade: parseQuantidade(row['Quantidade'] || row['QUANTIDADE'] || row['Qtd'] || row['QTD']),
              valorTotal: parseValor(row['Valor Total'] || row['VALOR_TOTAL'] || row['Valor'] || row['VALOR']),
              data: parseDataCsv(row['Data'] || row['DATA_PEDIDO'] || row['DATA']),
              numeroNota: row['Número Nota'] || row['Numero Nota'] || row['NUMERO_NOTA'] || row['Nota Fiscal'] || null,
              tipoSaida: row['Tipo de Saída'] || row['Tipo Saída'] || row['TIPO_SAIDA'] || null,
              descricaoSaida: row['Descrição Saída'] || row['Descricao Saida'] || row['DESCRICAO_SAIDA'] || null,
            };

            if (!validarCamposObrigatorios(movimentoData, ['codigoCliente', 'codigoProduto', 'data'])) {
              totalErros++;
              logger.warn('Linha de movimentação ignorada por campos obrigatórios ausentes', { linha: i + 1, row });
              continue;
            }

            try {
              await db.insert(movimentacoes).values({
                distribuidor: movimentoData.distribuidor,
                cnpjDistribuidor: movimentoData.cnpjDistribuidor,
                codigoVendedor: movimentoData.codigoVendedor,
                nomeVendedor: movimentoData.nomeVendedor,
                codigoCliente: movimentoData.codigoCliente,
                nomeCliente: movimentoData.nomeCliente,
                codigoProduto: movimentoData.codigoProduto,
                nomeProduto: movimentoData.nomeProduto,
                quantidade: movimentoData.quantidade,
                valorTotal: movimentoData.valorTotal,
                data: movimentoData.data!,
                numeroNota: movimentoData.numeroNota,
                tipoSaida: movimentoData.tipoSaida,
                descricaoSaida: movimentoData.descricaoSaida,
              });
              totalProcessado++;
            } catch (e) {
              logger.error('Erro ao inserir movimentação', { linha: i + 1, erro: e, row });
              totalErros++;
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
              assignRowValue(row, h, valores[idx]);
            });

            const estoqueData = {
              codigoProduto:
                row['Código Produto'] ||
                row['Codigo Produto'] ||
                row['CODIGO_PRODUTO'] ||
                row['CODIGO'] ||
                '',
              quantidade: parseQuantidade(row['Quantidade'] || row['QUANTIDADE']),
              dataEstoque: parseDataCsv(row['Data'] || row['DATA_ESTOQUE'] || row['DATA']),
              distribuidor: row['Distribuidor'] || row['DISTRIBUIDOR'] || null,
            };

            if (!validarCamposObrigatorios(estoqueData, ['codigoProduto', 'dataEstoque'])) {
              totalErros++;
              logger.warn('Linha de estoque ignorada por campos obrigatórios ausentes', { linha: i + 1, row });
              continue;
            }

            try {
              await db.insert(estoque).values({
                codigoProduto: estoqueData.codigoProduto,
                quantidade: estoqueData.quantidade,
                dataEstoque: estoqueData.dataEstoque!,
                distribuidor: estoqueData.distribuidor,
              });
              totalProcessado++;
            } catch (e) {
              logger.error('Erro ao inserir estoque', { linha: i + 1, erro: e, row });
              totalErros++;
            }
          }
        }

          // Finalizar logging
          logger.endProcessing(logId, true);
          const processLog = logger.getProcessLog(logId);

          console.log("[BACKEND] Finalizado com sucesso");
          return { 
            totalProcessado, 
            totalErros,
            totalInserido: totalProcessado,
            sucesso: true,
            log: processLog
          };
        } catch (e: any) {
          console.error("[BACKEND] Erro capturado:", e);
          throw new Error(e.message);
        }
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
