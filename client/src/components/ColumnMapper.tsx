import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ArrowRight, Check } from 'lucide-react';

interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
}

interface ColumnMapperProps {
  sourceColumns: string[];
  targetColumns: { name: string; label: string; required: boolean }[];
  onMappingComplete: (mapping: Record<string, string>) => void;
  tipoArquivo: string;
}

export default function ColumnMapper({
  sourceColumns,
  targetColumns,
  onMappingComplete,
  tipoArquivo,
}: ColumnMapperProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});

  const handleMapping = (sourceCol: string, targetCol: string) => {
    setMappings(prev => ({
      ...prev,
      [sourceCol]: targetCol,
    }));
  };

  const autoMap = () => {
    const newMappings: Record<string, string> = {};
    
    sourceColumns.forEach(sourceCol => {
      const normalized = sourceCol.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const match = targetColumns.find(targetCol => {
        const targetNormalized = targetCol.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalized.includes(targetNormalized) || targetNormalized.includes(normalized);
      });

      if (match) {
        newMappings[sourceCol] = match.name;
      }
    });

    setMappings(newMappings);
  };

  const isValid = () => {
    const requiredCols = targetColumns.filter(col => col.required);
    return requiredCols.every(col => 
      Object.values(mappings).includes(col.name)
    );
  };

  const handleConfirm = () => {
    if (isValid()) {
      onMappingComplete(mappings);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">Mapeamento de Colunas</h3>
          <p className="text-sm text-muted-foreground">
            Tipo: {tipoArquivo}
          </p>
        </div>
        <Button onClick={autoMap} variant="outline" size="sm">
          Auto-mapear
        </Button>
      </div>

      <div className="space-y-3 mb-6">
        {sourceColumns.map(sourceCol => (
          <div key={sourceCol} className="flex items-center gap-4">
            <div className="flex-1 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{sourceCol}</p>
              <p className="text-xs text-muted-foreground">Coluna do arquivo</p>
            </div>

            <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />

            <div className="flex-1">
              <Select
                value={mappings[sourceCol] || ''}
                onValueChange={(value) => handleMapping(sourceCol, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Não mapear</SelectItem>
                  {targetColumns.map(targetCol => (
                    <SelectItem key={targetCol.name} value={targetCol.name}>
                      {targetCol.label}
                      {targetCol.required && <span className="text-red-500 ml-1">*</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-4">
        <h4 className="font-semibold text-sm mb-2">Campos obrigatórios:</h4>
        <div className="flex flex-wrap gap-2 mb-4">
          {targetColumns.filter(col => col.required).map(col => {
            const isMapped = Object.values(mappings).includes(col.name);
            return (
              <div
                key={col.name}
                className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                  isMapped
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {isMapped && <Check className="w-3 h-3" />}
                {col.label}
              </div>
            );
          })}
        </div>

        <Button
          onClick={handleConfirm}
          disabled={!isValid()}
          className="w-full"
        >
          Confirmar Mapeamento
        </Button>
      </div>
    </Card>
  );
}
