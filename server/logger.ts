/**
 * Sistema de logging técnico detalhado
 * Registra campos inválidos, linhas descartadas, total processado
 * Salva logs em TXT + JSON para download
 */

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { logger as baseLogger, getCurrentLogFile } from '../src/shared/logger';

export interface LogEntry {
  timestamp: string;
  nivel: 'INFO' | 'WARN' | 'ERROR';
  cicloId?: number;
  tipoArquivo?: string;
  mensagem: string;
  detalhes?: any;
}

export interface ProcessingLog {
  cicloId: number;
  tipoArquivo: string;
  inicio: string;
  fim?: string;
  status: 'processando' | 'concluido' | 'erro';
  totalLinhas: number;
  linhasValidas: number;
  linhasInvalidas: number;
  linhasDescartadas: number;
  camposInvalidos: Array<{
    linha: number;
    campo: string;
    valor: any;
    erro: string;
  }>;
  avisos: string[];
  erros: string[];
}

class Logger {
  private logs: LogEntry[] = [];
  private processLogs: Map<string, ProcessingLog> = new Map();
  private logDir: string = process.env.LOG_DIR ? path.resolve(process.cwd(), process.env.LOG_DIR) : '/tmp/dashboard-logs';

  constructor() {
    this.init();
  }

  private async init() {
    try {
      await mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Erro ao criar diretório de logs:', error);
    }
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  info(mensagem: string, detalhes?: any) {
    this.addLog('INFO', mensagem, detalhes);
  }

  warn(mensagem: string, detalhes?: any) {
    this.addLog('WARN', mensagem, detalhes);
  }

  error(mensagem: string, detalhes?: any) {
    this.addLog('ERROR', mensagem, detalhes);
  }

  private addLog(nivel: LogEntry['nivel'], mensagem: string, detalhes?: any) {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      nivel,
      mensagem,
      detalhes,
    };

    this.logs.push(entry);
    
    const meta = detalhes && typeof detalhes === 'object' ? detalhes : undefined;
    if (nivel === 'ERROR') {
      void baseLogger.error(mensagem, meta);
    } else if (nivel === 'WARN') {
      void baseLogger.warn(mensagem, meta);
    } else {
      void baseLogger.info(mensagem, meta);
    }
  }

  /**
   * Inicia log de processamento de arquivo
   */
  startProcessing(cicloId: number, tipoArquivo: string): string {
    const logId = `${cicloId}-${tipoArquivo}-${Date.now()}`;
    
    const processLog: ProcessingLog = {
      cicloId,
      tipoArquivo,
      inicio: this.formatTimestamp(),
      status: 'processando',
      totalLinhas: 0,
      linhasValidas: 0,
      linhasInvalidas: 0,
      linhasDescartadas: 0,
      camposInvalidos: [],
      avisos: [],
      erros: [],
    };

    this.processLogs.set(logId, processLog);
    this.info(`Iniciando processamento: ${tipoArquivo}`, { cicloId, logId });

    return logId;
  }

  /**
   * Registra campo inválido
   */
  logInvalidField(logId: string, linha: number, campo: string, valor: any, erro: string) {
    const log = this.processLogs.get(logId);
    if (log) {
      log.camposInvalidos.push({ linha, campo, valor, erro });
      log.linhasInvalidas++;
    }
  }

  /**
   * Registra linha descartada
   */
  logDiscardedLine(logId: string, linha: number, motivo: string) {
    const log = this.processLogs.get(logId);
    if (log) {
      log.linhasDescartadas++;
      log.erros.push(`Linha ${linha}: ${motivo}`);
    }
  }

  /**
   * Registra aviso
   */
  logWarning(logId: string, aviso: string) {
    const log = this.processLogs.get(logId);
    if (log) {
      log.avisos.push(aviso);
    }
    this.warn(aviso, { logId });
  }

