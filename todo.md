# Dashboard Palácio das Baterias - TODO

## Sistema de Upload SIMPLES (REFAZER DO ZERO)
- [x] Limpar banco de dados completamente
- [x] Remover código problemático de upload anterior
- [x] Criar tela super simples (só arrastar e soltar arquivos)
- [ ] Implementar backend que REALMENTE funciona
- [ ] Testar com arquivos reais antes de entregar

## Dashboard (JÁ FUNCIONANDO)
- [x] Visão Geral com KPIs
- [x] Aba Clientes
- [x] Aba Vendedores  
- [x] Aba Produtos
- [x] Aba Positivação
- [x] Exportação PDF

## URGENTE - Implementar processamento AGORA
- [x] Criar endpoint tRPC upload.processar
- [x] Processar os 5 CSVs enviados pelo usuário
- [x] Inserir dados no banco
- [x] Redirecionar para dashboard após sucesso
- [ ] TESTAR e garantir que funciona

## CORREÇÃO URGENTE - Buffer is not defined
- [x] Corrigir erro "Buffer is not defined" no frontend
- [x] Usar FileReader API em vez de Buffer para converter para base64
- [ ] Testar upload novamente
