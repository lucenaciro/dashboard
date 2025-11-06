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
