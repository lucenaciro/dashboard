import xlsx from 'xlsx';
import { getDb } from './db';
import { clientes, vendedores, produtos, movimentacoes, estoque } from '../drizzle/schema';

export async function processarUpload(arquivos: { nome: string; base64: string }[]) {
  const db = await getDb();
  if (!db) throw new Error('Banco indisponível');

  let totalProcessado = 0;

  for (const arq of arquivos) {
    const buffer = Buffer.from(arq.base64, 'base64');
    const workbook = xlsx.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const dados: any[] = xlsx.utils.sheet_to_json(sheet);

    const nome = arq.nome.toLowerCase();

    if (nome.includes('cliente')) {
      for (const row of dados) {
        await db.insert(clientes).values({
          codigoCliente: String(row.CODIGO || row.codigo || ''),
          nome: String(row.NOME || row.nome || ''),
          tipoCliente: 'consumidor_final',
          cnpj: row.CNPJ || row.cnpj || null,
          endereco: row.ENDERECO || row.endereco || null,
          municipio: row.MUNICIPIO || row.municipio || null,
          estado: row.ESTADO || row.estado || null,
          telefone: row.TELEFONE || row.telefone || null,
        }).onDuplicateKeyUpdate({ set: { nome: String(row.NOME || row.nome || '') } });
        totalProcessado++;
      }
    }

    if (nome.includes('vendedor')) {
      for (const row of dados) {
        await db.insert(vendedores).values({
          codigoVendedor: String(row.CODIGO || row.codigo || ''),
          nome: String(row.NOME || row.nome || ''),
          ativo: true,
        }).onDuplicateKeyUpdate({ set: { nome: String(row.NOME || row.nome || '') } });
        totalProcessado++;
      }
    }

    if (nome.includes('produto')) {
      for (const row of dados) {
        await db.insert(produtos).values({
          codigoProduto: String(row.CODIGO || row.codigo || ''),
          descricao: String(row.DESCRICAO || row.descricao || row.PRODUTO || ''),
        }).onDuplicateKeyUpdate({ set: { descricao: String(row.DESCRICAO || row.descricao || '') } });
        totalProcessado++;
      }
    }

    if (nome.includes('movimento') || nome.includes('distribuidor')) {
      for (const row of dados) {
        const valor = parseFloat(String(row.VALOR_TOTAL || row.valorTotal || row.VALOR || 0).replace(',', '.'));
        await db.insert(movimentacoes).values({
          codigoCliente: String(row.CODIGO_CLIENTE || row.codigoCliente || row.CLIENTE || ''),
          codigoVendedor: String(row.CODIGO_VENDEDOR || row.codigoVendedor || row.VENDEDOR || ''),
          codigoProduto: String(row.CODIGO_PRODUTO || row.codigoProduto || row.PRODUTO || ''),
          data: new Date(row.DATA || row.data || Date.now()),
          quantidade: parseInt(String(row.QUANTIDADE || row.quantidade || 1)),
          valorTotal: Math.round(valor * 100),
        });
        totalProcessado++;
      }
    }

    if (nome.includes('estoque')) {
      for (const row of dados) {
        await db.insert(estoque).values({
          codigoProduto: String(row.CODIGO || row.codigo || row.CODIGO_PRODUTO || ''),
          quantidade: parseInt(String(row.QUANTIDADE || row.quantidade || 0)),
          dataEstoque: new Date(),
        });
        totalProcessado++;
      }
    }
  }

  return { success: true, totalProcessado };
}
