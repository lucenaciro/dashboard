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
