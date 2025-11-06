import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num);
}

export default function VisaoGeral() {
  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery();
  const { data: topClientes, isLoading: clientesLoading } = trpc.dashboard.topClientes.useQuery({ limit: 10 });
  const { data: topProdutos, isLoading: produtosLoading } = trpc.dashboard.topProdutos.useQuery({ limit: 10 });
  const { data: evolucao, isLoading: evolucaoLoading } = trpc.dashboard.evolucaoMensal.useQuery({ meses: 12 });
  const { data: positivacao, isLoading: positivacaoLoading } = trpc.dashboard.positivacao.useQuery();

  const ticketMedio = kpis?.valorTotal && kpis?.totalVendas 
    ? kpis.valorTotal / kpis.totalVendas 
    : 0;

  return (
    <div className="space-y-8">
      {/* KPIs Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpisLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatNumber(kpis?.totalVendas || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Transações realizadas
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpisLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(kpis?.valorTotal || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Faturamento total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpisLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(ticketMedio)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Valor médio por venda
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Únicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpisLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatNumber(kpis?.clientesUnicos || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Clientes com compras
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Análise de Positivação */}
      {positivacao && (
        <Card>
          <CardHeader>
            <CardTitle>Análise de Positivação</CardTitle>
            <CardDescription>Clientes ativos por período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Últimos 30 dias</p>
                <p className="text-3xl font-bold text-green-600">{formatNumber(positivacao.clientes30 || 0)}</p>
                <p className="text-xs text-muted-foreground">Clientes ativos</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">30-60 dias</p>
                <p className="text-3xl font-bold text-yellow-600">{formatNumber(positivacao.clientes60 || 0)}</p>
                <p className="text-xs text-muted-foreground">Clientes moderados</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">60-90 dias</p>
                <p className="text-3xl font-bold text-orange-600">{formatNumber(positivacao.clientes90 || 0)}</p>
                <p className="text-xs text-muted-foreground">Clientes em risco</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 10 Clientes e Produtos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Clientes</CardTitle>
            <CardDescription>Maiores compradores por valor</CardDescription>
          </CardHeader>
          <CardContent>
            {clientesLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {topClientes?.map((cliente, index) => (
                  <div key={cliente.codigoCliente} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{cliente.nomeCliente}</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(cliente.totalVendas)} vendas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(cliente.valorTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Produtos</CardTitle>
            <CardDescription>Mais vendidos por quantidade</CardDescription>
          </CardHeader>
          <CardContent>
            {produtosLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {topProdutos?.map((produto, index) => (
                  <div key={produto.codigoProduto} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{produto.nomeProduto}</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(produto.quantidadeTotal)} unidades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(produto.valorTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
