import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface PDFOptions {
  titulo: string;
  subtitulo?: string;
  dados: any;
  tipo: 'clientes' | 'vendedores' | 'executivo' | 'produtos';
}

const CSS_TEMPLATE = `
@page {
  size: A4;
  margin: 2cm;
  @top-center {
    content: "Dashboard Palácio das Baterias";
    font-size: 10pt;
    color: #666;
  }
  @bottom-right {
    content: "Página " counter(page) " de " counter(pages);
    font-size: 9pt;
    color: #999;
  }
}

body {
  font-family: 'Helvetica', 'Arial', sans-serif;
  font-size: 10pt;
  line-height: 1.5;
  color: #333;
}

h1 {
  font-size: 24pt;
  font-weight: bold;
  margin-bottom: 0.5cm;
  color: #1a1a1a;
  border-bottom: 3px solid #0066cc;
  padding-bottom: 0.3cm;
}

h2 {
  font-size: 16pt;
  font-weight: bold;
  margin-top: 1cm;
  margin-bottom: 0.5cm;
  color: #0066cc;
}

h3 {
  font-size: 12pt;
  font-weight: bold;
  margin-top: 0.5cm;
  margin-bottom: 0.3cm;
  color: #333;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5cm 0;
  font-size: 9pt;
}

thead {
  background-color: #0066cc;
  color: white;
}

th {
  padding: 0.3cm;
  text-align: left;
  font-weight: bold;
}

td {
  padding: 0.25cm;
  border-bottom: 1px solid #e0e0e0;
}

tr:nth-child(even) {
  background-color: #f8f8f8;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5cm;
  margin: 0.5cm 0;
}

.kpi-card {
  border: 1px solid #e0e0e0;
  border-radius: 0.2cm;
  padding: 0.4cm;
  background-color: #f8f8f8;
}

.kpi-label {
  font-size: 9pt;
  color: #666;
  margin-bottom: 0.2cm;
}

.kpi-value {
  font-size: 18pt;
  font-weight: bold;
  color: #0066cc;
}

.footer {
  margin-top: 1cm;
  padding-top: 0.5cm;
  border-top: 1px solid #e0e0e0;
  font-size: 8pt;
  color: #999;
  text-align: center;
}
`;

