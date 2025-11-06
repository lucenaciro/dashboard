import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Download, TrendingUp, TrendingDown, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num);
}

export default function Vendedores() {
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string | null>(null);

  const { data: vendedores, isLoading } = trpc.vendedores.list.useQuery();

  const vendedorDetalhes = vendedores?.find(v => v.codigoVendedor === vendedorSelecionado);

  // Calcular estatísticas gerais
  const totalVendas = vendedores?.reduce((acc, v) => acc + v.totalVendas, 0) || 0;
  const totalValor = vendedores?.reduce((acc, v) => acc + v.valorTotal, 0) || 0;
  const mediaVendasPorVendedor = vendedores && vendedores.length > 0 ? totalVendas / vendedores.length : 0;
  const mediaValorPorVendedor = vendedores && vendedores.length > 0 ? totalValor / vendedores.length : 0;

  // Ranking
  const vendedoresOrdenados = vendedores ? [...vendedores].sort((a, b) => b.valorTotal - a.valorTotal) : [];

  return (
    <div className="space-y-6">
      {/* KPIs Gerais */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatNumber(vendedores?.length || 0)}</p>
            <p className="text-xs text-muted-foreground">equipe de vendas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatNumber(totalVendas)}</p>
            <p className="text-xs text-muted-foreground">transações realizadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalValor)}</p>
            <p className="text-xs text-muted-foreground">valor total gerado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Média por Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(mediaValorPorVendedor)}</p>
            <p className="text-xs text-muted-foreground">{formatNumber(Math.round(mediaVendasPorVendedor))} vendas/vendedor</p>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Vendedores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ranking de Vendedores</CardTitle>
              <CardDescription>Top 10 por faturamento</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
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
            <div className="space-y-3">
              {vendedoresOrdenados.slice(0, 10).map((vendedor, index) => {
                const desempenho = mediaValorPorVendedor > 0 
                  ? ((vendedor.valorTotal - mediaValorPorVendedor) / mediaValorPorVendedor) * 100 
                  : 0;
                const ticketMedio = vendedor.totalVendas > 0 ? vendedor.valorTotal / vendedor.totalVendas : 0;

                return (
                  <div
                    key={vendedor.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setVendedorSelecionado(vendedor.codigoVendedor)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-lg ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{vendedor.nome}</p>
                          {index < 3 && <Award className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span>📊 {formatNumber(vendedor.totalVendas)} vendas</span>
                          <span>👥 {formatNumber(vendedor.clientesAtivos)} clientes</span>
                          <span>💰 Ticket: {formatCurrency(ticketMedio)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{formatCurrency(vendedor.valorTotal)}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        {desempenho >= 0 ? (
                          <>
                            <TrendingUp className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-600">+{desempenho.toFixed(1)}%</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-3 w-3 text-red-600" />
                            <span className="text-xs text-red-600">{desempenho.toFixed(1)}%</span>
                          </>
                        )}
                        <span className="text-xs text-muted-foreground ml-1">vs média</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista Completa de Vendedores */}
      <Card>
        <CardHeader>
          <CardTitle>Lista Completa de Vendedores</CardTitle>
          <CardDescription>Todos os vendedores ordenados alfabeticamente</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vendedor</th>
                    <th>Status</th>
                    <th className="text-right">Total Vendas</th>
                    <th className="text-right">Clientes Ativos</th>
                    <th className="text-right">Valor Total</th>
                    <th className="text-right">Ticket Médio</th>
                    <th className="text-right">Desempenho</th>
                  </tr>
                </thead>
                <tbody>
                  {vendedores?.map((vendedor) => {
                    const desempenho = mediaValorPorVendedor > 0 
                      ? ((vendedor.valorTotal - mediaValorPorVendedor) / mediaValorPorVendedor) * 100 
                      : 0;
                    const ticketMedio = vendedor.totalVendas > 0 ? vendedor.valorTotal / vendedor.totalVendas : 0;

                    return (
                      <tr
                        key={vendedor.id}
                        onClick={() => setVendedorSelecionado(vendedor.codigoVendedor)}
                      >
                        <td>
                          <div>
                            <p className="font-medium">{vendedor.nome}</p>
                            <p className="text-xs text-muted-foreground">Cód: {vendedor.codigoVendedor}</p>
                          </div>
                        </td>
                        <td>
                          <Badge className={vendedor.ativo ? 'badge-success' : 'badge-secondary'}>
                            {vendedor.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="text-right font-medium">{formatNumber(vendedor.totalVendas)}</td>
                        <td className="text-right">{formatNumber(vendedor.clientesAtivos)}</td>
                        <td className="text-right font-medium">{formatCurrency(vendedor.valorTotal)}</td>
                        <td className="text-right">{formatCurrency(ticketMedio)}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {desempenho >= 0 ? (
                              <>
                                <TrendingUp className="h-3 w-3 text-green-600" />
                                <span className="text-sm text-green-600 font-medium">+{desempenho.toFixed(1)}%</span>
                              </>
                            ) : (
                              <>
                                <TrendingDown className="h-3 w-3 text-red-600" />
                                <span className="text-sm text-red-600 font-medium">{desempenho.toFixed(1)}%</span>
                              </>
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

      {/* Sheet de Detalhes do Vendedor */}
      <Sheet open={!!vendedorSelecionado} onOpenChange={(open) => !open && setVendedorSelecionado(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl">{vendedorDetalhes?.nome}</SheetTitle>
            <SheetDescription className="text-base">
              Código: {vendedorDetalhes?.codigoVendedor} • 
              <Badge className={vendedorDetalhes?.ativo ? 'badge-success ml-2' : 'badge-secondary ml-2'}>
                {vendedorDetalhes?.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Métricas do Vendedor */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{formatNumber(vendedorDetalhes?.totalVendas || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">transações realizadas</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{formatCurrency(vendedorDetalhes?.valorTotal || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">valor gerado</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{formatNumber(vendedorDetalhes?.clientesAtivos || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">carteira ativa</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {formatCurrency(
                      vendedorDetalhes?.totalVendas && vendedorDetalhes.totalVendas > 0
                        ? vendedorDetalhes.valorTotal / vendedorDetalhes.totalVendas
                        : 0
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">valor médio por venda</p>
                </CardContent>
              </Card>
            </div>

            {/* Análise de Desempenho */}
            <Card>
              <CardHeader>
                <CardTitle>Análise de Desempenho</CardTitle>
                <CardDescription>Comparativo com a média da equipe</CardDescription>
              </CardHeader>
              <CardContent>
                {vendedorDetalhes && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Desempenho vs Média</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Média da equipe: {formatCurrency(mediaValorPorVendedor)}
                        </p>
                      </div>
                      <div className="text-right">
                        {(() => {
                          const desempenho = mediaValorPorVendedor > 0 
                            ? ((vendedorDetalhes.valorTotal - mediaValorPorVendedor) / mediaValorPorVendedor) * 100 
                            : 0;
                          return desempenho >= 0 ? (
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-5 w-5 text-green-600" />
                              <span className="text-2xl font-bold text-green-600">+{desempenho.toFixed(1)}%</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-5 w-5 text-red-600" />
                              <span className="text-2xl font-bold text-red-600">{desempenho.toFixed(1)}%</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Vendas vs Média</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                          {mediaVendasPorVendedor > 0 
                            ? ((vendedorDetalhes.totalVendas / mediaVendasPorVendedor) * 100).toFixed(0) 
                            : 0}%
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="text-sm font-medium text-purple-900 dark:text-purple-200">Clientes vs Média</p>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                          {vendedores && vendedores.length > 0
                            ? ((vendedorDetalhes.clientesAtivos / (vendedores.reduce((acc, v) => acc + v.clientesAtivos, 0) / vendedores.length)) * 100).toFixed(0)
                            : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ações e Recomendações */}
            <Card>
              <CardHeader>
                <CardTitle>Ações e Recomendações</CardTitle>
                <CardDescription>Plano de ação baseado no desempenho</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vendedorDetalhes && (() => {
                    const desempenho = mediaValorPorVendedor > 0 
                      ? ((vendedorDetalhes.valorTotal - mediaValorPorVendedor) / mediaValorPorVendedor) * 100 
                      : 0;
                    const acoes = [];

                    if (desempenho >= 20) {
                      acoes.push({
                        titulo: '🏆 Excelente Desempenho',
                        descricao: 'Vendedor acima da média. Reconhecer e usar como exemplo para a equipe.',
                        cor: 'green'
                      });
                      acoes.push({
                        titulo: '📈 Oportunidade de Liderança',
                        descricao: 'Considerar para mentoria de outros vendedores ou projetos especiais.',
                        cor: 'blue'
                      });
                    } else if (desempenho >= 0) {
                      acoes.push({
                        titulo: '✅ Desempenho Adequado',
                        descricao: 'Vendedor dentro da média. Manter acompanhamento regular.',
                        cor: 'green'
                      });
                      acoes.push({
                        titulo: '🎯 Potencial de Crescimento',
                        descricao: 'Identificar oportunidades para aumentar ticket médio e carteira de clientes.',
                        cor: 'blue'
                      });
                    } else if (desempenho >= -20) {
                      acoes.push({
                        titulo: '⚠️ Atenção Necessária',
                        descricao: 'Vendedor abaixo da média. Agendar reunião de acompanhamento.',
                        cor: 'yellow'
                      });
                      acoes.push({
                        titulo: '📚 Treinamento',
                        descricao: 'Oferecer capacitação em técnicas de vendas e gestão de carteira.',
                        cor: 'orange'
                      });
                    } else {
                      acoes.push({
                        titulo: '🚨 Ação Urgente',
                        descricao: 'Desempenho crítico. Reunião imediata para entender dificuldades.',
                        cor: 'red'
                      });
                      acoes.push({
                        titulo: '🔄 Plano de Melhoria',
                        descricao: 'Criar plano de ação com metas claras e acompanhamento semanal.',
                        cor: 'orange'
                      });
                    }

                    if (vendedorDetalhes.clientesAtivos < 10) {
                      acoes.push({
                        titulo: '👥 Expandir Carteira',
                        descricao: 'Carteira pequena. Prospectar novos clientes e reativar inativos.',
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
