import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClienteRelatorio {
  nome: string;
  codigoCliente: string;
  totalVendas: number;
  valorTotal: number;
  ticketMedio: number;
  ultimaCompra: string | null;
  status: string;
}

interface VendedorRelatorio {
  nome: string;
  codigoVendedor: string;
  totalVendas: number;
  valorTotal: number;
  clientesAtivos: number;
  desempenho: number;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

export function gerarRelatorioCliente(cliente: ClienteRelatorio, historico: any[]): Buffer {
  const doc = new jsPDF();
  
  // Cabeçalho
  doc.setFontSize(20);
  doc.text('Relatório de Cliente', 14, 20);
  doc.setFontSize(12);
  doc.text('Palácio das Baterias - Análise Completa de Vendas', 14, 28);
  
  // Linha separadora
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);
  
  // Informações do Cliente
  doc.setFontSize(14);
  doc.text('Dados do Cliente', 14, 42);
  doc.setFontSize(10);
  doc.text(`Nome: ${cliente.nome}`, 14, 50);
  doc.text(`Código: ${cliente.codigoCliente}`, 14, 56);
  doc.text(`Status: ${cliente.status}`, 14, 62);
  doc.text(`Última Compra: ${formatDate(cliente.ultimaCompra)}`, 14, 68);
  
  // Métricas
  doc.setFontSize(14);
  doc.text('Métricas de Desempenho', 14, 80);
  doc.setFontSize(10);
  doc.text(`Total de Vendas: ${formatNumber(cliente.totalVendas)}`, 14, 88);
  doc.text(`Valor Total: ${formatCurrency(cliente.valorTotal)}`, 14, 94);
  doc.text(`Ticket Médio: ${formatCurrency(cliente.ticketMedio)}`, 14, 100);
  
  // Histórico de Compras
  if (historico && historico.length > 0) {
    doc.setFontSize(14);
    doc.text('Histórico de Compras (Últimas 20)', 14, 112);
    
    const tableData = historico.slice(0, 20).map(h => [
      formatDate(h.data),
      h.nomeProduto,
      formatNumber(h.quantidade),
      formatCurrency(h.valorTotal)
    ]);
    
    autoTable(doc, {
      startY: 116,
      head: [['Data', 'Produto', 'Qtd', 'Valor']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });
  }
  
  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}

export function gerarRelatorioVendedor(vendedor: VendedorRelatorio, clientes: any[]): Buffer {
  const doc = new jsPDF();
  
  // Cabeçalho
  doc.setFontSize(20);
  doc.text('Relatório de Vendedor', 14, 20);
  doc.setFontSize(12);
  doc.text('Palácio das Baterias - Análise de Desempenho', 14, 28);
  
  // Linha separadora
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);
  
  // Informações do Vendedor
  doc.setFontSize(14);
  doc.text('Dados do Vendedor', 14, 42);
  doc.setFontSize(10);
  doc.text(`Nome: ${vendedor.nome}`, 14, 50);
  doc.text(`Código: ${vendedor.codigoVendedor}`, 14, 56);
  
  // Métricas
  doc.setFontSize(14);
  doc.text('Métricas de Desempenho', 14, 68);
  doc.setFontSize(10);
  doc.text(`Total de Vendas: ${formatNumber(vendedor.totalVendas)}`, 14, 76);
  doc.text(`Valor Total: ${formatCurrency(vendedor.valorTotal)}`, 14, 82);
  doc.text(`Clientes Ativos: ${formatNumber(vendedor.clientesAtivos)}`, 14, 88);
  doc.text(`Desempenho vs Média: ${vendedor.desempenho >= 0 ? '+' : ''}${vendedor.desempenho.toFixed(1)}%`, 14, 94);
  
  // Carteira de Clientes
  if (clientes && clientes.length > 0) {
    doc.setFontSize(14);
    doc.text('Carteira de Clientes', 14, 106);
    
    const tableData = clientes.slice(0, 30).map(c => [
      c.nome,
      formatNumber(c.totalVendas),
      formatCurrency(c.valorTotal)
    ]);
    
    autoTable(doc, {
      startY: 110,
      head: [['Cliente', 'Vendas', 'Valor Total']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });
  }
  
  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}

export function gerarRelatorioExecutivo(kpis: any, topClientes: any[], topProdutos: any[]): Buffer {
  const doc = new jsPDF();
  
  // Cabeçalho
  doc.setFontSize(20);
  doc.text('Relatório Executivo', 14, 20);
  doc.setFontSize(12);
  doc.text('Palácio das Baterias - Resumo Gerencial', 14, 28);
  
  // Linha separadora
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);
  
  // KPIs Principais
  doc.setFontSize(14);
  doc.text('Indicadores Principais', 14, 42);
  doc.setFontSize(10);
  doc.text(`Total de Vendas: ${formatNumber(kpis.totalVendas)}`, 14, 50);
  doc.text(`Faturamento Total: ${formatCurrency(kpis.valorTotal)}`, 14, 56);
  doc.text(`Ticket Médio: ${formatCurrency(kpis.ticketMedio)}`, 14, 62);
  doc.text(`Clientes Únicos: ${formatNumber(kpis.clientesUnicos)}`, 14, 68);
  
  // Top 10 Clientes
  doc.setFontSize(14);
  doc.text('Top 10 Clientes', 14, 80);
  
  const clientesData = topClientes.slice(0, 10).map((c, i) => [
    `${i + 1}`,
    c.nomeCliente,
    formatCurrency(c.valorTotal)
  ]);
  
  autoTable(doc, {
    startY: 84,
    head: [['#', 'Cliente', 'Valor Total']],
    body: clientesData,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] }
  });
  
  // Top 10 Produtos
  const finalY = (doc as any).lastAutoTable.finalY || 140;
  doc.setFontSize(14);
  doc.text('Top 10 Produtos', 14, finalY + 10);
  
  const produtosData = topProdutos.slice(0, 10).map((p, i) => [
    `${i + 1}`,
    p.nomeProduto,
    formatNumber(p.quantidadeTotal),
    formatCurrency(p.valorTotal)
  ]);
  
  autoTable(doc, {
    startY: finalY + 14,
    head: [['#', 'Produto', 'Quantidade', 'Valor Total']],
    body: produtosData,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] }
  });
  
  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}
