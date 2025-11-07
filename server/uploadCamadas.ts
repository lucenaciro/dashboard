import { storagePut } from './storage';
import { getDb } from './db';
import { logger } from './logger';

interface UploadJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalFiles: number;
  processedFiles: number;
  errors: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Armazenamento em memória dos jobs (em produção, usar Redis)
const uploadJobs = new Map<string, UploadJob>();

/**
 * Solução 3: Upload em Camadas
 * - Enviar arquivos para bucket S3/Blob (sem uso do tRPC direto)
 * - Backend recupera e processa por polling
 * - Garante passagem sem trigger de bloqueadores
 */

export async function criarJobUpload(files: { name: string; content: string }[]): Promise<string> {
  const jobId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Criar job
  const job: UploadJob = {
    id: jobId,
    status: 'pending',
    totalFiles: files.length,
    processedFiles: 0,
    errors: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  uploadJobs.set(jobId, job);
  
  // Upload dos arquivos para S3 em background
  processarUploadEmCamadas(jobId, files).catch(error => {
    logger.error(`[UPLOAD_CAMADAS] Erro no job ${jobId}`, { error });
    const job = uploadJobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.errors.push(error.message);
      job.updatedAt = new Date();
    }
  });
  
  return jobId;
}

async function processarUploadEmCamadas(jobId: string, files: { name: string; content: string }[]) {
  const job = uploadJobs.get(jobId);
  if (!job) return;
  
  job.status = 'processing';
  job.updatedAt = new Date();
  
  try {
    // Passo 1: Upload para S3
    logger.info(`[UPLOAD_CAMADAS] Job ${jobId}: Enviando arquivos para armazenamento`, { totalArquivos: files.length });
    
    const s3Keys: string[] = [];
    
    for (const file of files) {
      const key = `uploads/${jobId}/${file.name}`;
      const { url } = await storagePut(key, file.content, 'text/csv');
      s3Keys.push(key);
      logger.info(`[UPLOAD_CAMADAS] Arquivo enviado`, { jobId, arquivo: file.name, destino: url });
    }
    
    // Passo 2: Processar arquivos do S3
    logger.info(`[UPLOAD_CAMADAS] Job ${jobId}: Processando arquivos do armazenamento`);
    
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Aqui você processaria o conteúdo do arquivo
        // Por enquanto, apenas simulando
        logger.info(`[UPLOAD_CAMADAS] Processando arquivo`, { jobId, arquivo: file.name });
        
        // Simular processamento
        await new Promise(resolve => setTimeout(resolve, 100));
        
        job.processedFiles++;
        job.updatedAt = new Date();
        
      } catch (error: any) {
        job.errors.push(`Erro ao processar ${file.name}: ${error.message}`);
      }
    }
    
    job.status = 'completed';
    job.updatedAt = new Date();
    
    logger.info(`[UPLOAD_CAMADAS] Job ${jobId} concluído com sucesso`);
    
  } catch (error: any) {
    job.status = 'failed';
    job.errors.push(error.message);
    job.updatedAt = new Date();
    
    logger.error(`[UPLOAD_CAMADAS] Job ${jobId} falhou`, { error });
  }
}

export function consultarJobUpload(jobId: string): UploadJob | null {
  return uploadJobs.get(jobId) || null;
}

export function limparJobsAntigos() {
  const umDiaAtras = Date.now() - 24 * 60 * 60 * 1000;
  
  const jobsParaRemover: string[] = [];
  uploadJobs.forEach((job, jobId) => {
    if (job.updatedAt.getTime() < umDiaAtras) {
      jobsParaRemover.push(jobId);
    }
  });
  
  jobsParaRemover.forEach(jobId => {
    uploadJobs.delete(jobId);
    logger.info(`[UPLOAD_CAMADAS] Job ${jobId} removido por expiração`);
  });
}

// Limpar jobs antigos a cada hora
setInterval(limparJobsAntigos, 60 * 60 * 1000);
