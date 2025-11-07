import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { getDb } from './db';
import { logger } from './logger';

/**
 * Solução 4: Upload via WebSocket
 * - Utilizar socket.io para transmissão do conteúdo dos arquivos
 * - Navegadores e firewalls tratam websockets de forma distinta
 * - Menos provável de ser bloqueado por extensões
 */

export function setupWebSocketUpload(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io/',
  });

  io.on('connection', (socket) => {
    logger.info('[WEBSOCKET] Cliente conectado', { socketId: socket.id });

    socket.on('upload:start', async (data: { totalFiles: number }) => {
      logger.info('[WEBSOCKET] Iniciando upload', { totalArquivos: data.totalFiles, socketId: socket.id });

      socket.emit('upload:ready', {
        uploadId: `ws_${Date.now()}_${socket.id.substr(0, 8)}`,
        message: 'Pronto para receber arquivos',
      });
    });

    socket.on('upload:file', async (data: { name: string; content: string; index: number; total: number }) => {
      logger.info('[WEBSOCKET] Recebendo arquivo', {
        socketId: socket.id,
        arquivo: data.name,
        indice: data.index + 1,
        total: data.total,
      });

      try {
        // Processar arquivo
        const db = await getDb({ role: 'importer' });
        if (!db) {
          socket.emit('upload:error', { message: 'Database not available' });
          return;
        }

        // Aqui você processaria o conteúdo do arquivo
        // Por enquanto, apenas simulando
        await new Promise(resolve => setTimeout(resolve, 100));

        socket.emit('upload:progress', {
          fileIndex: data.index,
          fileName: data.name,
          processed: data.index + 1,
          total: data.total,
          percentage: Math.round(((data.index + 1) / data.total) * 100),
        });

        // Se for o último arquivo
        if (data.index === data.total - 1) {
          socket.emit('upload:complete', {
            message: 'Todos os arquivos processados com sucesso',
            totalProcessed: data.total,
          });
        }
      } catch (error: any) {
        logger.error('[WEBSOCKET] Erro ao processar arquivo', { error, arquivo: data.name, socketId: socket.id });
        socket.emit('upload:error', {
          fileName: data.name,
          message: error.message,
        });
      }
    });

    socket.on('disconnect', () => {
      logger.info('[WEBSOCKET] Cliente desconectado', { socketId: socket.id });
    });
  });

  logger.info('[WEBSOCKET] Servidor WebSocket configurado');

  return io;
}
