import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FileText, Download } from "lucide-react";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num);
}

export default function Executivo() {
  const { data: kpis } = trpc.dashboard.kpis.useQuery();
  const { data: topClientes } = trpc.dashboard.topClientes.useQuery({ limit: 5 });
  const { data: topProdutos } = trpc.dashboard.topProdutos.useQuery({ limit: 5 });

  const ticketMedio = kpis?.valorTotal && kpis?.totalVendas ? kpis.valorTotal / kpis.totalVendas : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatório Executivo
              </CardTitle>
              <CardDescription>Resumo gerencial do período</CardDescription>
            </div>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* KPIs Principais */}
          <div>
            <h3 className="font-semibold mb-3">Indicadores Principais</h3>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total de Vendas</p>
                <p className="text-2xl font-bold">{formatNumber(kpis?.totalVendas || 0)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Faturamento</p>
                <p className="text-2xl font-bold">{formatCurrency(kpis?.valorTotal || 0)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(ticketMedio)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Clientes Únicos</p>
                <p className="text-2xl font-bold">{formatNumber(kpis?.clientesUnicos || 0)}</p>
              </div>
            </div>
          </div>

          {/* Top 5 */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-3">Top 5 Clientes</h3>
              <div className="space-y-2">
                {topClientes?.map((cliente, index) => (
                  <div key={cliente.codigoCliente} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm">{index + 1}. {cliente.nomeCliente}</span>
                    <span className="text-sm font-medium">{formatCurrency(cliente.valorTotal)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Top 5 Produtos</h3>
              <div className="space-y-2">
                {topProdutos?.map((produto, index) => (
                  <div key={produto.codigoProduto} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm">{index + 1}. {produto.nomeProduto}</span>
                    <span className="text-sm font-medium">{formatNumber(produto.quantidadeTotal)} un</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
