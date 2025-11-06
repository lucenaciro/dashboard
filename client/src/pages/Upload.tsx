import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload as UploadIcon, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Upload() {
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const [processando, setProcessando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const processarMutation = trpc.upload.processar.useMutation({
    onSuccess: (data) => {
      setSucesso(true);
      setMessage(`✅ ${data.totalProcessado} registros processados com sucesso!`);
      setTimeout(() => setLocation("/"), 2000);
    },
    onError: (error) => {
      setProcessando(false);
      setMessage(`❌ Erro: ${error.message}`);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProcessando(true);
    setMessage(`Processando ${files.length} arquivo(s)...`);

    try {
      const arquivos = await Promise.all(
        Array.from(files).map(async (file) => {
          const buffer = await file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          return { nome: file.name, base64 };
        })
      );

      processarMutation.mutate({ arquivos });
    } catch (error) {
      setProcessando(false);
      setMessage(`❌ Erro ao ler arquivos: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon" disabled={processando}>
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
            {sucesso ? (
              <CheckCircle2 className="w-24 h-24 text-green-500" />
            ) : processando ? (
              <Loader2 className="w-24 h-24 text-primary animate-spin" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <UploadIcon className="w-12 h-12 text-primary" />
              </div>
            )}
            
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">
                {sucesso ? "Processamento Concluído!" : processando ? "Processando..." : "Selecione os arquivos"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {sucesso ? "Redirecionando para o dashboard..." : "Arraste e solte ou clique para selecionar"}
              </p>
            </div>

            {!processando && !sucesso && (
              <>
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
              </>
            )}

            {message && (
              <div className="text-sm text-center p-4 bg-muted rounded-lg max-w-md">
                {message}
              </div>
            )}

            {!processando && !sucesso && (
              <div className="text-xs text-muted-foreground text-center max-w-md">
                <p>Formatos aceitos: CSV, Excel (.xlsx, .xls)</p>
                <p className="mt-2">
                  <strong>Arquivos esperados:</strong> CADASTRO_CLIENTES.csv, CADASTRO_VENDEDORES.csv, 
                  MOVIMENTO_DISTRIBUIDOR.csv, RELACAO_PRODUTOS.csv, ESTOQUE.csv
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
