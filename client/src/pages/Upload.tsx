import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload as UploadIcon, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Upload() {
  const [, setLocation] = useLocation();
  const [files, setFiles] = useState<FileList | null>(null);
  const [processando, setProcessando] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
    setMessage('');
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setMessage('❌ Selecione pelo menos um arquivo');
      return;
    }

    setProcessando(true);
    setMessage(`Processando ${files.length} arquivo(s)...`);

    try {
      // Checkpoint 1: Início do processo
      console.log('[UPLOAD] Iniciando upload de', files.length, 'arquivo(s)');
      
      // Ler conteúdo dos arquivos
      const fileContents: { [key: string]: string } = {};
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`[UPLOAD] Lendo arquivo ${i + 1}/${files.length}:`, file.name);
        const content = await file.text();
        fileContents[file.name] = content;
      }

      // Checkpoint 2: Arquivos lidos
      console.log('[UPLOAD] Todos os arquivos lidos com sucesso');
      
      // Salvar no localStorage para fallback
      localStorage.setItem('upload_backup', JSON.stringify(fileContents));
      console.log('[UPLOAD] Backup salvo no localStorage');

      // Checkpoint 3: Tentando enviar ao servidor
      console.log('[UPLOAD] Enviando dados ao servidor...');
      
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      // Checkpoint 4: Resposta recebida
      console.log('[UPLOAD] Resposta do servidor:', response.status);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao processar arquivos');
      }

      const resultado = await response.json();
      
      // Checkpoint 5: Sucesso
      console.log('[UPLOAD] Processamento concluído:', resultado);
      setMessage(`✅ ${resultado.totalProcessado} registros processados com sucesso!`);
      
      // Limpar backup
      localStorage.removeItem('upload_backup');
      
      setTimeout(() => {
        setLocation('/');
      }, 2000);
      
    } catch (error: any) {
      console.error('[UPLOAD] Erro capturado:', error);
      
      // Detectar erro de bloqueio
      if (
        error.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('blocked')
      ) {
        console.warn('[UPLOAD] Erro de bloqueio detectado! Redirecionando para /importar');
        
        toast.error('Erro de bloqueio detectado. Tente usar a página /importar.');
        
        // Redirecionar para /importar após 2 segundos
        setTimeout(() => {
          setLocation('/importar');
        }, 2000);
        
        setMessage('⚠️ Erro de bloqueio detectado. Redirecionando para método alternativo...');
      } else {
        setProcessando(false);
        setMessage(`❌ Erro: ${error.message || error}`);
        toast.error(`Erro: ${error.message || error}`);
      }
    }
  };

  // Verificar se há backup no localStorage
  const hasBackup = localStorage.getItem('upload_backup') !== null;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => setLocation('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Dashboard
        </Button>

        {hasBackup && (
          <Card className="p-4 mb-6 bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Dados de upload anterior encontrados</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Parece que houve um problema no upload anterior. 
                  <Button
                    variant="link"
                    className="p-0 h-auto text-yellow-900 underline ml-1"
                    onClick={() => setLocation('/importar')}
                  >
                    Clique aqui para usar o método alternativo (copiar/colar)
                  </Button>
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <UploadIcon className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Upload de Arquivos</h1>
            <p className="text-muted-foreground">
              Envie seus arquivos CSV ou Excel
            </p>
          </div>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              {processando ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Processando...</p>
                  <p className="text-sm text-muted-foreground">{message}</p>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer inline-block"
                  >
                    <Button type="button" onClick={() => document.getElementById('file-upload')?.click()}>
                      Escolher Arquivos
                    </Button>
                  </label>

                  {files && files.length > 0 && (
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <p className="font-medium mb-2">
                        {files.length} arquivo(s) selecionado(s):
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {Array.from(files).map((file, idx) => (
                          <li key={idx}>{file.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {message && (
                    <div className={`mt-4 p-4 rounded-lg ${
                      message.startsWith('✅') 
                        ? 'bg-green-50 text-green-700' 
                        : message.startsWith('⚠️')
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {message}
                    </div>
                  )}
                </>
              )}
            </div>

            {files && files.length > 0 && !processando && (
              <Button
                onClick={handleUpload}
                className="w-full"
                size="lg"
              >
                Processar Arquivos
              </Button>
            )}

            <div className="bg-muted p-6 rounded-lg">
              <h3 className="font-semibold mb-3">Instruções:</h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Prepare seus arquivos CSV ou Excel com os dados atualizados</li>
                <li>Certifique-se de que os arquivos seguem o formato esperado</li>
                <li>Clique em "Escolher Arquivos" e selecione todos os arquivos de uma vez</li>
                <li>Aguarde o processamento (isso pode levar alguns minutos)</li>
                <li>Você será redirecionado automaticamente para o dashboard</li>
              </ol>
              
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>Formatos aceitos:</strong> CSV, Excel (.xlsx, .xls)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Arquivos esperados:</strong> CADASTRO_CLIENTES.csv, CADASTRO_VENDEDORES.csv, 
                  MOVIMENTO_DISTRIBUIDOR.csv, RELACAO_PRODUTOS.csv, ESTOQUE.csv
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Problemas com upload?</strong>{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs underline"
                    onClick={() => setLocation('/importar')}
                  >
                    Use o método alternativo (copiar/colar)
                  </Button>
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
