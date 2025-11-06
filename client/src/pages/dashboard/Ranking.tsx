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
