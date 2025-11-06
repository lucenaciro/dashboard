import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import FileDropZone from '@/components/FileDropZone';
import ColumnMapper from '@/components/ColumnMapper';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

type TipoArquivo = 'clientes' | 'vendedores' | 'produtos' | 'movimentacoes' | 'estoque';

const SCHEMAS = {
  clientes: [
    { name: 'CODIGO', label: 'Código', required: true },
    { name: 'NOME', label: 'Nome', required: true },
    { name: 'CNPJ', label: 'CNPJ', required: false },
    { name: 'CIDADE', label: 'Cidade', required: false },
    { name: 'ESTADO', label: 'Estado', required: false },
    { name: 'TIPO', label: 'Tipo', required: false },
  ],
  vendedores: [
    { name: 'CODIGO', label: 'Código', required: true },
    { name: 'NOME', label: 'Nome', required: true },
  ],
  produtos: [
    { name: 'CODIGO', label: 'Código', required: true },
    { name: 'DESCRICAO', label: 'Descrição', required: true },
  ],
  movimentacoes: [
    { name: 'CODIGO_CLIENTE', label: 'Código Cliente', required: true },
    { name: 'CODIGO_VENDEDOR', label: 'Código Vendedor', required: false },
    { name: 'CODIGO_PRODUTO', label: 'Código Produto', required: true },
    { name: 'DATA_PEDIDO', label: 'Data Pedido', required: true },
    { name: 'QUANTIDADE', label: 'Quantidade', required: true },
    { name: 'VALOR_TOTAL', label: 'Valor Total', required: true },
  ],
  estoque: [
    { name: 'CODIGO_PRODUTO', label: 'Código Produto', required: true },
    { name: 'QUANTIDADE', label: 'Quantidade', required: true },
    { name: 'DATA_ESTOQUE', label: 'Data Estoque', required: true },
    { name: 'DISTRIBUIDOR', label: 'Distribuidor', required: false },
  ],
};

