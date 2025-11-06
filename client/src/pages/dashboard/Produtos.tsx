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
