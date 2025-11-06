import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload as UploadIcon, ArrowLeft, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { detectarBloqueadores, healthCheckUpload, exibirAlertaBloqueadores } from '@/lib/detectarBloqueadores';
import { trpc } from '@/lib/trpc';

export default function Upload() {
  const [, setLocation] = useLocation();
  const [files, setFiles] = useState<FileList | null>(null);
  const [processando, setProcessando] = useState(false);
  const [message, setMessage] = useState('');
  const [ambienteChecked, setAmbienteChecked] = useState(false);
  const [showFallbackOption, setShowFallbackOption] = useState(false);

  // Solução 8: Análise de Ambiente ao montar componente
  useEffect(() => {
    const checkAmbiente = async () => {
      const ambiente = detectarBloqueadores();
      
      if (ambiente.temBloqueadores) {
        exibirAlertaBloqueadores(ambiente);
        toast.warning('Bloqueadores detectados. Recomendamos usar a página /importar');
      }
      
      const health = await healthCheckUpload();
      if (!health.ok) {
        toast.error(health.mensagem);
      }
      
      setAmbienteChecked(true);
    };
    
    checkAmbiente();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
    setMessage('');
    setShowFallbackOption(false);
  };

  // Solução 6: Código com mutation.mutate conforme documento
  const importMutation = trpc.dados.importar.useMutation({
    onSuccess: () => {
      toast.success('Dados importados com sucesso!');
      setLocation('/');
    },
    onError: (error) => {
      if (error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
        toast.error('Erro de bloqueio detectado. Tente usar a página /importar.');
        setLocation('/importar');
      } else {
        toast.error(`Erro: ${error.message}`);
      }
      setProcessando(false);
    }
  });

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
      
      // Solução 5: Salvar conteúdo temporário no localStorage para reuso
      localStorage.setItem('upload_backup', JSON.stringify(fileContents));
      console.log('[UPLOAD] Backup salvo no localStorage');

      // Checkpoint 3: Tentando enviar ao servidor
      console.log('[UPLOAD] Enviando dados ao servidor...');
      
      // Mapear arquivos para formato esperado pelo endpoint
      const dadosImportacao = {
        clientes: fileContents['CADASTRO_CLIENTES.csv'] || '',
        vendedores: fileContents['CADASTRO_VENDEDORES.csv'] || '',
        produtos: fileContents['RELACAO_PRODUTOS.csv'] || '',
        movimentacoes: fileContents['MOVIMENTO_DISTRIBUIDOR.csv'] || '',
        estoque: fileContents['ESTOQUE.csv'] || '',
      };

      // Solução 6: Usar mutation.mutate conforme documento
      importMutation.mutate(dadosImportacao);
      
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
        
        // Solução 5: Mostrar opção de fallback
        setShowFallbackOption(true);
        setMessage('❌ Upload bloqueado. Use a opção abaixo para continuar.');
      } else {
        setMessage(`❌ Erro: ${error.message}`);
      }
      
      setProcessando(false);
    }
  };

  // Solução 5: Função para ir para /importar com dados do localStorage
  const handleGoToImportar = () => {
    setLocation('/importar');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => setLocation('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Dashboard
        </Button>

        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <UploadIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Upload de Arquivos</h1>
            <p className="text-gray-600">Envie seus arquivos CSV ou Excel</p>
          </div>

          {/* Solução 5: Opção de fallback quando detectar erro */}
          {showFallbackOption && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 mb-1">
                    Tive erro no upload
                  </h3>
                  <p className="text-sm text-yellow-800 mb-3">
                    Seu navegador está bloqueando o upload. Use o método alternativo de copiar/colar.
                  </p>
                  <Button
                    onClick={handleGoToImportar}
                    variant="outline"
                    className="bg-white"
                  >
                    Ir para Copiar/Colar
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                multiple
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={processando}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex flex-col items-center"
              >
                <UploadIcon className="h-12 w-12 text-gray-400 mb-4" />
                <span className="text-lg font-medium text-gray-700 mb-2">
                  Clique para selecionar arquivos
                </span>
                <span className="text-sm text-gray-500">
                  ou arraste e solte aqui
                </span>
              </label>
            </div>

            {files && files.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Arquivos selecionados:</h3>
                <ul className="space-y-1">
                  {Array.from(files).map((file, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      • {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {message && (
              <div className={`p-4 rounded-lg ${
                message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {message}
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!files || files.length === 0 || processando}
              className="w-full"
              size="lg"
            >
              {processando ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <UploadIcon className="mr-2 h-5 w-5" />
                  Enviar Arquivos
                </>
              )}
            </Button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Instruções:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Prepare seus arquivos CSV ou Excel com os dados atualizados</li>
              <li>Certifique-se de que os arquivos seguem o formato esperado</li>
              <li>Clique em "Escolher Arquivos" e selecione todos os arquivos de uma vez</li>
              <li>Aguarde o processamento (isso pode levar alguns minutos)</li>
              <li>Você será automaticamente redirecionado para o dashboard</li>
            </ol>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Formatos aceitos: CSV, Excel (.xlsx, .xls)
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Arquivos esperados: CADASTRO_CLIENTES.csv, CADASTRO_VENDEDORES.csv, MOVIMENTO_DISTRIBUIDOR.csv, RELACAO_PRODUTOS.csv, ESTOQUE.csv
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
