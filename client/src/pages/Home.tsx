import { useState } from "react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, Package, Warehouse, TrendingUp, FileText, Target, Award, Activity } from "lucide-react";
import { trpc } from "@/lib/trpc";
import VisaoGeral from "./dashboard/VisaoGeral";
import Clientes from "./dashboard/Clientes";
import Vendedores from "./dashboard/Vendedores";
import Produtos from "./dashboard/Produtos";
import Estoque from "./dashboard/Estoque";
import Positivacao from "./dashboard/Positivacao";
import Graficos from "./dashboard/Graficos";
import Acoes from "./dashboard/Acoes";
import Ranking from "./dashboard/Ranking";
import Executivo from "./dashboard/Executivo";

export default function Home() {
  const [activeTab, setActiveTab] = useState("visao-geral");
  const { data: periodo } = trpc.periodo.obter.useQuery();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard Analítico</h1>
              <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Palácio das Baterias - Análise Completa de Vendas</p>
          <Link href="/upload">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
              📄 Upload de Arquivos
            </button>
          </Link>
        </div>          </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="font-semibold">
                  {periodo?.inicio && periodo?.fim
                    ? `${new Date(periodo.inicio).toLocaleDateString('pt-BR')} - ${new Date(periodo.fim).toLocaleDateString('pt-BR')}`
                    : periodo?.ano || new Date().getFullYear()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-10 mb-8">
            <TabsTrigger value="visao-geral" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden lg:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="clientes" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden lg:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="vendedores" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden lg:inline">Vendedores</span>
            </TabsTrigger>
            <TabsTrigger value="produtos" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden lg:inline">Produtos</span>
            </TabsTrigger>
            <TabsTrigger value="estoque" className="flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              <span className="hidden lg:inline">Estoque</span>
            </TabsTrigger>
            <TabsTrigger value="positivacao" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden lg:inline">Positivação</span>
            </TabsTrigger>
            <TabsTrigger value="graficos" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden lg:inline">Gráficos</span>
            </TabsTrigger>
            <TabsTrigger value="acoes" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden lg:inline">Ações</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span className="hidden lg:inline">Ranking</span>
            </TabsTrigger>
            <TabsTrigger value="executivo" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden lg:inline">Executivo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral">
            <VisaoGeral />
          </TabsContent>

          <TabsContent value="clientes">
            <Clientes />
          </TabsContent>

          <TabsContent value="vendedores">
            <Vendedores />
          </TabsContent>

          <TabsContent value="produtos">
            <Produtos />
          </TabsContent>

          <TabsContent value="estoque">
            <Estoque />
          </TabsContent>

          <TabsContent value="positivacao">
            <Positivacao />
          </TabsContent>

          <TabsContent value="graficos">
            <Graficos />
          </TabsContent>

          <TabsContent value="acoes">
            <Acoes />
          </TabsContent>

          <TabsContent value="ranking">
            <Ranking />
          </TabsContent>

          <TabsContent value="executivo">
            <Executivo />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
