import { useState, useEffect, useRef } from 'react';
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
  const [isDragging, setIsDragging] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
    setMessage('');
    setShowFallbackOption(false);
  };

  // Função centralizada de tratamento de erros
  const handleMutationError = (error: any) => {
    const isBloqueado = 
      error?.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('NetworkError') ||
      error?.message?.includes('blocked') ||
      error?.name === 'AbortError';
    
    if (isBloqueado) {
      console.warn('[UPLOAD] Erro de bloqueio detectado');
      toast.error('Erro de bloqueio detectado. Tente usar /importar');
      setShowFallbackOption(true);
      setMessage('❌ Upload bloqueado. Use a opção abaixo.');
    } else {
      const errorMsg = error?.message || 'Erro desconhecido';
      toast.error(`Erro: ${errorMsg}`);
      setMessage(`❌ Erro: ${errorMsg}`);
    }
  };

  // Solução 6: Código com mutation.mutate conforme documento
  const importMutation = trpc.dados.importar.useMutation({
    onSuccess: () => {
      // Limpar timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      console.log('[UPLOAD] Sucesso! Dados importados');
      setProcessando(false);
      toast.success('Dados importados com sucesso!');
      
      // Pequeno delay antes de redirecionar
      setTimeout(() => {
        setLocation('/');
      }, 100);
    },
    onError: (error) => {
      // Limpar timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      console.error('[UPLOAD] Erro na mutation:', error);
      setProcessando(false);
      handleMutationError(error);
    }
  });

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setMessage('❌ Selecione pelo menos um arquivo');
      return;
    }

    setMessage("Lendo arquivos...");
    setProcessando(true);

    try {
      // Checkpoint 1: Início do processo
      console.log('[UPLOAD] Iniciando upload de', files.length, 'arquivo(s)');
      
      // Ler conteúdo dos arquivos em paralelo (Promise.all)
      setMessage("Lendo arquivos...");
      
      const filePromises = Array.from(files).map(async (file, i) => {
        console.log(`[UPLOAD] Lendo arquivo ${i + 1}/${files.length}:`, file.name);
        try {
          const content = await file.text();
          return { name: file.name, content };
        } catch (error) {
          console.error(`[UPLOAD] Erro ao ler ${file.name}:`, error);
          throw error;
        }
      });

      const fileResults = await Promise.all(filePromises);

      const fileContents: { [key: string]: string } = {};
      fileResults.forEach(result => {
        fileContents[result.name] = result.content;
      });

      // Checkpoint 2: Arquivos lidos
      console.log('[UPLOAD] Todos os arquivos lidos com sucesso');
      
      // Solução 5: Salvar conteúdo temporário no localStorage para reuso
      localStorage.setItem('upload_backup', JSON.stringify(fileContents));
      console.log('[UPLOAD] Backup salvo no localStorage');

      // Checkpoint 3: Tentando enviar ao servidor
      setMessage("Enviando ao servidor...");
      console.log('[UPLOAD] Enviando dados ao servidor...');
      
      // Mapear arquivos para formato esperado pelo endpoint
      const dadosImportacao = {
        clientes: fileContents['CADASTRO_CLIENTES.csv'] || '',
        vendedores: fileContents['CADASTRO_VENDEDORES.csv'] || '',
        produtos: fileContents['RELACAO_PRODUTOS.csv'] || '',
        movimentacoes: fileContents['MOVIMENTO_DISTRIBUIDOR.csv'] || '',
        estoque: fileContents['ESTOQUE.csv'] || '',
      };

      // CORREÇÃO CRÍTICA: Timeout de segurança de 60 segundos
      timeoutRef.current = setTimeout(() => {
        console.warn('[UPLOAD] ⏱️ TIMEOUT! Resposta não recebida em 60s');
        setProcessando(false);
        toast.error('Timeout: servidor não respondeu em 60s. Tente usar /importar');
        setShowFallbackOption(true);
        setMessage('❌ Timeout: servidor não respondeu. Use /importar');
      }, 60000); // 60 segundos

      console.log('[UPLOAD] Timeout de segurança configurado (60s)');

      // Solução 6: Usar mutation.mutate conforme documento
      importMutation.mutate(dadosImportacao);
      
    } catch (error: any) {
      console.error('[UPLOAD] Erro capturado:', error);
      
      // Limpar timeout se houver
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      handleMutationError(error);
      setProcessando(false);
    }
  };

  // Solução 5: Função para ir para /importar com dados do localStorage
  const handleGoToImportar = () => {
    setLocation('/importar');
  };

  // Handlers para drag & drop (compatível com todos os navegadores)
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Necessário para IE/Edge
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Necessário para Chrome/Safari/Firefox
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Verificar se realmente saiu da área (não apenas de um filho)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // Compatibilidade cross-browser para acessar arquivos
    let droppedFiles: FileList | null = null;
    
    if (e.dataTransfer) {
      droppedFiles = e.dataTransfer.files;
    }
    
    // Fallback para navegadores antigos
    if (!droppedFiles && (e as any).originalEvent?.dataTransfer) {
      droppedFiles = (e as any).originalEvent.dataTransfer.files;
    }

    if (droppedFiles && droppedFiles.length > 0) {
      setFiles(droppedFiles);
      setMessage('');
      setShowFallbackOption(false);
      console.log('[UPLOAD] Arquivos arrastados:', droppedFiles.length);
      
      // Listar arquivos no console para debug
      Array.from(droppedFiles).forEach((file, i) => {
        console.log(`  ${i + 1}. ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
      });
    } else {
      console.warn('[UPLOAD] Nenhum arquivo detectado no drop');
      setMessage('❌ Nenhum arquivo detectado. Tente clicar para selecionar.');
    }
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
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50 scale-105' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
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
              <li><strong>Clique na área tracejada acima</strong> para selecionar arquivos (recomendado)</li>
              <li>Ou arraste e solte os arquivos diretamente na área tracejada</li>
              <li>Aguarde o processamento (isso pode levar alguns minutos)</li>
              <li>Você será automaticamente redirecionado para o dashboard</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">Dica para Todos os Navegadores</h4>
                <p className="text-sm text-amber-800">
                  <strong>Método recomendado:</strong> Clique na área tracejada acima para selecionar arquivos.
                  <br />
                  <strong>Drag & Drop:</strong> Se ao arrastar arquivos o navegador mostrar um diálogo, 
                  clique em <strong>Cancelar</strong> e use o método de clicar.
                  <br />
                  <strong>Alternativa:</strong> Use a página de <strong>Copiar/Colar</strong> (/importar) se tiver problemas.
                </p>
              </div>
            </div>
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
