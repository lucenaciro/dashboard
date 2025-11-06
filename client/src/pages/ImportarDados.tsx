import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';

export default function ImportarDados() {
  const [, setLocation] = useLocation();
  const [clientesCSV, setClientesCSV] = useState('');
  const [vendedoresCSV, setVendedoresCSV] = useState('');
  const [produtosCSV, setProdutosCSV] = useState('');
  const [movimentacoesCSV, setMovimentacoesCSV] = useState('');
  const [estoqueCSV, setEstoqueCSV] = useState('');
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const importarMutation = trpc.dados.importar.useMutation({
    onSuccess: (resultado) => {
      setMensagem(`✅ ${resultado.totalProcessado} registros importados com sucesso!`);
      setProcessando(false);
      setTimeout(() => setLocation('/'), 2000);
    },
    onError: (error) => {
      setMensagem(`❌ Erro: ${error.message}`);
      setProcessando(false);
    },
  });

  const handleImportar = () => {
    setProcessando(true);
    setMensagem('Processando dados...');
    
    importarMutation.mutate({
      clientes: clientesCSV,
      vendedores: vendedoresCSV,
      produtos: produtosCSV,
      movimentacoes: movimentacoesCSV,
      estoque: estoqueCSV,
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="outline"
          onClick={() => setLocation('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Dashboard
        </Button>

        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Upload className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Importar Dados</h1>
              <p className="text-muted-foreground">
                Cole os dados CSV abaixo (separados por ponto e vírgula)
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block font-semibold mb-2">
                Clientes (CADASTRO_CLIENTES.csv)
              </label>
              <Textarea
                value={clientesCSV}
                onChange={(e) => setClientesCSV(e.target.value)}
                placeholder="Cole aqui os dados do arquivo CADASTRO_CLIENTES.csv..."
                className="h-32 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Vendedores (CADASTRO_VENDEDORES.csv)
              </label>
              <Textarea
                value={vendedoresCSV}
                onChange={(e) => setVendedoresCSV(e.target.value)}
                placeholder="Cole aqui os dados do arquivo CADASTRO_VENDEDORES.csv..."
                className="h-32 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Produtos (RELACAO_PRODUTOS.csv)
              </label>
              <Textarea
                value={produtosCSV}
                onChange={(e) => setProdutosCSV(e.target.value)}
                placeholder="Cole aqui os dados do arquivo RELACAO_PRODUTOS.csv..."
                className="h-32 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Movimentações (MOVIMENTO_DISTRIBUIDOR.csv)
              </label>
              <Textarea
                value={movimentacoesCSV}
                onChange={(e) => setMovimentacoesCSV(e.target.value)}
                placeholder="Cole aqui os dados do arquivo MOVIMENTO_DISTRIBUIDOR.csv..."
                className="h-32 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Estoque (ESTOQUE.csv)
              </label>
              <Textarea
                value={estoqueCSV}
                onChange={(e) => setEstoqueCSV(e.target.value)}
                placeholder="Cole aqui os dados do arquivo ESTOQUE.csv..."
                className="h-32 font-mono text-sm"
              />
            </div>

            {mensagem && (
              <div className={`p-4 rounded-lg ${
                mensagem.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {mensagem}
              </div>
            )}

            <Button
              onClick={handleImportar}
              disabled={processando || !clientesCSV}
              className="w-full"
              size="lg"
            >
              {processando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Dados
                </>
              )}
            </Button>
          </div>

          <div className="mt-8 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Instruções:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Abra cada arquivo CSV no Excel ou editor de texto</li>
              <li>Selecione TODO o conteúdo (Ctrl+A) e copie (Ctrl+C)</li>
              <li>Cole nos campos correspondentes acima</li>
              <li>Clique em "Importar Dados"</li>
              <li>Aguarde o processamento (pode levar alguns minutos)</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
}
