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
import { supabase } from "@/lib/supabase";

interface DocumentoCategoria {
  compradores: File[];
  vendedores: File[];
  matricula: File[];
  outros: File[];
}

interface MinutaDocumentoFormProps {
  onProcessComplete: (result: any) => void;
}

const MinutaDocumentoForm: React.FC<MinutaDocumentoFormProps> = ({
  onProcessComplete,
}) => {
  const { user } = useAuth();
  const {
    createRelatorio,
    uploadFile,
    callN8NWebhook,
    processarMinutaDocumento,
  } = useRelatoriosIA();
  const { getWebhookUrl } = useN8NConfig();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentoCategoria>({
    compradores: [],
    vendedores: [],
    matricula: [],
    outros: [],
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
      case "outros":
        return "Outros Documentos";
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
      case "outros":
        return <FileText className="h-5 w-5" />;
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
      case "outros":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTotalArquivos = () => {
    return (
      documentos.compradores.length +
      documentos.vendedores.length +
      documentos.matricula.length +
      documentos.outros.length
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

      // Buscar cartório do usuário (igual às outras análises)
      console.log("Buscando cartório do usuário...");
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("cartorio_id")
        .eq("id", user.id)
        .single();

      console.log("Dados do usuário:", userData);

      if (userError) {
        console.error("Erro ao buscar dados do usuário:", userError);
        toast.error("Erro ao buscar dados do usuário", { id: "process-minuta" });
        return;
      }

      // Verificar se o usuário tem cartório associado
      if (!userData?.cartorio_id) {
        toast.error(
          "Usuário não possui cartório associado. Entre em contato com o administrador.",
          { id: "process-minuta" }
        );
        return;
      }

      // Preparar todos os arquivos
      const todosArquivos = [
        ...documentos.compradores,
        ...documentos.vendedores,
        ...documentos.matricula,
        ...documentos.outros,
      ];

      console.log("Processando minuta de documento...", {
        totalArquivos: todosArquivos.length,
        compradores: documentos.compradores.length,
        vendedores: documentos.vendedores.length,
        matricula: documentos.matricula.length,
        outros: documentos.outros.length,
      });

      // Usar função específica para minuta de documento
      const webhookUrl = getWebhookUrl("minuta_documento");
      
      if (!webhookUrl) {
        toast.error(
          "Webhook para minuta de documento não configurado. Configure na página de Configurações.",
          { id: "process-minuta" }
        );
        return;
      }

      console.log("Webhook URL obtido:", webhookUrl);

      const relatorio = await processarMinutaDocumento(
        todosArquivos,
        user.id,
        userData.cartorio_id,
        {
          compradores: documentos.compradores.map((f) => f.name),
          vendedores: documentos.vendedores.map((f) => f.name),
          matricula: documentos.matricula.map((f) => f.name),
          outros: documentos.outros.map((f) => f.name),
        },
        webhookUrl
      );

      console.log("Minuta processada com sucesso:", relatorio);

      toast.success("Documentos enviados para análise com sucesso!", {
        id: "process-minuta",
      });
      onProcessComplete(relatorio);

      // Limpar formulário
      setDocumentos({
        compradores: [],
        vendedores: [],
        matricula: [],
        outros: [],
      });
      setShowDialog(false);
    } catch (error) {
      console.error("Erro ao processar minuta:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      // Tratamento específico para erro de webhook não configurado
      if (errorMessage.includes("Webhook para") || errorMessage.includes("não configurado")) {
        toast.error(
          <div className="space-y-3 p-2">
            <div className="font-bold text-red-800 text-lg">
              ⚠️ Webhook não configurado
            </div>
            <div className="text-red-700">{errorMessage}</div>
            <div className="pt-2">
              <p className="text-sm text-gray-600">
                Execute o script SQL fornecido para configurar os webhooks ou configure manualmente na página de Configurações.
              </p>
            </div>
          </div>,
          {
            id: "process-minuta",
            duration: 10000,
            style: {
              border: "2px solid #dc2626",
              backgroundColor: "#fef2f2",
            },
          }
        );
      } else if (errorMessage.includes("404") || errorMessage.includes("não encontrado")) {
        // Tratamento específico para erro 404 (webhook não encontrado)
        toast.error(
          <div className="space-y-3 p-2">
            <div className="font-bold text-red-800 text-lg">
              ⚠️ Webhook não encontrado (404)
            </div>
            <div className="text-red-700">{errorMessage}</div>
            <div className="pt-2">
              <p className="text-sm text-gray-600">
                O webhook configurado não está disponível. Verifique:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside mt-1 space-y-1">
                <li>Se a URL está correta</li>
                <li>Se o webhook está ativo no N8N</li>
                <li>Se o serviço N8N está funcionando</li>
              </ul>
            </div>
          </div>,
          {
            id: "process-minuta",
            duration: 15000,
            style: {
              border: "2px solid #dc2626",
              backgroundColor: "#fef2f2",
            },
          }
        );
      } else if (errorMessage.includes("500") || errorMessage.includes("Erro interno no webhook")) {
        // Tratamento específico para erro 500 (problema no workflow N8N)
        toast.error(
          <div className="space-y-3 p-2">
            <div className="font-bold text-red-800 text-lg">
              ⚠️ Erro no Workflow N8N (500)
            </div>
            <div className="text-red-700">{errorMessage}</div>
            <div className="pt-2">
              <p className="text-sm text-gray-600 font-medium mb-2">
                O workflow no N8N não pode ser iniciado. Verifique a configuração:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside mt-1 space-y-1">
                <li>O parâmetro "Respond" do webhook deve estar configurado como "Using Respond to Webhook Node"</li>
                <li>OU o workflow deve conter um nó "Respond to Webhook"</li>
                <li>Verifique se o workflow está ativo/publicado no N8N</li>
                <li>Verifique os logs do N8N para mais detalhes do erro</li>
              </ul>
            </div>
          </div>,
          {
            id: "process-minuta",
            duration: 20000,
            style: {
              border: "2px solid #dc2626",
              backgroundColor: "#fef2f2",
            },
          }
        );
      } else {
        toast.error(
          <div className="space-y-2 p-2">
            <div className="font-bold text-red-800">Erro ao processar documentos</div>
            <div className="text-red-700 text-sm">{errorMessage}</div>
          </div>,
          {
            id: "process-minuta",
            duration: 8000,
          }
        );
      }
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
          Cria automaticamente minutas de escritura de compra e venda utilizando
          inteligência artificial, analisando documentos e gerando texto
          jurídico personalizado
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
                        <span>Outros: {documentos.outros.length}</span>
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
                  <h4 className="font-medium mb-3">
                    📋 Documentos Necessários:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm text-gray-800">
                        📄 Documentos Obrigatórios:
                      </h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>
                          • <strong>IDENTIFICAÇÃO:</strong> RG, CPF ou CNH
                        </li>
                        <li>
                          • <strong>CERTIDÃO:</strong> Casamento / Nascimento
                        </li>
                        <li>
                          • <strong>COMPROVANTE:</strong> De endereço
                        </li>
                        <li>
                          • <strong>MATRÍCULA:</strong> Do imóvel
                        </li>
                        <li>
                          • <strong>CERTIDÃO ÔNUS:</strong> De ações reais e
                          pessoais reipersecutórias
                        </li>
                        <li>
                          • <strong>GUIA DE ITBI:</strong> Para transferência
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm text-gray-800">
                        📎 Documentos Adicionais:
                      </h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>
                          • <strong>OUTROS:</strong> Qualquer documento
                          adicional necessário
                        </li>
                        <li>• Todos os documentos devem estar legíveis</li>
                        <li>• Formatos aceitos: PDF, DOC, DOCX, JPG, PNG</li>
                        <li>• Máximo de 10MB por arquivo</li>
                      </ul>
                    </div>
                  </div>
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
