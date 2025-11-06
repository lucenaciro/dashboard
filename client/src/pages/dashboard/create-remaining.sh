#!/bin/bash

# Estoque
cat > Estoque.tsx << 'EOF'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse } from "lucide-react";

export default function Estoque() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Gestão de Estoque
          </CardTitle>
          <CardDescription>Disponibilidade e movimentação</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Análise de estoque em desenvolvimento...</p>
        </CardContent>
      </Card>
    </div>
  );
}
EOF

# Graficos
cat > Graficos.tsx << 'EOF'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart3 } from "lucide-react";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export default function Graficos() {
  const { data: evolucao } = trpc.dashboard.evolucaoMensal.useQuery({ meses: 12 });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Evolução Mensal de Vendas
          </CardTitle>
          <CardDescription>Últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {evolucao?.map((mes) => (
              <div key={mes.mes} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <p className="font-medium">{mes.mes}</p>
                  <p className="text-xs text-muted-foreground">{mes.totalVendas} vendas</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(mes.valorTotal)}</p>
                  <p className="text-xs text-muted-foreground">Ticket: {formatCurrency(mes.ticketMedio)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
EOF

# Acoes
cat > Acoes.tsx << 'EOF'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

export default function Acoes() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Plano de Ações Comerciais
          </CardTitle>
          <CardDescription>Ações sugeridas e acompanhamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="font-semibold text-red-900 dark:text-red-200">🚨 Clientes Inativos</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Contatar clientes sem compras há mais de 90 dias
              </p>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="font-semibold text-yellow-900 dark:text-yellow-200">⚠️ Vendedores Abaixo da Média</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Agendar treinamento e acompanhamento
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="font-semibold text-blue-900 dark:text-blue-200">📈 Oportunidades de Upsell</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Oferecer produtos complementares aos top clientes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
EOF

# Ranking
cat > Ranking.tsx << 'EOF'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Award } from "lucide-react";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num);
}

export default function Ranking() {
  const { data: topClientes } = trpc.dashboard.topClientes.useQuery({ limit: 20 });
  const { data: vendedores } = trpc.vendedores.list.useQuery();

  const topVendedores = vendedores ? [...vendedores].sort((a, b) => b.valorTotal - a.valorTotal).slice(0, 10) : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top 20 Clientes
            </CardTitle>
            <CardDescription>Ranking por faturamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topClientes?.map((cliente, index) => (
                <div key={cliente.codigoCliente} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                      index < 3 ? 'bg-yellow-500 text-white' : 'bg-primary/10 text-primary'
                    }`}>
                      {index + 1}
                    </div>
                    <p className="font-medium text-sm">{cliente.nomeCliente}</p>
                  </div>
                  <p className="font-semibold text-sm">{formatCurrency(cliente.valorTotal)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top 10 Vendedores
            </CardTitle>
            <CardDescription>Ranking por faturamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topVendedores.map((vendedor, index) => (
                <div key={vendedor.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                      index < 3 ? 'bg-yellow-500 text-white' : 'bg-primary/10 text-primary'
                    }`}>
                      {index + 1}
                    </div>
                    <p className="font-medium text-sm">{vendedor.nome}</p>
                  </div>
                  <p className="font-semibold text-sm">{formatCurrency(vendedor.valorTotal)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
EOF

# Executivo
cat > Executivo.tsx << 'EOF'
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
EOF

echo "Todos os componentes criados!"
