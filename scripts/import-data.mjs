import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { clientes, vendedores, produtos, movimentacoes, estoque, sellOut } from '../drizzle/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para converter data DD/MM/YYYY para YYYY-MM-DD
function convertDate(dateStr) {
  if (!dateStr || dateStr === '') return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return null;
}

// Função para converter valor monetário para centavos
function convertToCents(value) {
  if (!value || value === '') return 0;
  const numValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  return Math.round(numValue * 100);
}

// Função para limpar aspas dos valores CSV
function cleanValue(value) {
  if (typeof value === 'string') {
    return value.replace(/^"|"$/g, '').trim();
  }
  return value;
}

// Função para parsear CSV
function parseCSV(content, delimiter = ';') {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(delimiter).map(h => cleanValue(h));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter);
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = cleanValue(values[index] || '');
    });
    data.push(obj);
  }
  
  return data;
}

async function main() {
  console.log('🚀 Iniciando importação de dados...\n');
  
  // Conectar ao banco
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  try {
    // 1. Importar CLIENTES
    console.log('📋 Importando clientes...');
    const clientesContent = fs.readFileSync('/home/ubuntu/upload/CADASTRO_CLIENTES_utf8.csv', 'utf-8');
    const clientesData = parseCSV(clientesContent);
    
    let clientesImportados = 0;
    for (const row of clientesData) {
      try {
        // Determinar tipo de cliente baseado no nome
        let tipoCliente = 'consumidor_final';
        const nomeUpper = row['Nome']?.toUpperCase() || '';
        
        if (nomeUpper.includes('LUCENA') || nomeUpper.includes('PALACIO') || nomeUpper.includes('FRUTO')) {
          tipoCliente = 'loja_propria';
        } else if (row['CNPJ'] && row['CNPJ'] !== '111.111.111-11' && row['Nome'] !== 'CONSUMIDOR FINAL') {
          tipoCliente = 'revendedor';
        }
        
        await db.insert(clientes).values({
          codigoCliente: row['Código do Cliente'] || '',
          cnpj: row['CNPJ'] || null,
          nome: row['Nome'] || '',
          endereco: row['Endereço'] || null,
          bairro: row['Bairro'] || null,
          municipio: row['Município'] || null,
          estado: row['Estado'] || null,
          cep: row['CEP'] || null,
          email: row['E-mail'] || null,
          telefone: row['Telefone'] || null,
          inscricaoEstadual: row['Inscrição Estadual'] || null,
          tipoCliente: tipoCliente,
        }).onDuplicateKeyUpdate({
          set: { nome: row['Nome'] }
        });
        clientesImportados++;
      } catch (error) {
        console.error(`Erro ao importar cliente ${row['Código do Cliente']}:`, error.message);
      }
    }
    console.log(`✅ ${clientesImportados} clientes importados\n`);
    
    // 2. Importar VENDEDORES
    console.log('👥 Importando vendedores...');
    const vendedoresContent = fs.readFileSync('/home/ubuntu/upload/CADASTRO_VENDEDORES_utf8.csv', 'utf-8');
    const vendedoresData = parseCSV(vendedoresContent);
    
    let vendedoresImportados = 0;
    for (const row of vendedoresData) {
      try {
        await db.insert(vendedores).values({
          codigoVendedor: row['Código Vendedor'] || '',
          nome: row['Nome'] || '',
          ativo: true,
        }).onDuplicateKeyUpdate({
          set: { nome: row['Nome'] }
        });
        vendedoresImportados++;
      } catch (error) {
        console.error(`Erro ao importar vendedor ${row['Código Vendedor']}:`, error.message);
      }
    }
    console.log(`✅ ${vendedoresImportados} vendedores importados\n`);
    
    // 3. Importar PRODUTOS
    console.log('📦 Importando produtos...');
    const produtosContent = fs.readFileSync('/home/ubuntu/upload/RELACAO_PRODUTOS_utf8.csv', 'utf-8');
    const produtosData = parseCSV(produtosContent);
    
    let produtosImportados = 0;
    for (const row of produtosData) {
      try {
        await db.insert(produtos).values({
          codigoProduto: row['Código Produto'] || '',
          descricao: row['Descrição Produto'] || '',
          doh: 0,
        }).onDuplicateKeyUpdate({
          set: { descricao: row['Descrição Produto'] }
        });
        produtosImportados++;
      } catch (error) {
        console.error(`Erro ao importar produto ${row['Código Produto']}:`, error.message);
      }
    }
    console.log(`✅ ${produtosImportados} produtos importados\n`);
    
    // 4. Importar MOVIMENTAÇÕES
    console.log('💰 Importando movimentações...');
    const movimentacoesContent = fs.readFileSync('/home/ubuntu/upload/MOVIMENTO_DISTRIBUIDOR_utf8.csv', 'utf-8');
    const movimentacoesData = parseCSV(movimentacoesContent);
    
    let movimentacoesImportadas = 0;
    let movimentacoesErro = 0;
    
    for (const row of movimentacoesData) {
      try {
        const data = convertDate(row['Data']);
        if (!data) {
          movimentacoesErro++;
          continue;
        }
        
        await db.insert(movimentacoes).values({
          distribuidor: row['Distribuidor'] || null,
          cnpjDistribuidor: row['CNPJ'] || null,
          codigoVendedor: row['Código Vendedor'] || null,
          nomeVendedor: row['Nome Vendedor'] || null,
          codigoCliente: row['Código Cliente'] || '',
          nomeCliente: row['Nome Cliente'] || null,
          codigoProduto: row['Código Produto'] || '',
          nomeProduto: row['Nome Produto'] || null,
          quantidade: parseInt(row['Quantidade'] || '0'),
          valorTotal: convertToCents(row['Valor Total']),
          data: data,
          numeroNota: row['Número Nota'] || null,
          tipoSaida: row['Tipo de Saída'] || null,
          descricaoSaida: row['Descrição Saída'] || null,
        });
        movimentacoesImportadas++;
        
        if (movimentacoesImportadas % 5000 === 0) {
          console.log(`   ${movimentacoesImportadas} movimentações processadas...`);
        }
      } catch (error) {
        movimentacoesErro++;
        if (movimentacoesErro <= 5) {
          console.error(`Erro ao importar movimentação:`, error.message);
        }
      }
    }
    console.log(`✅ ${movimentacoesImportadas} movimentações importadas (${movimentacoesErro} erros)\n`);
    
    // 5. Importar ESTOQUE
    console.log('📊 Importando estoque...');
    const estoqueContent = fs.readFileSync('/home/ubuntu/upload/ESTOQUE_utf8.csv', 'utf-8');
    const estoqueData = parseCSV(estoqueContent);
    
    let estoqueImportado = 0;
    for (const row of estoqueData) {
      try {
        const data = convertDate(row['Data']);
        if (!data) continue;
        
        await db.insert(estoque).values({
          distribuidor: row['Distribuidor'] || null,
          codigoProduto: row['Código Produto'] || '',
          quantidade: parseInt(row['Quantidade'] || '0'),
          dataEstoque: data,
        });
        estoqueImportado++;
      } catch (error) {
        console.error(`Erro ao importar estoque:`, error.message);
      }
    }
    console.log(`✅ ${estoqueImportado} registros de estoque importados\n`);
    
    console.log('🎉 Importação concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
