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
