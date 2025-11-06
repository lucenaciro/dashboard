import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Upload } from 'lucide-react';

export default function Importar() {
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);

  const [clientes, setClientes] = useState('');
  const [vendedores, setVendedores] = useState('');
  const [produtos, setProdutos] = useState('');
  const [movimentacoes, setMovimentacoes] = useState('');
  const [estoque, setEstoque] = useState('');

  const importarMutation = trpc.dados.importar.useMutation({
    onSuccess: (result: any) => {
      toast.success(`Importação concluída! ${result.totalProcessado} registros processados.`);
      navigate('/');
    },
    onError: (error: any) => {
      toast.error(`Erro na importação: ${error.message}`);
    },
  });

  const handleImportar = () => {
    if (!clientes && !vendedores && !produtos && !movimentacoes && !estoque) {
      toast.error('Cole pelo menos um tipo de dados para importar');
      return;
    }

    importarMutation.mutate({
      clientes,
      vendedores,
      produtos,
      movimentacoes,
      estoque,
    });
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
            <p className="text-muted-foreground">Cole os dados CSV nos campos abaixo</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Clientes */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">1. Clientes</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Formato esperado: CODIGO;NOME;CNPJ;CIDADE;ESTADO;TIPO
            </p>
            <Textarea
              value={clientes}
              onChange={(e) => setClientes(e.target.value)}
              placeholder="Cole aqui o conteúdo do arquivo CADASTRO_CLIENTES.csv"
              rows={5}
              className="font-mono text-sm"
            />
          </Card>

          {/* Vendedores */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">2. Vendedores</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Formato esperado: CODIGO;NOME
            </p>
            <Textarea
              value={vendedores}
              onChange={(e) => setVendedores(e.target.value)}
              placeholder="Cole aqui o conteúdo do arquivo CADASTRO_VENDEDORES.csv"
              rows={5}
              className="font-mono text-sm"
            />
          </Card>

          {/* Produtos */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">3. Produtos</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Formato esperado: CODIGO;DESCRICAO
            </p>
            <Textarea
              value={produtos}
              onChange={(e) => setProdutos(e.target.value)}
              placeholder="Cole aqui o conteúdo do arquivo RELACAO_PRODUTOS.csv"
              rows={5}
              className="font-mono text-sm"
            />
          </Card>

          {/* Movimentações */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">4. Movimentações</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Formato esperado: CODIGO_CLIENTE;CODIGO_VENDEDOR;CODIGO_PRODUTO;DATA_PEDIDO;QUANTIDADE;VALOR_TOTAL
            </p>
            <Textarea
              value={movimentacoes}
              onChange={(e) => setMovimentacoes(e.target.value)}
              placeholder="Cole aqui o conteúdo do arquivo MOVIMENTO_DISTRIBUIDOR.csv"
              rows={5}
              className="font-mono text-sm"
            />
          </Card>

          {/* Estoque */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">5. Estoque</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Formato esperado: CODIGO_PRODUTO;QUANTIDADE;DATA_ESTOQUE;DISTRIBUIDOR
            </p>
            <Textarea
              value={estoque}
              onChange={(e) => setEstoque(e.target.value)}
              placeholder="Cole aqui o conteúdo do arquivo ESTOQUE.csv"
              rows={5}
              className="font-mono text-sm"
            />
          </Card>

          {/* Botão de importar */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Pronto para importar?</h3>
                <p className="text-sm text-blue-700">
                  {importarMutation.isPending ? 'Processando...' : 'Clique no botão para iniciar a importação'}
                </p>
              </div>
              <Button 
                onClick={handleImportar} 
                disabled={importarMutation.isPending}
                size="lg"
              >
                <Upload className="w-4 h-4 mr-2" />
                {importarMutation.isPending ? 'Importando...' : 'Importar Dados'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