function gerarHTMLClientes(dados: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${CSS_TEMPLATE}</style>
    </head>
    <body>
      <h1>Relatório de Clientes</h1>
      <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      
      <h2>Resumo</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total de Clientes</div>
          <div class="kpi-value">${dados.total || 0}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Clientes Ativos</div>
          <div class="kpi-value">${dados.ativos || 0}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Clientes Inativos</div>
          <div class="kpi-value">${dados.inativos || 0}</div>
        </div>
      </div>

      <h2>Lista de Clientes</h2>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nome</th>
            <th>Município/UF</th>
            <th>Tipo</th>
            <th>Total Compras</th>
            <th>Valor Total</th>
          </tr>
        </thead>
        <tbody>
          ${dados.clientes?.map((c: any) => `
            <tr>
              <td>${c.codigoCliente}</td>
              <td>${c.nome}</td>
              <td>${c.municipio}/${c.estado}</td>
              <td>${c.tipoCliente}</td>
              <td>${c.totalCompras || 0}</td>
              <td>R$ ${((c.valorTotal || 0) / 100).toFixed(2)}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>

      <div class="footer">
        Gerado automaticamente pelo Dashboard Palácio das Baterias
      </div>
    </body>
    </html>
  `;
}

function gerarHTMLVendedores(dados: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${CSS_TEMPLATE}</style>
    </head>
    <body>
      <h1>Relatório de Vendedores</h1>
      <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      
      <h2>Ranking de Vendedores</h2>
      <table>
        <thead>
          <tr>
            <th>Posição</th>
            <th>Código</th>
            <th>Nome</th>
            <th>Total Vendas</th>
            <th>Valor Total</th>
            <th>Ticket Médio</th>
            <th>Clientes Atendidos</th>
          </tr>
        </thead>
        <tbody>
          ${dados.vendedores?.map((v: any, index: number) => `
            <tr>
              <td><strong>#${index + 1}</strong></td>
              <td>${v.codigoVendedor}</td>
              <td>${v.nome}</td>
              <td>${v.totalVendas || 0}</td>
              <td>R$ ${((v.valorTotal || 0) / 100).toFixed(2)}</td>
              <td>R$ ${((v.ticketMedio || 0) / 100).toFixed(2)}</td>
              <td>${v.clientesAtendidos || 0}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>

      <div class="footer">
        Gerado automaticamente pelo Dashboard Palácio das Baterias
      </div>
    </body>
    </html>
  `;
}

function gerarHTMLExecutivo(dados: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${CSS_TEMPLATE}</style>
    </head>
    <body>
      <h1>Relatório Executivo</h1>
      <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      
      <h2>KPIs Principais</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total de Vendas</div>
          <div class="kpi-value">${dados.totalVendas || 0}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Valor Total</div>
          <div class="kpi-value">R$ ${((dados.valorTotal || 0) / 100).toFixed(2)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Ticket Médio</div>
          <div class="kpi-value">R$ ${((dados.ticketMedio || 0) / 100).toFixed(2)}</div>
        </div>
      </div>

      <h2>Top 10 Clientes</h2>
      <table>
        <thead>
          <tr>
            <th>Posição</th>
            <th>Nome</th>
            <th>Valor Total</th>
          </tr>
        </thead>
        <tbody>
          ${dados.topClientes?.slice(0, 10).map((c: any, index: number) => `
            <tr>
              <td><strong>#${index + 1}</strong></td>
              <td>${c.nome}</td>
              <td>R$ ${((c.valorTotal || 0) / 100).toFixed(2)}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>

      <h2>Top 10 Produtos</h2>
      <table>
        <thead>
          <tr>
            <th>Posição</th>
            <th>Produto</th>
            <th>Quantidade Vendida</th>
          </tr>
        </thead>
        <tbody>
          ${dados.topProdutos?.slice(0, 10).map((p: any, index: number) => `
            <tr>
              <td><strong>#${index + 1}</strong></td>
              <td>${p.descricao}</td>
              <td>${p.quantidadeVendida || 0}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>

      <div class="footer">
        Gerado automaticamente pelo Dashboard Palácio das Baterias
      </div>
    </body>
    </html>
  `;
}

export async function gerarPDF(options: PDFOptions): Promise<Buffer> {
  let html = '';
  
  switch (options.tipo) {
    case 'clientes':
      html = gerarHTMLClientes(options.dados);
      break;
    case 'vendedores':
      html = gerarHTMLVendedores(options.dados);
      break;
    case 'executivo':
      html = gerarHTMLExecutivo(options.dados);
      break;
    default:
      throw new Error(`Tipo de relatório não suportado: ${options.tipo}`);
  }

  // Salvar HTML temporário
  const tempHtmlPath = path.join('/tmp', `report-${Date.now()}.html`);
  const tempPdfPath = path.join('/tmp', `report-${Date.now()}.pdf`);

  try {
    await writeFile(tempHtmlPath, html, 'utf-8');

    // Gerar PDF com WeasyPrint
    await execAsync(`weasyprint ${tempHtmlPath} ${tempPdfPath}`);

    // Ler PDF gerado
    const fs = await import('fs/promises');
    const pdfBuffer = await fs.readFile(tempPdfPath);

    // Limpar arquivos temporários
    await unlink(tempHtmlPath);
    await unlink(tempPdfPath);

    return pdfBuffer;
  } catch (error) {
    // Limpar em caso de erro
    try {
      await unlink(tempHtmlPath);
      await unlink(tempPdfPath);
    } catch {}
    throw error;
  }
}
