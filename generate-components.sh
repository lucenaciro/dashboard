#!/bin/bash
cd /home/ubuntu/dashboard-palacio-baterias/client/src/pages/dashboard

# Vendedores component já foi criado, vamos criar os outros

# Produtos
cat > Produtos.tsx << 'EOCOMP'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Package } from "lucide-react";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num);
}

export default function Produtos() {
  const { data: topProdutos } = trpc.dashboard.topProdutos.useQuery({ limit: 20 });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Top 20 Produtos Mais Vendidos
          </CardTitle>
          <CardDescription>Ranking por quantidade vendida</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topProdutos?.map((produto, index) => (
              <div key={produto.codigoProduto} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{produto.nomeProduto}</p>
                    <p className="text-xs text-muted-foreground">Cód: {produto.codigoProduto}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatNumber(produto.quantidadeTotal)} unidades</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(produto.valorTotal)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
EOCOMP

# Positivacao
cat > Positivacao.tsx << 'EOCOMP'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { TrendingUp } from "lucide-react";

function formatNumber(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num);
}

export default function Positivacao() {
  const { data: positivacao } = trpc.dashboard.positivacao.useQuery();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Análise de Positivação
          </CardTitle>
          <CardDescription>Clientes ativos por período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm font-medium text-green-900 dark:text-green-200">Últimos 30 dias</p>
              <p className="text-4xl font-bold text-green-600 mt-2">{formatNumber(positivacao?.clientes30 || 0)}</p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">Clientes ativos</p>
            </div>
            <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">30-60 dias</p>
              <p className="text-4xl font-bold text-yellow-600 mt-2">{formatNumber(positivacao?.clientes60 || 0)}</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">Clientes moderados</p>
            </div>
            <div className="p-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-200">60-90 dias</p>
              <p className="text-4xl font-bold text-orange-600 mt-2">{formatNumber(positivacao?.clientes90 || 0)}</p>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">Clientes em risco</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
EOCOMP

echo "Componentes criados com sucesso!"
