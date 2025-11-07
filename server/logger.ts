/**
 * Sistema de logging técnico detalhado
 * Registra campos inválidos, linhas descartadas, total processado
 * Salva logs em TXT + JSON para download
 */

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

function safeSerialize(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: 'cause' in value && value.cause ? safeSerialize(value.cause as unknown, seen) : undefined,
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(item => safeSerialize(item, seen));
  }

  if (value && typeof value === 'object') {
    if (seen.has(value as object)) {
      return '[Circular]';
    }
    seen.add(value as object);
    const serialized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      serialized[key] = safeSerialize(entry, seen);
    }
    seen.delete(value as object);
    return serialized;
  }

  if (value === null) {
    return null;
  }

  return value;
}

export interface LogEntry {
  timestamp: string;
  nivel: LogLevel;
  cicloId?: number;
  tipoArquivo?: string;
  mensagem: string;
  detalhes?: unknown;
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
  private logDir: string = '/tmp/dashboard-logs';

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

  info(mensagem: string, detalhes?: unknown) {
    this.addLog('INFO', mensagem, detalhes);
  }

  warn(mensagem: string, detalhes?: unknown) {
    this.addLog('WARN', mensagem, detalhes);
  }

  error(mensagem: string, detalhes?: unknown) {
    this.addLog('ERROR', mensagem, detalhes);
  }

  private addLog(nivel: LogLevel, mensagem: string, detalhes?: unknown) {
    const timestamp = this.formatTimestamp();
    const serializedDetails = detalhes === undefined ? undefined : safeSerialize(detalhes);

    const entry: LogEntry = {
      timestamp,
      nivel,
      mensagem,
      detalhes: serializedDetails,
    };

    this.logs.push(entry);

    const payload: Record<string, unknown> = {
      ts: timestamp,
      level: nivel,
      message: mensagem,
    };

    if (serializedDetails !== undefined) {
      payload.details = serializedDetails;
    }

    const line = JSON.stringify(payload);
    switch (nivel) {
      case 'ERROR':
        console.error(line);
        break;
      case 'WARN':
        console.warn(line);
        break;
      default:
        console.log(line);
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
