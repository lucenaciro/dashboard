import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Upload() {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, tipo: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      // Simular upload (aqui você implementaria o upload real via tRPC)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setUploadedFiles(prev => [...prev, `${tipo}: ${file.name}`]);
      toast.success(`Arquivo ${file.name} enviado com sucesso!`);
    } catch (error) {
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const tiposArquivo = [
    {
      tipo: "clientes",
      titulo: "Cadastro de Clientes",
      descricao: "Arquivo CSV/Excel com dados dos clientes",
      colunas: "CODIGO, NOME, TIPO, CIDADE, ESTADO, TELEFONE, EMAIL, VENDEDOR",
    },
    {
      tipo: "vendedores",
      titulo: "Cadastro de Vendedores",
      descricao: "Arquivo CSV/Excel com dados dos vendedores",
      colunas: "CODIGO, NOME, EMAIL, TELEFONE, ATIVO",
    },
    {
      tipo: "produtos",
      titulo: "Cadastro de Produtos",
      descricao: "Arquivo CSV/Excel com dados dos produtos",
      colunas: "CODIGO, DESCRICAO, CATEGORIA, UNIDADE, ATIVO",
    },
    {
      tipo: "movimentacoes",
      titulo: "Movimentações/Vendas",
      descricao: "Arquivo CSV/Excel com histórico de vendas",
      colunas: "DATA, CODIGO_CLIENTE, NOME_CLIENTE, CODIGO_PRODUTO, NOME_PRODUTO, QUANTIDADE, VALOR_UNITARIO, VALOR_TOTAL, VENDEDOR",
    },
    {
      tipo: "estoque",
      titulo: "Estoque Atual",
      descricao: "Arquivo CSV/Excel com dados de estoque",
      colunas: "CODIGO_PRODUTO, NOME_PRODUTO, QUANTIDADE, DATA_ESTOQUE",
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Upload de Arquivos</h1>
          <p className="text-muted-foreground mt-2">
            Envie os arquivos CSV ou Excel para atualizar os dados do dashboard
          </p>
        </div>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>Instruções</CardTitle>
            <CardDescription>Como preparar e enviar seus arquivos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold">✅ Formatos Aceitos</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Arquivos CSV (.csv)</li>
                  <li>• Planilhas Excel (.xlsx, .xls)</li>
                  <li>• Codificação UTF-8 recomendada</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">📋 Importante</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Primeira linha deve conter os cabeçalhos</li>
                  <li>• Colunas obrigatórias devem estar presentes</li>
                  <li>• Dados serão adicionados/atualizados automaticamente</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {tiposArquivo.map((item) => (
            <Card key={item.tipo}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileSpreadsheet className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.titulo}</CardTitle>
                      <CardDescription>{item.descricao}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs font-medium mb-1">Colunas esperadas:</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.colunas}</p>
                </div>

                <div className="relative">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, item.tipo)}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    id={`upload-${item.tipo}`}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={uploading}
                    asChild
                  >
                    <label htmlFor={`upload-${item.tipo}`} className="cursor-pointer">
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <UploadIcon className="h-4 w-4 mr-2" />
                          Selecionar Arquivo
                        </>
                      )}
                    </label>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Histórico de Uploads */}
        {uploadedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Arquivos Enviados Recentemente</CardTitle>
              <CardDescription>Últimos uploads realizados nesta sessão</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">{file}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Avisos */}
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <CardHeader>
            <CardTitle className="text-orange-900 dark:text-orange-200">⚠️ Atenção</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-orange-800 dark:text-orange-300 space-y-2">
              <li>• Os dados serão processados automaticamente após o upload</li>
              <li>• Registros duplicados (mesmo código) serão atualizados com as novas informações</li>
              <li>• Recomendamos fazer backup dos dados antes de enviar novos arquivos</li>
              <li>• O processamento pode levar alguns minutos dependendo do tamanho do arquivo</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
