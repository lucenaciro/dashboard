import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload as UploadIcon, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Upload() {
  const [message, setMessage] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setMessage(`${files.length} arquivo(s) selecionado(s): ${Array.from(files).map(f => f.name).join(", ")}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Upload de Arquivos</h1>
            <p className="text-muted-foreground">Envie seus arquivos CSV ou Excel</p>
          </div>
        </div>

        {/* Upload Area */}
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <UploadIcon className="w-12 h-12 text-primary" />
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Selecione os arquivos</h2>
              <p className="text-sm text-muted-foreground">
                Arraste e solte ou clique para selecionar
              </p>
            </div>

            <input
              type="file"
              multiple
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            
            <label htmlFor="file-upload">
              <Button size="lg" asChild>
                <span>Escolher Arquivos</span>
              </Button>
            </label>

            {message && (
              <div className="text-sm text-center p-4 bg-muted rounded-lg max-w-md">
                {message}
              </div>
            )}

            <div className="text-xs text-muted-foreground text-center max-w-md">
              <p>Formatos aceitos: CSV, Excel (.xlsx, .xls)</p>
              <p className="mt-2">
                <strong>Arquivos esperados:</strong> CADASTRO_CLIENTES.csv, CADASTRO_VENDEDORES.csv, 
                MOVIMENTO_DISTRIBUIDOR.csv, RELACAO_PRODUTOS.csv, ESTOQUE.csv
              </p>
            </div>
          </div>
        </Card>

        {/* Instruções */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Instruções:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Prepare seus arquivos CSV ou Excel com os dados atualizados</li>
            <li>Certifique-se de que os arquivos seguem o formato esperado</li>
            <li>Clique em "Escolher Arquivos" e selecione todos os arquivos de uma vez</li>
            <li>Aguarde o processamento (isso pode levar alguns minutos)</li>
            <li>Você será redirecionado automaticamente para o dashboard</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
