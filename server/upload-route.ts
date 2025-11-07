import { Router } from 'express';
import multer from 'multer';
import cors from 'cors';
import { processarUpload } from './process-upload';
import { logger } from './logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Enable CORS for upload endpoint
router.use(cors());

router.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const dryRunParam = typeof req.query.dryRun === 'string' ? req.query.dryRun : undefined;
    const dryRun = dryRunParam ? /^(1|true|on|yes)$/i.test(dryRunParam) : false;

    const arquivos = files.map(file => ({
      nome: file.originalname,
      base64: file.buffer.toString('base64'),
    }));

    const resultado = await processarUpload(arquivos, { dryRun });

    res.json(resultado);
  } catch (error) {
    logger.error('Erro no upload', { error });
    res.status(500).json({ error: String(error) });
  }
});

export default router;
