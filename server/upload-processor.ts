import xlsx from 'xlsx';
import { getDb } from './db';
import { clientes, vendedores, produtos, movimentacoes, estoque, sellOut, uploads } from '../drizzle/schema';

interface UploadResult {
  success: boolean;
  message: string;
  recordsProcessed: number;
  errors?: string[];
}

export async function processarArquivo(
  tipoArquivo: string,
  fileBuffer: Buffer,
  nomeArquivo: string
): Promise<UploadResult> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Banco de dados não disponível');

    // Ler arquivo Excel/CSV
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return { success: false, message: 'Arquivo vazio', recordsProcessed: 0 };
    }

    let recordsProcessed = 0;
    const errors: string[] = [];

    // Processar conforme o tipo
    switch (tipoArquivo) {
      case 'clientes':
        recordsProcessed = await processarClientes(db, data, errors);
        break;
      case 'vendedores':
        recordsProcessed = await processarVendedores(db, data, errors);
        break;
      case 'produtos':
        recordsProcessed = await processarProdutos(db, data, errors);
        break;
      case 'movimentacoes':
        recordsProcessed = await processarMovimentacoes(db, data, errors);
        break;
      case 'estoque':
        recordsProcessed = await processarEstoque(db, data, errors);
        break;
      default:
        return { success: false, message: 'Tipo de arquivo não suportado', recordsProcessed: 0 };
    }

    // Registrar upload
    await db.insert(uploads).values({
      nomeArquivo,
      tipoArquivo: tipoArquivo as any,
      tamanhoBytes: fileBuffer.length,
      registrosProcessados: recordsProcessed,
      registrosComErro: errors.length,
      status: errors.length > 0 ? 'erro' : 'concluido',
      mensagemErro: errors.length > 0 ? JSON.stringify(errors) : null,
      dataProcessamento: new Date(),
    });

    return {
      success: true,
      message: `${recordsProcessed} registros processados com sucesso`,
      recordsProcessed,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      recordsProcessed: 0,
    };
  }
}

async function processarClientes(db: any, data: any[], errors: string[]): Promise<number> {
  let count = 0;
  for (const row of data) {
    try {
      await db.insert(clientes).values({
        codigoCliente: String(row.CODIGO || row.codigo || row['Código'] || ''),
        nome: String(row.NOME || row.nome || row['Nome'] || ''),
        tipoCliente: normalizarTipoCliente(row.TIPO || row.tipo || row['Tipo']),
        cnpjCpf: row.CNPJ || row.cnpj || row.CPF || row.cpf || null,
        endereco: row.ENDERECO || row.endereco || row['Endereço'] || null,
        municipio: row.MUNICIPIO || row.municipio || row['Município'] || null,
        estado: row.ESTADO || row.estado || row.UF || row.uf || null,
        telefone: row.TELEFONE || row.telefone || null,
      }).onDuplicateKeyUpdate({
        set: {
          nome: String(row.NOME || row.nome || ''),
          tipoCliente: normalizarTipoCliente(row.TIPO || row.tipo),
        },
      });
      count++;
    } catch (err) {
      errors.push(`Erro ao processar cliente ${row.CODIGO || row.codigo}: ${err}`);
    }
  }
  return count;
}

async function processarVendedores(db: any, data: any[], errors: string[]): Promise<number> {
  let count = 0;
  for (const row of data) {
    try {
      await db.insert(vendedores).values({
        codigoVendedor: String(row.CODIGO || row.codigo || row['Código'] || ''),
        nome: String(row.NOME || row.nome || row['Nome'] || ''),
        ativo: row.ATIVO !== undefined ? Boolean(row.ATIVO) : true,
      }).onDuplicateKeyUpdate({
        set: {
          nome: String(row.NOME || row.nome || ''),
          ativo: row.ATIVO !== undefined ? Boolean(row.ATIVO) : true,
        },
      });
      count++;
    } catch (err) {
      errors.push(`Erro ao processar vendedor ${row.CODIGO || row.codigo}: ${err}`);
    }
  }
  return count;
}