  /**
   * Finaliza log de processamento
   */
  endProcessing(logId: string, sucesso: boolean = true) {
    const log = this.processLogs.get(logId);
    if (log) {
      log.fim = this.formatTimestamp();
      log.status = sucesso ? 'concluido' : 'erro';
      log.linhasValidas = log.totalLinhas - log.linhasInvalidas - log.linhasDescartadas;

      this.info(`Processamento finalizado: ${log.tipoArquivo}`, {
        totalLinhas: log.totalLinhas,
        linhasValidas: log.linhasValidas,
        linhasInvalidas: log.linhasInvalidas,
        linhasDescartadas: log.linhasDescartadas,
      });
    }
  }

  /**
   * Obtém log de processamento
   */
  getProcessLog(logId: string): ProcessingLog | undefined {
    return this.processLogs.get(logId);
  }

  /**
   * Salva logs em arquivo TXT
   */
  async saveToTXT(logId: string): Promise<string> {
    const log = this.processLogs.get(logId);
    if (!log) throw new Error('Log não encontrado');

    const lines: string[] = [];
    lines.push('='.repeat(80));
    lines.push(`LOG DE PROCESSAMENTO - ${log.tipoArquivo.toUpperCase()}`);
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Ciclo ID: ${log.cicloId}`);
    lines.push(`Início: ${log.inicio}`);
    lines.push(`Fim: ${log.fim || 'Em processamento'}`);
    lines.push(`Status: ${log.status}`);
    lines.push('');
    lines.push('-'.repeat(80));
    lines.push('ESTATÍSTICAS');
    lines.push('-'.repeat(80));
    lines.push(`Total de linhas: ${log.totalLinhas}`);
    lines.push(`Linhas válidas: ${log.linhasValidas}`);
    lines.push(`Linhas inválidas: ${log.linhasInvalidas}`);
    lines.push(`Linhas descartadas: ${log.linhasDescartadas}`);
    lines.push('');

    if (log.camposInvalidos.length > 0) {
      lines.push('-'.repeat(80));
      lines.push('CAMPOS INVÁLIDOS');
      lines.push('-'.repeat(80));
      log.camposInvalidos.forEach(({ linha, campo, valor, erro }) => {
        lines.push(`Linha ${linha} | Campo: ${campo} | Valor: ${valor} | Erro: ${erro}`);
      });
      lines.push('');
    }

    if (log.avisos.length > 0) {
      lines.push('-'.repeat(80));
      lines.push('AVISOS');
      lines.push('-'.repeat(80));
      log.avisos.forEach(aviso => lines.push(`⚠ ${aviso}`));
      lines.push('');
    }

    if (log.erros.length > 0) {
      lines.push('-'.repeat(80));
      lines.push('ERROS');
      lines.push('-'.repeat(80));
      log.erros.forEach(erro => lines.push(`✗ ${erro}`));
      lines.push('');
    }

    lines.push('='.repeat(80));

    const filename = `log-${logId}.txt`;
    const filepath = path.join(this.logDir, filename);
    await writeFile(filepath, lines.join('\n'), 'utf-8');

    return filepath;
  }

  /**
   * Salva logs em arquivo JSON
   */
  async saveToJSON(logId: string): Promise<string> {
    const log = this.processLogs.get(logId);
    if (!log) throw new Error('Log não encontrado');

    const filename = `log-${logId}.json`;
    const filepath = path.join(this.logDir, filename);
    await writeFile(filepath, JSON.stringify(log, null, 2), 'utf-8');

    return filepath;
  }

  /**
   * Obtém todos os logs
   */
  getAllLogs(): LogEntry[] {
    return this.logs;
  }

  /**
   * Limpa logs antigos
   */
  clearOldLogs(diasRetencao: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - diasRetencao);

    this.logs = this.logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate > cutoffDate;
    });

    this.info(`Logs antigos limpos (retenção: ${diasRetencao} dias)`);
  }
}

// Singleton
export const logger = new Logger();
export const currentLogFile = getCurrentLogFile;