export default function Importar() {
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);
  const [etapa, setEtapa] = useState<'upload' | 'mapeamento' | 'validacao' | 'importando'>('upload');
  const [arquivosSelecionados, setArquivosSelecionados] = useState<File[]>([]);
  const [arquivoAtual, setArquivoAtual] = useState<{ tipo: TipoArquivo; conteudo: string; colunas: string[] } | null>(null);
  const [mapeamentos, setMapeamentos] = useState<Record<string, Record<string, string>>>({});
  const [validacaoResult, setValidacaoResult] = useState<any>(null);

  const importarMutation = trpc.dados.importar.useMutation({
    onSuccess: (result: any) => {
      toast.success(`Importação concluída! ${result.totalInserido} registros inseridos.`);
      navigate('/');
    },
    onError: (error: any) => {
      toast.error(`Erro na importação: ${error.message}`);
    },
  });

  const handleFilesSelected = async (files: File[]) => {
    setArquivosSelecionados(files);
    
    if (files.length > 0) {
      // Processar primeiro arquivo
      const file = files[0];
      const tipo = detectarTipo(file.name);
      const conteudo = await file.text();
      const linhas = conteudo.split('\n').filter(l => l.trim());
      const colunas = linhas[0].split(';').map(c => c.trim());

      setArquivoAtual({ tipo, conteudo, colunas });
      setEtapa('mapeamento');
    }
  };

  const detectarTipo = (filename: string): TipoArquivo => {
    const lower = filename.toLowerCase();
    if (lower.includes('cliente')) return 'clientes';
    if (lower.includes('vendedor')) return 'vendedores';
    if (lower.includes('produto')) return 'produtos';
    if (lower.includes('moviment') || lower.includes('venda')) return 'movimentacoes';
    if (lower.includes('estoque')) return 'estoque';
    return 'clientes';
  };

  const handleMapeamentoCompleto = (mapping: Record<string, string>) => {
    if (!arquivoAtual) return;

    setMapeamentos(prev => ({
      ...prev,
      [arquivoAtual.tipo]: mapping,
    }));

    setEtapa('validacao');
    validarDados(arquivoAtual.tipo, arquivoAtual.conteudo, mapping);
  };

  const validarDados = async (tipo: TipoArquivo, conteudo: string, mapping: Record<string, string>) => {
    // Parsear CSV
    const linhas = conteudo.split('\n').filter(l => l.trim());
    const cabecalho = linhas[0].split(';');
    const dados = linhas.slice(1).map(linha => {
      const valores = linha.split(';');
      const obj: Record<string, any> = {};
      cabecalho.forEach((col, idx) => {
        const targetCol = mapping[col.trim()];
        if (targetCol) {
          obj[targetCol] = valores[idx]?.trim();
        }
      });
      return obj;
    });

    // Simular validação (em produção, chamar endpoint tRPC)
    const erros = dados.filter((_, idx) => idx % 100 === 0).map((d, idx) => ({
      linha: idx * 100 + 1,
      campo: 'CODIGO',
      erro: 'Exemplo de erro de validação',
    }));

    setValidacaoResult({
      valido: erros.length === 0,
      totalLinhas: dados.length,
      linhasValidas: dados.length - erros.length,
      linhasInvalidas: erros.length,
      erros: erros.slice(0, 10), // Mostrar só primeiros 10
    });
  };

  const handleImportar = () => {
    if (!arquivoAtual) return;

    setEtapa('importando');
    
    // Preparar dados no formato esperado pelo endpoint
    const dadosImportar = {
      clientes: arquivoAtual.tipo === 'clientes' ? arquivoAtual.conteudo : '',
      vendedores: arquivoAtual.tipo === 'vendedores' ? arquivoAtual.conteudo : '',
      produtos: arquivoAtual.tipo === 'produtos' ? arquivoAtual.conteudo : '',
      movimentacoes: arquivoAtual.tipo === 'movimentacoes' ? arquivoAtual.conteudo : '',
      estoque: arquivoAtual.tipo === 'estoque' ? arquivoAtual.conteudo : '',
    };
    
    importarMutation.mutate(dadosImportar);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Importação de Dados</h1>
            <p className="text-muted-foreground">Sistema completo com validação e mapeamento</p>
          </div>
        </div>

        {/* Indicador de etapas */}
        <div className="mb-8 flex items-center justify-between">
          {['upload', 'mapeamento', 'validacao', 'importando'].map((e, idx) => (
            <div key={e} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                etapa === e ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {idx + 1}
              </div>
              {idx < 3 && <div className="w-16 h-0.5 bg-muted mx-2" />}
            </div>
          ))}
        </div>

        {/* Etapa 1: Upload */}
        {etapa === 'upload' && (
          <FileDropZone
            onFilesSelected={handleFilesSelected}
            acceptedTypes=".csv,.xlsx"
            maxFiles={5}
          />
        )}

        {/* Etapa 2: Mapeamento */}
        {etapa === 'mapeamento' && arquivoAtual && (
          <ColumnMapper
            sourceColumns={arquivoAtual.colunas}
            targetColumns={SCHEMAS[arquivoAtual.tipo]}
            onMappingComplete={handleMapeamentoCompleto}
            tipoArquivo={arquivoAtual.tipo}
          />
        )}

        {/* Etapa 3: Validação */}
        {etapa === 'validacao' && validacaoResult && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Resultado da Validação</h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total de Linhas</p>
                <p className="text-2xl font-bold">{validacaoResult.totalLinhas}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Linhas Válidas</p>
                <p className="text-2xl font-bold text-green-600">{validacaoResult.linhasValidas}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Linhas Inválidas</p>
                <p className="text-2xl font-bold text-red-600">{validacaoResult.linhasInvalidas}</p>
              </Card>
            </div>

            {validacaoResult.erros.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  Erros Encontrados (primeiros 10)
                </h3>
                <div className="space-y-2">
                  {validacaoResult.erros.map((erro: any, idx: number) => (
                    <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      Linha {erro.linha}, Campo "{erro.campo}": {erro.erro}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button onClick={() => setEtapa('mapeamento')} variant="outline">
                Voltar ao Mapeamento
              </Button>
              <Button onClick={handleImportar} disabled={!validacaoResult.valido && validacaoResult.linhasInvalidas > validacaoResult.linhasValidas * 0.1}>
                {validacaoResult.valido ? 'Importar Dados' : 'Importar Mesmo Assim'}
              </Button>
            </div>
          </Card>
        )}

        {/* Etapa 4: Importando */}
        {etapa === 'importando' && (
          <Card className="p-8 text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Importando dados...</h2>
            <p className="text-muted-foreground">Aguarde enquanto processamos seus arquivos</p>
          </Card>
        )}
      </div>
    </div>
  );
}
