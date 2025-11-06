import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FiltrosPeriodoProps {
  dataInicio: Date | undefined;
  dataFim: Date | undefined;
  onDataInicioChange: (date: Date | undefined) => void;
  onDataFimChange: (date: Date | undefined) => void;
  onLimpar: () => void;
}

export default function FiltrosPeriodo({
  dataInicio,
  dataFim,
  onDataInicioChange,
  onDataFimChange,
  onLimpar
}: FiltrosPeriodoProps) {
  const presets = [
    { label: "Últimos 7 dias", dias: 7 },
    { label: "Últimos 30 dias", dias: 30 },
    { label: "Últimos 60 dias", dias: 60 },
    { label: "Últimos 90 dias", dias: 90 },
    { label: "Últimos 6 meses", dias: 180 },
    { label: "Último ano", dias: 365 },
  ];

  const aplicarPreset = (dias: number) => {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - dias);
    onDataInicioChange(inicio);
    onDataFimChange(fim);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtro por Período</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Presets */}
        <div>
          <label className="text-sm font-medium mb-2 block">Períodos Rápidos</label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.dias}
                variant="outline"
                size="sm"
                onClick={() => aplicarPreset(preset.dias)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Seleção Manual */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium mb-2 block">Data Início</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataInicio ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dataInicio}
                  onSelect={onDataInicioChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Data Fim</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dataFim}
                  onSelect={onDataFimChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Botão Limpar */}
        {(dataInicio || dataFim) && (
          <Button variant="outline" onClick={onLimpar} className="w-full">
            <X className="h-4 w-4 mr-2" />
            Limpar Filtro de Período
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
