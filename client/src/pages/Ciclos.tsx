import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Calendar, CheckCircle, XCircle } from 'lucide-react';

export default function Ciclos() {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  const { data: ciclos, refetch } = trpc.ciclos.listar.useQuery();
  const criarMutation = trpc.ciclos.criar.useMutation({
    onSuccess: () => {
      toast.success('Ciclo criado com sucesso!');
      setDialogAberto(false);
      setNome('');
      setDescricao('');
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar ciclo: ${error.message}`);
    },
  });

  const handleCriar = () => {
    if (!nome.trim()) {
      toast.error('Nome do ciclo é obrigatório');
      return;
    }

    criarMutation.mutate({
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
    });
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Ciclos de Importação</h1>
          <p className="text-muted-foreground">Gerencie versões e histórico de importações</p>
        </div>

        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Ciclo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Ciclo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Nome do Ciclo</label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Importação Janeiro 2024"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Detalhes sobre esta importação..."
                  rows={3}
                />
              </div>
              <Button onClick={handleCriar} className="w-full" disabled={criarMutation.isPending}>
                {criarMutation.isPending ? 'Criando...' : 'Criar Ciclo'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de ciclos */}
      <div className="grid gap-4">
        {ciclos?.map((ciclo: any) => (
          <Card key={ciclo.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{ciclo.nome}</h3>
                  {ciclo.status === 'ativo' ? (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      Ativo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <XCircle className="w-4 h-4" />
                      Inativo
                    </span>
                  )}
                </div>
                {ciclo.descricao && (
                  <p className="text-muted-foreground mb-3">{ciclo.descricao}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Criado em {new Date(ciclo.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Ver Detalhes
                </Button>
                <Button variant="outline" size="sm">
                  Logs
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {!ciclos || ciclos.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhum ciclo criado ainda</p>
            <Button onClick={() => setDialogAberto(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Ciclo
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
