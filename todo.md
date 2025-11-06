# Dashboard Palácio das Baterias - TODO

## ✅ Implementação Básica (CONCLUÍDO)
- [x] Criar tela onde usuário cola dados CSV
- [x] Processar texto CSV e inserir no banco
- [x] Validar que dashboard exibe dados
- [x] Funcionar DE VERDADE desta vez

## 🚀 Melhorias Técnicas (7 Soluções)
- [x] 1. Infraestrutura para múltiplos ciclos de análise
- [x] 2. Sistema de drag-drop e mapeamento de colunas
- [x] 3. Validadores de esquema completos
- [x] 4. Exportação PDF com WeasyPrint
- [x] 5. Processamento paralelo com Polars (arquivos 30MB+)
- [x] 6. Sistema de logging técnico detalhado
- [x] 7. Validação de integridade referencial entre tabelas

## 🔧 Integração das Soluções
- [x] Integrar drag-drop e mapeamento na página /importar
- [x] Conectar validadores ao fluxo de importação
- [x] Criar endpoints tRPC para PDF, ciclos e logging
- [x] Integrar script Polars com backend Node.js
- [x] Ativar logging em todas operações
- [x] Implementar validação de integridade antes de inserir
- [x] Adicionar UI para gerenciar ciclos

## 🔧 Correções Necessárias
- [x] Corrigir schema da tabela ciclos (adicionar createdAt)
- [x] Corrigir validadores e exports
- [x] Implementar PDF com WeasyPrint de verdade
- [x] Corrigir incompatibilidade frontend/backend
- [x] Corrigir integridade referencial e imports
- [x] Testar TODAS as funcionalidades

## 🔧 Correção de Período
- [x] Adicionar endpoint para buscar período real dos dados
- [x] Atualizar dashboard para exibir período correto
- [x] Adicionar filtro de período funcional (exibindo período real dos dados)

## 🧹 Limpeza de Dados
- [x] Limpar todas as tabelas do banco de dados
- [x] Verificar que dashboard está vazio

## 🔧 Solução para Erro de Upload (ERR_BLOCKED_BY_CLIENT)
- [x] Implementar detecção de erro ERR_BLOCKED_BY_CLIENT no Upload.tsx
- [x] Adicionar fallback automático para /importar
- [x] Salvar conteúdo temporário no localStorage
- [x] Adicionar checkpoints com logs no processo
- [ ] Testar solução completa

## 🚀 Soluções Faltantes do Documento
- [x] 3. Upload em Camadas (S3/Blob + polling no backend)
- [x] 4. Upload via WebSocket (socket.io)
- [x] 7. Save Points no backend (db.logs_uploads)
- [x] 8. Análise de Ambiente (detectar bloqueadores via navigator.plugins)

## 🔌 Integração REAL das Soluções
- [x] Integrar uploadCamadas aos endpoints tRPC
- [x] Integrar uploadWebSocket ao servidor HTTP
- [x] Usar detectarBloqueadores na página Upload
- [x] Testar que tudo funciona DE VERDADE

## ⚠️ FALTANDO (conforme documento):
- [x] Solução 6: Código EXATO - mutation.mutate com onSuccess/onError
- [x] Solução 5: Adicionar opção "Tive erro no upload -> ir para copiar/colar"
- [ ] Verificar que TODAS as 8 soluções estão EXATAMENTE como no documento

## 🔧 Correções Executáveis (Solução PDF)
- [x] 1. Timeout tRPC 5 minutos (main.tsx)
- [x] 2. Logs detalhados backend (routers.ts)
- [x] 3. Feedback visual frontend (Upload.tsx)
- [x] 4. Limite JSON 50mb (server/index.ts) - JÁ ESTAVA
