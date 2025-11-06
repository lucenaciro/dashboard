import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Search, X, Filter, Download, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

function getStatusCliente(ultimaCompra: string | null): { label: string; variant: string; dias: number } {
  if (!ultimaCompra) return { label: 'Inativo', variant: 'secondary', dias: 999 };
  
  const hoje = new Date();
  const dataCompra = new Date(ultimaCompra);
  const diffDias = Math.floor((hoje.getTime() - dataCompra.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDias <= 30) return { label: 'Ativo', variant: 'success', dias: diffDias };
  if (diffDias <= 60) return { label: 'Moderado', variant: 'warning', dias: diffDias };
  if (diffDias <= 90) return { label: 'Em Risco', variant: 'danger', dias: diffDias };
  return { label: 'Inativo', variant: 'secondary', dias: diffDias };
}

function getTipoClienteLabel(tipo: string): string {
  const tipos: Record<string, string> = {
    'loja_propria': 'Loja Própria',
    'revendedor': 'Revendedor',
    'consumidor_final': 'Consumidor Final',
  };
  return tipos[tipo] || tipo;
}

export default function Clientes() {
  const [busca, setBusca] = useState("");
  const [tiposFiltro, setTiposFiltro] = useState<string[]>([]);
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null);

  const { data: clientes, isLoading } = trpc.clientes.list.useQuery({
    busca: busca || undefined,
    tiposCliente: tiposFiltro.length > 0 ? tiposFiltro : undefined,
  });

  const { data: historico, isLoading: historicoLoading } = trpc.clientes.historico.useQuery(
    { codigoCliente: clienteSelecionado! },
    { enabled: !!clienteSelecionado }
  );

  const clienteDetalhes = clientes?.find(c => c.codigoCliente === clienteSelecionado);

  // Filtrar por status
  const clientesFiltrados = clientes?.filter(cliente => {
    if (statusFiltro === "todos") return true;
    const status = getStatusCliente(cliente.ultimaCompra);
    return status.label.toLowerCase() === statusFiltro;
  });

  const toggleTipo = (tipo: string) => {
    setTiposFiltro(prev => 
      prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]
    );
  };

  const limparFiltros = () => {
    setBusca("");
    setTiposFiltro([]);
    setStatusFiltro("todos");
  };

  return (
    <div className="space-y-6">
      {/* Filtros Avançados */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros Avançados</CardTitle>
          <CardDescription>Busque e filtre clientes por múltiplos critérios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tipo de Cliente - Checkboxes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Cliente</label>
            <div className="flex flex-wrap gap-4">
              {[
                { value: 'loja_propria', label: 'Lojas Próprias' },
                { value: 'revendedor', label: 'Revendedores' },
                { value: 'consumidor_final', label: 'Consumidor Final' }
              ].map(tipo => (
                <div key={tipo.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={tipo.value}
                    checked={tiposFiltro.includes(tipo.value)}
                    onCheckedChange={() => toggleTipo(tipo.value)}
                  />
                  <label
                    htmlFor={tipo.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {tipo.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Status do Cliente */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="ativo">Ativo (até 30 dias)</SelectItem>
                <SelectItem value="moderado">Moderado (30-60 dias)</SelectItem>
                <SelectItem value="em risco">Em Risco (60-90 dias)</SelectItem>
                <SelectItem value="inativo">Inativo (+90 dias)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2">
            {(busca || tiposFiltro.length > 0 || statusFiltro !== "todos") && (
              <Button variant="outline" onClick={limparFiltros}>
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar Lista
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumo dos Filtros */}
      {clientesFiltrados && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Filtrado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatNumber(clientesFiltrados.length)}</p>
              <p className="text-xs text-muted-foreground">clientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(clientesFiltrados.reduce((acc, c) => acc + c.valorTotal, 0))}
              </p>
              <p className="text-xs text-muted-foreground">faturamento</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  clientesFiltrados.length > 0
                    ? clientesFiltrados.reduce((acc, c) => acc + c.valorTotal, 0) / clientesFiltrados.reduce((acc, c) => acc + c.totalVendas, 0)
                    : 0
                )}
              </p>
              <p className="text-xs text-muted-foreground">por venda</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatNumber(clientesFiltrados.filter(c => getStatusCliente(c.ultimaCompra).label === 'Ativo').length)}
              </p>
              <p className="text-xs text-muted-foreground">últimos 30 dias</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Clientes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista Completa de Clientes</CardTitle>
              <CardDescription>
                {clientesFiltrados?.length || 0} clientes encontrados
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Localização</th>
                    <th>Status</th>
                    <th className="text-right">Total Vendas</th>
                    <th className="text-right">Valor Total</th>
                    <th className="text-right">Ticket Médio</th>
                    <th>Última Compra</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados?.map((cliente) => {
                    const status = getStatusCliente(cliente.ultimaCompra);
                    const ticketMedio = cliente.totalVendas > 0 
                      ? cliente.valorTotal / cliente.totalVendas 
                      : 0;

                    return (
                      <tr
                        key={cliente.id}
                        onClick={() => setClienteSelecionado(cliente.codigoCliente)}
                      >
                        <td>
                          <div>
                            <p className="font-medium">{cliente.nome}</p>
                            <p className="text-xs text-muted-foreground">Cód: {cliente.codigoCliente}</p>
                          </div>
                        </td>
                        <td>
                          <Badge variant="outline" className="text-xs">
                            {getTipoClienteLabel(cliente.tipoCliente || '')}
                          </Badge>
                        </td>
                        <td>
                          <div className="text-sm">
                            <p>{cliente.municipio || '-'}</p>
                            <p className="text-xs text-muted-foreground">{cliente.estado || '-'}</p>
                          </div>
                        </td>
                        <td>
                          <Badge className={`badge-${status.variant}`}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="text-right font-medium">{formatNumber(cliente.totalVendas)}</td>
                        <td className="text-right font-medium">{formatCurrency(cliente.valorTotal)}</td>
                        <td className="text-right">{formatCurrency(ticketMedio)}</td>
                        <td>
                          <div>
                            <p className="text-sm">{formatDate(cliente.ultimaCompra)}</p>
                            {status.dias < 999 && (
                              <p className="text-xs text-muted-foreground">há {status.dias} dias</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet de Detalhes do Cliente (Drill-down) */}
      <Sheet open={!!clienteSelecionado} onOpenChange={(open) => !open && setClienteSelecionado(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl">{clienteDetalhes?.nome}</SheetTitle>
            <SheetDescription className="text-base">
              Código: {clienteDetalhes?.codigoCliente} • {getTipoClienteLabel(clienteDetalhes?.tipoCliente || '')}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Status e Alerta */}
            {clienteDetalhes && (() => {
              const status = getStatusCliente(clienteDetalhes.ultimaCompra);
              return (
                <Card className={`border-l-4 ${
                  status.variant === 'success' ? 'border-l-green-500' :
                  status.variant === 'warning' ? 'border-l-yellow-500' :
                  status.variant === 'danger' ? 'border-l-orange-500' :
                  'border-l-gray-500'
                }`}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      {status.variant === 'danger' || status.variant === 'secondary' ? (
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                      ) : null}
                      <CardTitle>Status: {status.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {status.label === 'Inativo' && 'Cliente não compra há mais de 90 dias. Recomenda-se contato imediato para reativação.'}
                      {status.label === 'Em Risco' && 'Última compra entre 60-90 dias. Agendar visita ou oferta especial.'}
                      {status.label === 'Moderado' && 'Última compra entre 30-60 dias. Manter contato regular.'}
                      {status.label === 'Ativo' && 'Cliente ativo nos últimos 30 dias. Manter relacionamento e oferecer produtos complementares.'}
                    </p>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Métricas do Cliente */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{formatNumber(clienteDetalhes?.totalVendas || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">transações realizadas</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{formatCurrency(clienteDetalhes?.valorTotal || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">faturamento gerado</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {formatCurrency(
                      clienteDetalhes?.totalVendas && clienteDetalhes.totalVendas > 0
                        ? clienteDetalhes.valorTotal / clienteDetalhes.totalVendas
                        : 0
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">valor médio por compra</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Última Compra</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatDate(clienteDetalhes?.ultimaCompra ?? null)}</p>
                  {clienteDetalhes && (() => {
                    const status = getStatusCliente(clienteDetalhes.ultimaCompra);
                    return status.dias < 999 ? (
                      <p className="text-xs text-muted-foreground mt-1">há {status.dias} dias</p>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Histórico de Compras */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Compras</CardTitle>
                <CardDescription>Últimas 100 transações do cliente</CardDescription>
              </CardHeader>
              <CardContent>
                {historicoLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : historico && historico.length > 0 ? (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {historico.map((compra) => (
                      <div key={compra.id} className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 space-y-1">
                          <p className="font-medium">{compra.nomeProduto}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>📅 {formatDate(compra.data ? new Date(compra.data).toISOString().split('T')[0] : null)}</span>
                            <span>📦 Qtd: {compra.quantidade}</span>
                            <span>📄 NF: {compra.numeroNota}</span>
                            {compra.nomeVendedor && <span>👤 {compra.nomeVendedor}</span>}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-lg font-bold">{formatCurrency(compra.valorTotal)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(compra.valorTotal / compra.quantidade)}/un
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Nenhuma compra registrada</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ações Comerciais Sugeridas */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Comerciais Sugeridas</CardTitle>
                <CardDescription>Recomendações baseadas no comportamento do cliente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clienteDetalhes && (() => {
                    const status = getStatusCliente(clienteDetalhes.ultimaCompra);
                    const acoes = [];
                    
                    if (status.label === 'Inativo') {
                      acoes.push({
                        titulo: '🚨 Reativação Urgente',
                        descricao: 'Cliente inativo há mais de 90 dias. Prioridade máxima para contato.',
                        cor: 'red'
                      });
                      acoes.push({
                        titulo: '📞 Contato Imediato',
                        descricao: 'Ligar para entender motivo da inatividade e oferecer condições especiais.',
                        cor: 'orange'
                      });
                    } else if (status.label === 'Em Risco') {
                      acoes.push({
                        titulo: '⚡ Atenção Necessária',
                        descricao: 'Cliente em risco de inativação. Agendar visita comercial.',
                        cor: 'orange'
                      });
                      acoes.push({
                        titulo: '🎁 Oferta Especial',
                        descricao: 'Enviar proposta com desconto ou condição diferenciada.',
                        cor: 'yellow'
                      });
                    } else if (status.label === 'Moderado') {
                      acoes.push({
                        titulo: '📅 Acompanhamento Regular',
                        descricao: 'Manter contato periódico e verificar necessidades.',
                        cor: 'yellow'
                      });
                    } else if (status.label === 'Ativo') {
                      acoes.push({
                        titulo: '✅ Manter Relacionamento',
                        descricao: 'Cliente ativo. Oferecer produtos complementares e novidades.',
                        cor: 'green'
                      });
                      acoes.push({
                        titulo: '📈 Oportunidade de Upsell',
                        descricao: 'Apresentar linhas premium ou produtos de maior valor agregado.',
                        cor: 'blue'
                      });
                    }

                    return acoes.map((acao, index) => (
                      <div key={index} className={`p-4 bg-${acao.cor}-50 dark:bg-${acao.cor}-900/20 border border-${acao.cor}-200 dark:border-${acao.cor}-800 rounded-lg`}>
                        <p className={`font-semibold text-${acao.cor}-900 dark:text-${acao.cor}-200`}>{acao.titulo}</p>
                        <p className={`text-sm text-${acao.cor}-700 dark:text-${acao.cor}-300 mt-1`}>{acao.descricao}</p>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