async function processarProdutos(db: any, data: any[], errors: string[]): Promise<number> {
  let count = 0;
  for (const row of data) {
    try {
      await db.insert(produtos).values({
        codigoProduto: String(row.CODIGO || row.codigo || row['Código'] || ''),
        descricao: String(row.DESCRICAO || row.descricao || row['Descrição'] || row.PRODUTO || row.produto || ''),
        categoria: row.CATEGORIA || row.categoria || null,
        unidade: row.UNIDADE || row.unidade || 'UN',
      }).onDuplicateKeyUpdate({
        set: {
          descricao: String(row.DESCRICAO || row.descricao || row.PRODUTO || ''),
          categoria: row.CATEGORIA || row.categoria || null,
        },
      });
      count++;
    } catch (err) {
      errors.push(`Erro ao processar produto ${row.CODIGO || row.codigo}: ${err}`);
    }
  }
  return count;
}

async function processarMovimentacoes(db: any, data: any[], errors: string[]): Promise<number> {
  let count = 0;
  for (const row of data) {
    try {
      const valorTotal = parseFloat(String(row.VALOR_TOTAL || row.valorTotal || row['Valor Total'] || row.VALOR || 0).replace(',', '.'));
      const quantidade = parseInt(String(row.QUANTIDADE || row.quantidade || row.QTD || 1));
      
      await db.insert(movimentacoes).values({
        codigoCliente: String(row.CODIGO_CLIENTE || row.codigoCliente || row['Código Cliente'] || row.CLIENTE || ''),
        codigoVendedor: String(row.CODIGO_VENDEDOR || row.codigoVendedor || row['Código Vendedor'] || row.VENDEDOR || ''),
        codigoProduto: String(row.CODIGO_PRODUTO || row.codigoProduto || row['Código Produto'] || row.PRODUTO || ''),
        data: parseData(row.DATA || row.data || row['Data']),
        quantidade,
        valorUnitario: Math.round((valorTotal / quantidade) * 100), // Converter para centavos
        valorTotal: Math.round(valorTotal * 100), // Converter para centavos
        tipoMovimento: row.TIPO || row.tipo || 'venda',
      });
      count++;
    } catch (err) {
      errors.push(`Erro ao processar movimentação linha ${count + 1}: ${err}`);
    }
  }
  return count;
}

async function processarEstoque(db: any, data: any[], errors: string[]): Promise<number> {
  let count = 0;
  for (const row of data) {
    try {
      await db.insert(estoque).values({
        codigoProduto: String(row.CODIGO_PRODUTO || row.codigoProduto || row['Código'] || ''),
        quantidadeDisponivel: parseInt(String(row.QUANTIDADE || row.quantidade || row.ESTOQUE || 0)),
        dataAtualizacao: parseData(row.DATA || row.data || new Date()),
      }).onDuplicateKeyUpdate({
        set: {
          quantidadeDisponivel: parseInt(String(row.QUANTIDADE || row.quantidade || 0)),
          dataAtualizacao: parseData(row.DATA || row.data || new Date()),
        },
      });
      count++;
    } catch (err) {
      errors.push(`Erro ao processar estoque ${row.CODIGO_PRODUTO || row.codigoProduto}: ${err}`);
    }
  }
  return count;
}

function normalizarTipoCliente(tipo: any): string {
  if (!tipo) return 'consumidor_final';
  const tipoStr = String(tipo).toLowerCase();
  if (tipoStr.includes('loja') || tipoStr.includes('propria') || tipoStr.includes('própria')) return 'loja_propria';
  if (tipoStr.includes('revend')) return 'revendedor';
  return 'consumidor_final';
}

function parseData(valor: any): Date {
  if (!valor) return new Date();
  if (valor instanceof Date) return valor;
  
  // Tentar parsear string de data
  const str = String(valor);
  
  // Formato DD/MM/YYYY
  if (str.includes('/')) {
    const [dia, mes, ano] = str.split('/');
    return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
  }
  
  // Formato YYYY-MM-DD
  if (str.includes('-')) {
    return new Date(str);
  }
  
  // Número serial do Excel
  if (!isNaN(Number(valor))) {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + Number(valor) * 86400000);
  }
  
  return new Date(str);
}
