# Dashboard Analítico - Palácio das Baterias - TODO

## Fase 1: Estruturação do Banco de Dados e Importação dos Dados
- [x] Criar schema do banco de dados (clientes, vendedores, produtos, movimentações, estoque)
- [x] Criar script de importação dos dados CSV/Excel para o banco
- [x] Executar importação inicial dos dados
- [x] Validar integridade dos dados importados

## Fase 2: Interface Principal e Navegação
- [x] Configurar tema e paleta de cores do dashboard
- [x] Criar layout principal com sidebar de navegação
- [x] Implementar sistema de abas (Visão Geral, Clientes, Vendedores, Produtos, Estoque, Positivação, Gráficos, Ações, Ranking, Executivo)
- [x] Criar componente de filtros globais
- [x] Implementar header com KPIs principais

## Fase 3: Painéis de Análise e Visualizações
- [x] Painel Executivo: KPIs principais (Total Vendas, Valor Total, Ticket Médio, Clientes Únicos)
- [ ] Painel Executivo: Gráfico de evolução de faturamento
- [x] Painel Executivo: Top 10 Clientes e Top 10 Produtos
- [x] Aba Clientes: Lista completa com busca e filtros
- [x] Aba Vendedores: Lista com métricas de desempenho
- [x] Aba Produtos: Curva ABC e análise de giro
- [ ] Aba Estoque: Disponibilidade e risco de ruptura
- [x] Aba Gráficos: Visualizações temporais e comparativos

## Fase 4: Filtros Avançados e Drill-down
- [ ] Implementar filtros por período (data início/fim com presets)
- [ ] Implementar filtros por vendedor (seleção múltipla com "Marcar Todos" e "Limpar")
- [ ] Implementar filtros por cliente (seleção múltipla)
- [ ] Implementar filtros por tipo de cliente (Lojas Próprias, Revendedores, Consumidor Final)
- [ ] Implementar filtros por município e estado
- [x] Drill-down de cliente: Histórico de compras, produtos mais comprados, análise de positivação
- [x] Drill-down de vendedor: Carteira de clientes, histórico de vendas, mapa de atendimento
- [x] Implementar painel lateral para exibição de detalhes

## Fase 5: Mapas de Calor e Análise de Positivação
- [ ] Integrar mapa de calor com visualização geográfica de vendas
- [ ] Implementar checkpoint de lojas por vendedor no mapa
- [x] Aba Positivação: Clientes que compraram em 30 dias
- [x] Aba Positivação: Clientes que compraram em 60 dias
- [x] Aba Positivação: Clientes que compraram em 90 dias
- [x] Aba Positivação: Clientes inativos (90+ dias sem compra)
- [x] Timeline de compras por cliente
- [x] Análise de reativação de clientes inativos

## Fase 6: Sistema de Exportação de Relatórios
- [x] Implementar exportação de relatório por cliente (PDF)
- [x] Implementar exportação de relatório por vendedor (PDF)
- [ ] Implementar exportação de relatório de produtos (PDF)
- [x] Implementar exportação de resumo executivo (PDF)
- [ ] Implementar exportação de comparativo de períodos (PDF)
- [ ] Implementar exportação de positivação geral (PDF)
- [ ] Implementar exportação de estoque crítico (PDF)
- [ ] Adicionar opção de impressão em todos os relatórios

## Fase 7: Funcionalidades Adicionais
- [ ] Implementar análise de projeção (últimos 12 meses, zoom 4 meses, projeção 4 meses)
- [ ] Implementar programa de ação para vendedores abaixo da meta
- [ ] Implementar sugestões de ações comerciais
- [ ] Implementar análises críticas e justificativas
- [x] Implementar ranking de vendedores, clientes e produtos
- [x] Implementar segregação de lojas próprias vs revendedores vs consumidor final

## Fase 8: Testes e Ajustes Finais
- [ ] Testar todos os filtros e suas combinações
- [ ] Testar drill-down de clientes e vendedores
- [ ] Testar exportação de todos os relatórios
- [ ] Validar cálculos de métricas e KPIs
- [ ] Otimizar performance de consultas
- [ ] Ajustar responsividade para diferentes resoluções
- [ ] Criar documentação de uso do dashboard
- [ ] Salvar checkpoint final

## Correções de Bugs
- [x] Corrigir erro na query de evolução mensal (DATE_FORMAT não suportado pelo Drizzle)

## Sistema de Upload de Arquivos (NOVA FUNCIONALIDADE CRÍTICA)
- [x] Criar tabela de uploads no banco de dados (histórico de processamento)
- [ ] Criar endpoint tRPC para upload de arquivos (backend)
- [ ] Implementar parser de CSV/Excel para cada tipo de arquivo (backend)
- [x] Criar interface de upload com instruções claras
- [x] Implementar validação de formato e estrutura dos arquivos (frontend)
- [ ] Criar sistema de processamento em background (backend)
- [ ] Implementar opção de substituir ou adicionar dados (backend)
- [x] Criar tela de histórico de uploads (frontend)
- [x] Adicionar feedback visual de progresso de upload
- [ ] Implementar tratamento de erros e relatório de inconsistências (backend)

## Correções Urgentes
- [x] Limpar todas as tabelas do banco de dados (preparar para upload real)
- [x] Corrigir formatação de valores monetários (dividir por 100)
- [ ] Testar upload de arquivos reais

## Backend de Upload (URGENTE)
- [x] Criar endpoint tRPC para receber arquivos
- [x] Implementar parser de CSV/Excel
- [x] Processar e inserir dados no banco
- [x] Adicionar feedback de progresso
- [x] Redirecionar para dashboard após processar
