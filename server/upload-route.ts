import { Router } from 'express';
import multer from 'multer';
import { processarUpload } from './process-upload';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const arquivos = files.map(file => ({
      nome: file.originalname,
      base64: file.buffer.toString('base64'),
    }));

    const resultado = await processarUpload(arquivos);
    
    res.json(resultado);
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;
