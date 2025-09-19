"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PenTool,
  Upload,
  FileText,
  Users,
  UserCheck,
  Building,
  X,
  Send,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useRelatoriosIA } from "@/hooks/use-relatorios-ia";
import { useN8NConfig } from "@/hooks/use-n8n-config";
import { useAuth } from "@/contexts/auth-context";

interface DocumentoCategoria {
  compradores: File[];
  vendedores: File[];
  matricula: File[];
}

interface MinutaDocumentoFormProps {
  onProcessComplete: (result: any) => void;
}

const MinutaDocumentoForm: React.FC<MinutaDocumentoFormProps> = ({
  onProcessComplete,
}) => {
  const { user } = useAuth();
  const { createRelatorio, uploadFile, callN8NWebhook } = useRelatoriosIA();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentoCategoria>({
    compradores: [],
    vendedores: [],
    matricula: [],
  });

  const handleFileUpload = (
    categoria: keyof DocumentoCategoria,
    files: FileList | null
  ) => {
    if (!files) return;

    const novosArquivos = Array.from(files);
    setDocumentos((prev) => ({
      ...prev,
      [categoria]: [...prev[categoria], ...novosArquivos],
    }));

    toast.success(
      `${novosArquivos.length} arquivo(s) adicionado(s) em ${getCategoriaLabel(
        categoria
      )}`
    );
  };

  const removeFile = (categoria: keyof DocumentoCategoria, index: number) => {
    setDocumentos((prev) => ({
      ...prev,
      [categoria]: prev[categoria].filter((_, i) => i !== index),
    }));
    toast.info("Arquivo removido");
  };

  const getCategoriaLabel = (categoria: keyof DocumentoCategoria) => {
    switch (categoria) {
      case "compradores":
        return "Documentos dos Compradores";
      case "vendedores":
        return "Documentos dos Vendedores";
      case "matricula":
        return "Matrícula do Imóvel";
      default:
        return categoria;
    }
  };

  const getCategoriaIcon = (categoria: keyof DocumentoCategoria) => {
    switch (categoria) {
      case "compradores":
        return <UserCheck className="h-5 w-5" />;
      case "vendedores":
        return <Users className="h-5 w-5" />;
      case "matricula":
        return <Building className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoriaColor = (categoria: keyof DocumentoCategoria) => {
    switch (categoria) {
      case "compradores":
        return "bg-green-500";
      case "vendedores":
        return "bg-blue-500";
      case "matricula":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTotalArquivos = () => {
    return (
      documentos.compradores.length +
      documentos.vendedores.length +
      documentos.matricula.length
    );
  };

  const processarMinuta = async () => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    if (getTotalArquivos() === 0) {
      toast.error("Adicione pelo menos um documento para processar");
      return;
    }

    setIsProcessing(true);

    try {
      toast.loading("Processando documentos para gerar minuta...", {
        id: "process-minuta",
      });

      // Upload de todos os arquivos
      const arquivosUrls: string[] = [];
      const todosArquivos = [
        ...documentos.compradores,
        ...documentos.vendedores,
        ...documentos.matricula,
      ];

      for (const arquivo of todosArquivos) {
        const url = await uploadFile(arquivo);
        arquivosUrls.push(url);
      }

      // Verificar se o usuário tem cartório associado
      if (!user.user_metadata?.cartorio_id) {
        toast.error(
          "Usuário não possui cartório associado. Entre em contato com o administrador."
        );
        return;
      }

      // Verificar se o webhook N8N está configurado ANTES de criar o relatório
      const { config: n8nConfig } = useN8NConfig();
      if (!n8nConfig?.webhook_url) {
        toast.error(
          <div className="space-y-3 p-2">
            <div className="font-bold text-red-800 text-lg">
              ⚠️ Webhook N8N não configurado
            </div>
            <div className="text-red-700">
              Para gerar minutas de documentos, você precisa configurar a URL do
              webhook N8N primeiro.
            </div>
            <div className="pt-2">
              <a
                href="/configuracoes"
                className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/configuracoes";
                }}
              >
                🔧 Configurar Webhook N8N
              </a>
            </div>
          </div>,
          {
            duration: 10000,
            style: {
              border: "2px solid #dc2626",
              backgroundColor: "#fef2f2",
            },
          }
        );
        return;
      }

      // Criar relatório no banco APENAS se o webhook estiver configurado
      const relatorio = await createRelatorio({
        tipo: "minuta_documento",
        nome_arquivo: `minuta_compra_venda_${Date.now()}.pdf`,
        arquivo_resultado: arquivosUrls.join(","), // URLs separadas por vírgula
        usuario_id: user.id,
        cartorio_id: user.user_metadata.cartorio_id,
        dados_processamento: {
          tipoDocumento: "Escritura de Compra e Venda",
          compradores: documentos.compradores.map((f) => f.name),
          vendedores: documentos.vendedores.map((f) => f.name),
          matricula: documentos.matricula.map((f) => f.name),
          totalDocumentosProcessados: getTotalArquivos(),
          observacoes: "Minuta gerada com base nos documentos fornecidos",
        },
      });

      // Chamar webhook N8N
      await callN8NWebhook({
        relatorio_id: relatorio.id,
        tipo: "minuta_documento",
        arquivos_urls: arquivosUrls,
        webhook_callback: `${window.location.origin}/api/ia/webhook`,
        documentos: {
          compradores: documentos.compradores.map((f) => f.name),
          vendedores: documentos.vendedores.map((f) => f.name),
          matricula: documentos.matricula.map((f) => f.name),
        },
      });

      toast.success("Documentos enviados para análise com sucesso!", {
        id: "process-minuta",
      });
      onProcessComplete(relatorio);

      // Limpar formulário
      setDocumentos({
        compradores: [],
        vendedores: [],
        matricula: [],
      });
      setShowDialog(false);
    } catch (error) {
      console.error("Erro ao processar minuta:", error);
      toast.error("Erro ao processar documentos", { id: "process-minuta" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-500">
            <PenTool className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Gerar Minuta de Documento</CardTitle>
          </div>
        </div>
        <CardDescription>
          Cria minutas baseadas em documentos dos compradores, vendedores e
          matrícula do imóvel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="w-full" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar Documentos
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerar Minuta de Documento</DialogTitle>
              <DialogDescription>
                Envie os documentos necessários para gerar a minuta
                automaticamente
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Upload por Categoria */}
              {(Object.keys(documentos) as Array<keyof DocumentoCategoria>).map(
                (categoria) => (
                  <Card key={categoria}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div
                          className={`p-1.5 rounded ${getCategoriaColor(
                            categoria
                          )}`}
                        >
                          {getCategoriaIcon(categoria)}
                          <span className="sr-only">
                            {getCategoriaLabel(categoria)}
                          </span>
                        </div>
                        {getCategoriaLabel(categoria)}
                        <Badge variant="outline" className="ml-auto">
                          {documentos[categoria].length} arquivo(s)
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Upload Input */}
                      <div>
                        <Label
                          htmlFor={`upload-${categoria}`}
                          className="sr-only"
                        >
                          Upload {getCategoriaLabel(categoria)}
                        </Label>
                        <Input
                          id={`upload-${categoria}`}
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) =>
                            handleFileUpload(categoria, e.target.files)
                          }
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Formatos aceitos: PDF, DOC, DOCX, JPG, PNG (múltiplos
                          arquivos)
                        </p>
                      </div>

                      {/* Lista de Arquivos */}
                      {documentos[categoria].length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Arquivos selecionados:
                          </Label>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {documentos[categoria].map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-gray-500" />
                                  <span className="truncate max-w-xs">
                                    {file.name}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(categoria, index)}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              )}

              {/* Resumo e Ação */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Resumo dos Documentos</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Total de {getTotalArquivos()} arquivo(s) selecionado(s)
                      </p>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span>
                          Compradores: {documentos.compradores.length}
                        </span>
                        <span>Vendedores: {documentos.vendedores.length}</span>
                        <span>Matrícula: {documentos.matricula.length}</span>
                      </div>
                    </div>
                    <Button
                      onClick={processarMinuta}
                      disabled={isProcessing || getTotalArquivos() === 0}
                      className="ml-4"
                    >
                      {isProcessing ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Gerar Minuta
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Instruções */}
              <Card className="bg-gray-50">
                <CardContent className="pt-6">
                  <h4 className="font-medium mb-2">Instruções:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>
                      • <strong>Compradores:</strong> RG, CPF, comprovante de
                      renda, estado civil
                    </li>
                    <li>
                      • <strong>Vendedores:</strong> RG, CPF, certidão de
                      casamento (se casado)
                    </li>
                    <li>
                      • <strong>Matrícula:</strong> Matrícula atualizada do
                      imóvel do cartório de registro
                    </li>
                    <li>
                      • Todos os documentos devem estar legíveis e em boa
                      qualidade
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default MinutaDocumentoForm;
