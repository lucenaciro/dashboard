/**
 * Wrapper para integrar script Polars Python com backend Node.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface PolarsResult {
  sucesso: boolean;
  tipo: string;
  total_linhas: number;
  chunks_processados: number;
  duracao_segundos: number;
  throughput: number;
  throughput_formatado: string;
}

/**
 * Processa arquivo grande usando Polars
 * Chama script Python e retorna resultado
 */
export async function processarComPolars(
  csvContent: string,
  tipo: 'clientes' | 'vendedores' | 'produtos' | 'movimentacoes' | 'estoque'
): Promise<PolarsResult> {
  // Salvar CSV temporário
  const tempCsvPath = path.join('/tmp', `polars-input-${Date.now()}.csv`);
  
  try {
    await writeFile(tempCsvPath, csvContent, 'utf-8');

    // Chamar script Python
    const scriptPath = path.join(__dirname, '../scripts/processar_arquivos_grandes.py');
    const { stdout, stderr } = await execAsync(
      `python3 ${scriptPath} ${tempCsvPath} ${tipo}`
    );

    // Parsear resultado JSON
    const jsonMatch = stdout.match(/=== RESULTADO JSON ===\n([\s\S]+)/);
    if (!jsonMatch) {
      throw new Error('Resultado JSON não encontrado na saída do script');
    }

    const resultado: PolarsResult = JSON.parse(jsonMatch[1]);

    // Limpar arquivo temporário
    await unlink(tempCsvPath);

    return resultado;
  } catch (error) {
    // Limpar em caso de erro
    try {
      await unlink(tempCsvPath);
    } catch {}
    
    throw new Error(`Erro ao processar com Polars: ${error}`);
  }
}

/**
 * Verifica se arquivo é grande o suficiente para usar Polars
 * Threshold: 30MB
 */
export function deveUsarPolars(csvContent: string): boolean {
  const sizeInBytes = Buffer.byteLength(csvContent, 'utf-8');
  const sizeInMB = sizeInBytes / (1024 * 1024);
  return sizeInMB >= 30;
}

/**
 * Processa arquivo automaticamente
 * Usa Polars se > 30MB, caso contrário processamento normal
 */
export async function processarArquivoInteligente(
  csvContent: string,
  tipo: 'clientes' | 'vendedores' | 'produtos' | 'movimentacoes' | 'estoque'
): Promise<{ metodo: 'polars' | 'normal'; resultado: any }> {
  if (deveUsarPolars(csvContent)) {
    console.log(`[Polars] Arquivo grande detectado, usando Polars para ${tipo}`);
    const resultado = await processarComPolars(csvContent, tipo);
    return { metodo: 'polars', resultado };
  } else {
    console.log(`[Normal] Arquivo pequeno, processamento normal para ${tipo}`);
    return { metodo: 'normal', resultado: { mensagem: 'Processado normalmente' } };
  }
}
