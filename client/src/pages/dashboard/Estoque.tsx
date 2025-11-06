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
